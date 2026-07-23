/**
 * Replaces the plain-nginx static serving of dist/ with a small Node server
 * that does exactly the same thing for real users (serve static files, fall
 * back to index.html for client-side routing) but ALSO recognizes known
 * social/search bot user agents on /property/:id and /blog-post/:id and
 * serves them a version of index.html with the real title, description,
 * OG/Twitter tags, and JSON-LD already injected — server-side, before any
 * JS runs. Bots that don't execute JS (which is most link-preview bots)
 * currently only ever see the generic site-wide defaults; this fixes that
 * without migrating the app to a full SSR framework.
 *
 * Regular users get byte-identical behavior to the current nginx setup —
 * this does not change the client app at all.
 */
import express from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isBotUserAgent,
  buildPropertyMeta,
  buildBlogPostMeta,
  defaultMeta,
  escapeHtml,
} from './seoMeta.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = process.env.DIST_DIR || path.resolve(__dirname, '../dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

const PORT = process.env.PORT || 8080;
const SITE_URL = (process.env.SITE_URL || 'https://look-immo.tn').replace(/\/$/, '');
// Backend API origin, reachable from wherever this server runs (may differ
// from the browser-facing VITE_API_URL, e.g. an internal service hostname).
const API_URL = (process.env.PRERENDER_API_URL || process.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const BACKEND_URL = (process.env.PRERENDER_BACKEND_URL || API_URL.replace(/\/api$/, ''));

let indexHtmlTemplate = null;
async function getIndexHtmlTemplate() {
  if (!indexHtmlTemplate) {
    indexHtmlTemplate = await readFile(INDEX_HTML_PATH, 'utf-8');
  }
  return indexHtmlTemplate;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Injects meta into the <head> of the static index.html template.
 * Only touches title + the tags we own; leaves everything else untouched. */
function injectMeta(html, meta, pathname) {
  const canonical = `${SITE_URL}${pathname}`;
  const image = meta.image || `${SITE_URL}/social-share-default.png`;
  const safeTitle = escapeHtml(meta.title);
  const safeDescription = escapeHtml(meta.description);

  let out = html
    .replace(/<title>.*?<\/title>/s, `<title>${safeTitle}</title>`)
    .replace(
      /<meta name="description" content=".*?">/s,
      `<meta name="description" content="${safeDescription}">`
    )
    .replace(/<meta property="og:title" content=".*?">/s, `<meta property="og:title" content="${safeTitle}">`)
    .replace(
      /<meta property="og:description" content=".*?">/s,
      `<meta property="og:description" content="${safeDescription}">`
    )
    .replace(/<meta property="og:url" content=".*?">/s, `<meta property="og:url" content="${canonical}">`)
    .replace(/<meta property="og:image" content=".*?">/s, `<meta property="og:image" content="${image}">`)
    .replace(/<meta name="twitter:title" content=".*?">/s, `<meta name="twitter:title" content="${safeTitle}">`)
    .replace(
      /<meta name="twitter:description" content=".*?">/s,
      `<meta name="twitter:description" content="${safeDescription}">`
    )
    .replace(/<meta name="twitter:image" content=".*?">/s, `<meta name="twitter:image" content="${image}">`);

  // meta.image only gets set for property/post-specific photos (see seoMeta.mjs),
  // whose real dimensions we don't know here. Strip the static template's
  // hardcoded 1200x630 hint in that case — a wrong hint is worse than none;
  // platforms fetch and probe the image themselves when it's omitted.
  if (meta.image) {
    out = out
      .replace(/\s*<meta property="og:image:width" content=".*?">\n?/s, '\n')
      .replace(/\s*<meta property="og:image:height" content=".*?">\n?/s, '\n');
  }

  // Canonical link (add if missing, since the static template doesn't ship one)
  if (/<link rel="canonical"/.test(out)) {
    out = out.replace(/<link rel="canonical" href=".*?">/s, `<link rel="canonical" href="${canonical}">`);
  } else {
    out = out.replace('</head>', `  <link rel="canonical" href="${canonical}">\n</head>`);
  }

  if (meta.jsonLd) {
    const jsonString = JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c');
    const jsonLdScript = `<script type="application/ld+json">${jsonString}</script>\n</head>`;
    out = out.replace('</head>', jsonLdScript);
  }

  return out;
}

async function resolveMetaForRequest(pathname) {
  const propertyMatch = pathname.match(/^\/property\/([^/]+)\/?$/);
  if (propertyMatch) {
    const property = await fetchJson(`${API_URL}/properties/${propertyMatch[1]}`);
    const meta = buildPropertyMeta(property, { siteUrl: SITE_URL, backendUrl: BACKEND_URL, pathname });
    if (meta) return meta;
  }

  const blogMatch = pathname.match(/^\/blog-post\/([^/]+)\/?$/);
  if (blogMatch) {
    const post = await fetchJson(`${API_URL}/blog/${blogMatch[1]}`);
    const meta = buildBlogPostMeta(post, { siteUrl: SITE_URL, backendUrl: BACKEND_URL, pathname });
    if (meta) return meta;
  }

  // Known route but nothing dynamic to inject — fall back to site defaults
  // (still worth serving so canonical/og:url are correct for the exact path).
  return { ...defaultMeta(), image: null };
}

const app = express();
app.disable('x-powered-by');

// Static assets (JS/CSS/images/fonts/robots.txt/sitemap.xml) — identical to
// what nginx was doing. index:false so "/" falls through to our own handler
// below instead of being served here unconditionally.
app.use(express.static(DIST_DIR, { index: false, maxAge: '1y', immutable: true }));

app.get('*', async (req, res, next) => {
  try {
    const userAgent = req.get('user-agent') || '';
    const template = await getIndexHtmlTemplate();

    if (!isBotUserAgent(userAgent)) {
      // Real users: exactly today's behavior — the client app owns SEO tags via useSEO.ts.
      res.set('Content-Type', 'text/html');
      res.send(template);
      return;
    }

    const meta = await resolveMetaForRequest(req.path);
    const html = injectMeta(template, meta, req.path);
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error('[prerender-server] Unhandled error:', err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`[prerender-server] Listening on :${PORT}`);
  console.log(`[prerender-server] Serving ${DIST_DIR}`);
  console.log(`[prerender-server] SITE_URL=${SITE_URL} API_URL=${API_URL}`);
});
