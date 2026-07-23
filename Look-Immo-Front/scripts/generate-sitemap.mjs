#!/usr/bin/env node
/**
 * Generates public/sitemap.xml before `vite build` runs, so it gets copied
 * verbatim into dist/ alongside robots.txt.
 *
 * Pulls real property and blog post ids/timestamps from the backend API so the
 * sitemap reflects actual listings instead of just the static routes.
 *
 * Env vars (all optional, sane defaults for local/dev):
 *   SITE_URL          Public site origin used to build absolute URLs.
 *                      Default: https://look-immo.tn
 *   SITEMAP_API_URL    Absolute backend API origin (NOT the frontend proxy path).
 *                      Default: http://localhost:5000/api
 *
 * Deliberately never throws / never fails the build: if the API is unreachable
 * (e.g. a CI build with no backend running), it logs a warning and writes a
 * sitemap containing just the static routes rather than breaking `npm run build`.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = (process.env.SITE_URL || 'https://look-immo.tn').replace(/\/$/, '');
const API_URL = (process.env.SITEMAP_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const OUT_PATH = path.resolve(__dirname, '../public/sitemap.xml');

const STATIC_ROUTES = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/listings', changefreq: 'daily', priority: '0.9' },
  { loc: '/blog', changefreq: 'weekly', priority: '0.6' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.4' },
];

/** Fetch JSON with a short timeout; returns null on any failure instead of throwing. */
async function fetchJsonSafe(url, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      console.warn(`[sitemap] ${url} responded ${res.status}, skipping.`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[sitemap] Failed to fetch ${url}: ${err.message}. Skipping this source.`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAllProperties() {
  const result = await fetchJsonSafe(`${API_URL}/properties?noLimit=true`);
  const list = result?.data ?? (Array.isArray(result) ? result : []);
  return list.map((p) => ({
    loc: `/property/${p.id}`,
    lastmod: p.updatedAt || p.createdAt || undefined,
    changefreq: 'weekly',
    priority: '0.8',
  }));
}

async function fetchAllBlogPosts() {
  const result = await fetchJsonSafe(`${API_URL}/blog`);
  const list = result?.data ?? (Array.isArray(result) ? result : []);
  return list
    .filter((p) => p.published !== false)
    .map((p) => ({
      loc: `/blog-post/${p.id}`,
      lastmod: p.updatedAt || p.createdAt || undefined,
      changefreq: 'monthly',
      priority: '0.5',
    }));
}

function toIsoDate(value) {
  if (!value) return undefined;
  const d = new Date(typeof value === 'number' ? value : value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().split('T')[0];
}

function buildXml(entries) {
  const urlEntries = entries
    .map((e) => {
      const lastmod = toIsoDate(e.lastmod);
      return [
        '  <url>',
        `    <loc>${SITE_URL}${e.loc}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;
}

async function main() {
  console.log(`[sitemap] Generating sitemap.xml for ${SITE_URL} using API ${API_URL} ...`);

  const [properties, blogPosts] = await Promise.all([
    fetchAllProperties(),
    fetchAllBlogPosts(),
  ]);

  if (properties.length === 0) {
    console.warn('[sitemap] No properties fetched — is the backend reachable at build time? '
      + 'Sitemap will still be written with static routes only.');
  }

  const entries = [...STATIC_ROUTES, ...properties, ...blogPosts];
  const xml = buildXml(entries);

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, xml, 'utf-8');

  console.log(`[sitemap] Wrote ${entries.length} URLs (${properties.length} properties, `
    + `${blogPosts.length} blog posts) to ${path.relative(process.cwd(), OUT_PATH)}`);
}

main().catch((err) => {
  // Never fail the build over the sitemap — log and move on.
  console.error('[sitemap] Unexpected error, continuing build without a fresh sitemap:', err);
});
