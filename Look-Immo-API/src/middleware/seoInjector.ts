import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import fs from 'fs';
import path from 'path';

// ─── Bot Detection ────────────────────────────────────────────────────────────
// Matches all major social crawlers, search engine bots, and link-preview agents.
// Includes: WhatsApp, Facebook, Instagram, Twitter/X, LinkedIn, Slack, Discord,
//           Telegram, Pinterest, Google, Bing, Yandex, Baidu, Ahrefs, Semrush.
const BOT_REGEX =
    /googlebot|bingbot|yandex|baiduspider|twitterbot|facebookexternalhit|facebookcrawler|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest\/0\.|pinterestbot|slackbot|vkshare|w3c_validator|whatsapp|discordbot|telegrambot|applebot|ia_archiver|ahrefsbot|semrushbot|msnbot|duckduckbot/i;

// ─── In-Memory Cache ──────────────────────────────────────────────────────────
// Avoids a DB hit on every bot re-crawl. TTL: 5 minutes.
// Structure: Map<cacheKey, { html: string; expiresAt: number }>
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const seoCache = new Map<string, { html: string; expiresAt: number }>();

/** Purge expired entries (called on each request to prevent unbounded growth). */
const pruneCache = () => {
    const now = Date.now();
    for (const [key, entry] of seoCache.entries()) {
        if (entry.expiresAt <= now) seoCache.delete(key);
    }
};

// ─── HTML Helpers ─────────────────────────────────────────────────────────────

/**
 * Escapes a string for safe embedding inside an HTML attribute value
 * (quoted with `"`). Prevents XSS via crafted property titles/descriptions.
 */
const escAttr = (s: string): string =>
    s
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

/**
 * Escapes a string for safe embedding between HTML tags (<title>…</title>).
 */
const escHtml = (s: string): string =>
    s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

// ─── Path Resolution ──────────────────────────────────────────────────────────

/**
 * Resolves the absolute path to the React frontend's index.html.
 * Checks the compiled dist/ build first (production), then the dev source file.
 */
const getIndexPath = (): string | null => {
    const candidates = [
        path.join(__dirname, '../../../Look-Immo-Front/dist/index.html'),
        path.resolve(process.cwd(), '../Look-Immo-Front/dist/index.html'),
        path.join(__dirname, '../../../Look-Immo-Front/index.html'),
        path.resolve(process.cwd(), '../Look-Immo-Front/index.html'),
    ];

    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
};

/**
 * Resolves a stored image path (relative or absolute URL) to a fully-qualified
 * public URL suitable for og:image.
 */
const resolveImageUrl = (image: string | null | undefined): string => {
    const fallback = 'https://look-immo.tn/look-immo-icon-gold.png';
    if (!image) return fallback;
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    const backendUrl = process.env.BACKEND_URL || 'https://look-immo.tn';
    return `${backendUrl}${image.startsWith('/') ? '' : '/'}${image}`;
};

// ─── Meta Tag Builder ─────────────────────────────────────────────────────────

interface MetaData {
    title: string;
    description: string;
    imageUrl: string;
    pageUrl: string;
    ogType: 'website' | 'article';
}

const buildSeoMetaTags = (meta: MetaData): string => {
    const t  = escAttr(meta.title);
    const d  = escAttr(meta.description);
    const ht = escHtml(meta.title);

    return `
  <!-- Primary Meta Tags -->
  <title>${ht}</title>
  <meta name="title" content="${t}">
  <meta name="description" content="${d}">

  <!-- Open Graph / Facebook / WhatsApp / Instagram -->
  <meta property="og:type" content="${meta.ogType}">
  <meta property="og:site_name" content="Look Immo">
  <meta property="og:locale" content="fr_TN">
  <meta property="og:url" content="${escAttr(meta.pageUrl)}">
  <meta property="og:title" content="${t}">
  <meta property="og:description" content="${d}">
  <meta property="og:image" content="${escAttr(meta.imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escAttr(meta.pageUrl)}">
  <meta name="twitter:title" content="${t}">
  <meta name="twitter:description" content="${d}">
  <meta name="twitter:image" content="${escAttr(meta.imageUrl)}">
`;
};

// ─── Middleware ────────────────────────────────────────────────────────────────

/**
 * Express middleware that intercepts `/property/:id` and `/blog-post/:id`.
 *
 * - Social crawlers  → receives a full HTML page with dynamic OG/Twitter tags
 *                      populated from the database (cached for 5 min).
 * - Real users       → receives the SPA index.html served directly from disk
 *                      (identical result to Nginx serving it, just via Express).
 */
export const seoInjector = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const userAgent = req.headers['user-agent'] || '';
    const isBot     = BOT_REGEX.test(userAgent);

    const frontendUrl = process.env.FRONTEND_URL || 'https://look-immo.tn';
    const pageUrl     = `${frontendUrl}${req.originalUrl}`;

    // ── Real-user fast path: serve the SPA shell directly ─────────────────────
    if (!isBot) {
        const indexPath = getIndexPath();
        if (indexPath) {
            res.set('Content-Type', 'text/html');
            res.sendFile(indexPath);
        } else {
            // index.html not found (e.g. fresh dev environment without a build).
            // Fall through to next handler so Vite dev server can handle it.
            next();
        }
        return;
    }

    // ── Bot path: inject OG tags ───────────────────────────────────────────────
    const indexPath = getIndexPath();
    if (!indexPath) {
        console.warn('[SEO Injector] Frontend index.html not found — skipping OG injection.');
        next();
        return;
    }

    pruneCache();

    const isProperty = req.path.startsWith('/property/');
    const isBlog     = req.path.startsWith('/blog-post/');
    const entityId   = req.params.id || '';
    const cacheKey   = `${isProperty ? 'property' : 'blog'}:${entityId}`;

    // ── Cache hit ──────────────────────────────────────────────────────────────
    const cached = seoCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        res.set('Content-Type', 'text/html');
        res.set('Cache-Control', 'public, max-age=300'); // 5 min browser/CDN cache
        res.send(cached.html);
        return;
    }

    try {
        let template = fs.readFileSync(indexPath, 'utf8');

        // Default metadata (used when entity is not found or on DB error)
        let meta: MetaData = {
            title:       'Look Immo | Premium Real Estate Tunisia',
            description: "Plateforme immobilière haut de gamme en Tunisie. Vente et location d'appartements, villas, bureaux, et terrains.",
            imageUrl:    'https://look-immo.tn/look-immo-icon-gold.png',
            pageUrl,
            ogType:      'website',
        };

        // ── Property metadata ──────────────────────────────────────────────────
        if (isProperty && entityId) {
            const property = await prisma.property.findUnique({
                where: { id: entityId },
                select: {
                    title:       true,
                    description: true,
                    type:        true,
                    category:    true,
                    city:        true,
                    zone:        true,
                    price:       true,
                    images:      true,
                },
            });

            if (property) {
                const typeLabel     = property.type === 'sale' ? 'à Vendre' : 'à Louer';
                const categoryLabel = property.category
                    ? property.category.charAt(0).toUpperCase() + property.category.slice(1)
                    : 'Propriété';

                const rawDesc = (property.description || '')
                    .replace(/\[METADATA:.*?\]/g, '')
                    .replace(/\[Type:.*?\]/g, '')
                    .trim();

                const description = rawDesc
                    ? (rawDesc.length > 160 ? `${rawDesc.substring(0, 157)}...` : rawDesc)
                    : `${categoryLabel} de standing ${typeLabel} à ${property.city}${property.zone ? `, ${property.zone}` : ''}. Prix : ${property.price.toLocaleString('fr-FR')} TND.`;

                meta = {
                    title:       `${property.title} — ${categoryLabel} ${typeLabel} à ${property.city} | Look Immo`,
                    description,
                    imageUrl:    resolveImageUrl(property.images?.[0]),
                    pageUrl,
                    ogType:      'website',
                };
            }
        }

        // ── Blog post metadata ─────────────────────────────────────────────────
        if (isBlog && entityId) {
            const blog = await prisma.blog.findUnique({
                where: { id: entityId },
                select: { title: true, excerpt: true, content: true, image: true },
            });

            if (blog) {
                const rawContent = blog.excerpt || blog.content || '';
                const description = rawContent.length > 160
                    ? `${rawContent.substring(0, 157)}...`
                    : rawContent;

                meta = {
                    title:       `${blog.title} | Blog Look Immo`,
                    description,
                    imageUrl:    resolveImageUrl(blog.image),
                    pageUrl,
                    ogType:      'article',
                };
            }
        }

        // ── Inject into HTML ───────────────────────────────────────────────────
        // 1. Strip any existing <title> tag (the template has the generic one)
        // 2. Insert the dynamic SEO block just before </head>
        const seoBlock = buildSeoMetaTags(meta);
        let html = template
            .replace(/<title>.*?<\/title>/gi, '')
            .replace('</head>', `${seoBlock}\n</head>`);

        // Store in cache
        seoCache.set(cacheKey, { html, expiresAt: Date.now() + CACHE_TTL_MS });

        res.set('Content-Type', 'text/html');
        res.set('Cache-Control', 'public, max-age=300');
        res.send(html);
    } catch (err) {
        console.error('[SEO Injector] Failed to inject metadata:', err);
        next();
    }
};
