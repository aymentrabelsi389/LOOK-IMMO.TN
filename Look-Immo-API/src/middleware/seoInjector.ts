import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// List of search engine bots and social share scrapers
const BOT_REGEX = /googlebot|bingbot|yandex|baiduspider|twitterbot|facebookexternalhit|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest\/0\.|pinterestbot|slackbot|vkShare|W3C_Validator|whatsapp|discordbot|telegrambot/i;

/**
 * Resolves the absolute path to the React frontend's index.html template.
 */
const getIndexPath = (): string | null => {
    const paths = [
        path.join(__dirname, '../../../Look-Immo-Front/dist/index.html'), // Production build
        path.join(__dirname, '../../../Look-Immo-Front/index.html'),      // Development source
        path.resolve(process.cwd(), '../Look-Immo-Front/dist/index.html'),
        path.resolve(process.cwd(), '../Look-Immo-Front/index.html'),
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return null;
};

/**
 * Resolves an image path to an absolute URL for crawler preview.
 */
const resolveImageUrl = (image: string | null | undefined): string => {
    if (!image) {
        return 'https://look-immo.tn/look-immo-icon-gold.png'; // Fallback website icon
    }
    if (image.startsWith('http://') || image.startsWith('https://')) {
        return image;
    }
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const cleanImage = image.startsWith('/') ? image : `/${image}`;
    return `${backendUrl}${cleanImage}`;
};

/**
 * Express middleware to inject dynamic SEO metadata for crawlers.
 */
export const seoInjector = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userAgent = req.headers['user-agent'] || '';
    const isBot = BOT_REGEX.test(userAgent);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // If it's a real user (not a crawler), redirect to the React frontend SPA
    if (!isBot) {
        res.redirect(`${frontendUrl}${req.originalUrl}`);
        return;
    }

    const indexPath = getIndexPath();
    if (!indexPath) {
        console.warn('[SEO Injector] Frontend index.html not found. Falling back to next handler.');
        next();
        return;
    }

    try {
        let html = fs.readFileSync(indexPath, 'utf8');

        // Default metadata
        let title = 'Look Immo | Premium Real Estate Tunisia';
        let description = "Plateforme immobilière haut de gamme en Tunisie. Vente et location d'appartements, villas, bureaux, et terrains.";
        let imageUrl = 'https://look-immo.tn/look-immo-icon-gold.png';

        const isProperty = req.path.startsWith('/property/');
        const isBlog = req.path.startsWith('/blog-post/');

        if (isProperty) {
            const id = req.params.id;
            const property = await prisma.property.findUnique({
                where: { id },
                include: { owner: true }
            });

            if (property) {
                // Formulate premium property title
                const typeLabel = property.type === 'sale' ? 'A Vendre' : 'A Louer';
                const categoryLabel = (property.category || 'Propriété').charAt(0).toUpperCase() + (property.category || 'propriété').slice(1);
                
                title = `${property.title} - ${categoryLabel} ${typeLabel} à ${property.city} | Look Immo`;
                
                // Formulate short, descriptions
                const rawDesc = property.description || '';
                // Clean metadata tags if any are embedded in description
                const cleanDesc = rawDesc.replace(/\[METADATA:.*?\]/g, '').replace(/\[Type:.*?\]/g, '').trim();
                
                description = cleanDesc 
                    ? (cleanDesc.length > 160 ? `${cleanDesc.substring(0, 157)}...` : cleanDesc)
                    : `${categoryLabel} de standing à ${property.city}${property.zone ? `, ${property.zone}` : ''}. Prix : ${property.price.toLocaleString('fr-FR')} TND.`;

                if (property.images && property.images.length > 0) {
                    imageUrl = resolveImageUrl(property.images[0]);
                }
            }
        } else if (isBlog) {
            const id = req.params.id;
            const blog = await prisma.blog.findUnique({
                where: { id }
            });

            if (blog) {
                title = `${blog.title} | Blog Look Immo`;
                const rawContent = blog.excerpt || blog.content || '';
                description = rawContent.length > 160 
                    ? `${rawContent.substring(0, 157)}...` 
                    : rawContent;
                
                if (blog.image) {
                    imageUrl = resolveImageUrl(blog.image);
                }
            }
        }

        // Build absolute URL for the OpenGraph meta tag
        const absoluteUrl = `${frontendUrl}${req.originalUrl}`;

        // Construct complete Meta Tags blocks
        const seoMetaTags = `
  <!-- Primary Meta Tags -->
  <title>${title}</title>
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${absoluteUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${absoluteUrl}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="${imageUrl}">
`;

        // Inject the SEO block into the HTML <head> section
        // We replace standard Title and dynamically insert OpenGraph tags
        html = html.replace(/<title>.*?<\/title>/gi, '');
        html = html.replace('</head>', `${seoMetaTags}\n</head>`);

        res.set('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        console.error('[SEO Injector] Failed to inject metadata:', err);
        next();
    }
};
