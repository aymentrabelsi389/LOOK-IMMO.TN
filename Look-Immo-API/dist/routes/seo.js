"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const router = (0, express_1.Router)();
const SITE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
/**
 * GET /sitemap.xml
 * Dynamic XML sitemap for search engine crawlers
 */
router.get('/sitemap.xml', async (req, res) => {
    try {
        const [properties, blogPosts] = await Promise.all([
            prisma_1.prisma.property.findMany({
                where: { status: 'available' },
                select: { id: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' },
            }),
            prisma_1.prisma.blog.findMany({
                where: { published: true },
                select: { id: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' },
            }),
        ]);
        const staticPages = [
            { url: '/', priority: '1.0', changefreq: 'daily' },
            { url: '/listings', priority: '0.9', changefreq: 'hourly' },
            { url: '/blog', priority: '0.7', changefreq: 'weekly' },
            { url: '/contact', priority: '0.5', changefreq: 'monthly' },
        ];
        const today = new Date().toISOString().split('T')[0];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(p => `  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
${properties.map(p => `  <url>
    <loc>${SITE_URL}/property/${p.id}</loc>
    <lastmod>${new Date(p.updatedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
${blogPosts.map(p => `  <url>
    <loc>${SITE_URL}/blog-post/${p.id}</loc>
    <lastmod>${new Date(p.updatedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;
        res.header('Content-Type', 'application/xml');
        res.header('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
        res.send(xml);
    }
    catch (error) {
        console.error('Sitemap generation error:', error);
        res.status(500).send('Error generating sitemap');
    }
});
/**
 * GET /robots.txt
 * Guide search engine crawlers
 */
router.get('/robots.txt', (req, res) => {
    const robots = `User-agent: *
Allow: /

# Block admin and auth routes
Disallow: /admin
Disallow: /auth
Disallow: /dashboard
Disallow: /api/

# Sitemap
Sitemap: ${SITE_URL}/sitemap.xml
`;
    res.header('Content-Type', 'text/plain');
    res.header('Cache-Control', 'public, max-age=86400'); // Cache 24 hours
    res.send(robots);
});
exports.default = router;
//# sourceMappingURL=seo.js.map