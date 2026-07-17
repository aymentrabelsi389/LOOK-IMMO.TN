import { seoInjector } from './seoInjector';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import fs from 'fs';

jest.mock('../utils/prisma', () => ({
    prisma: {
        property: {
            findUnique: jest.fn(),
        },
        blog: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
}));

describe('seoInjector middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    const mockHtmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>Look Immo | Premium Real Estate Tunisia</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
    `;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            headers: {
                'user-agent': 'googlebot',
            },
            originalUrl: '/property/prop-123',
            path: '/property/prop-123',
            params: { id: 'prop-123' },
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(mockHtmlTemplate);
    });

    it('should serve normal SPA HTML shell immediately to a real user without a database query', async () => {
        mockReq.headers!['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

        await seoInjector(mockReq as Request, mockRes as Response, mockNext);

        expect(prisma.property.findUnique).not.toHaveBeenCalled();
        expect(mockRes.send).toHaveBeenCalledWith(mockHtmlTemplate);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should inject property meta tags, JSON-LD, and body snapshot HTML for bot user agents', async () => {
        const mockProperty = {
            id: 'prop-123',
            title: 'Luxurious Villa in La Marsa',
            description: 'Beautiful villa with pool.',
            type: 'sale',
            category: 'villa',
            city: 'Tunis',
            zone: 'La Marsa',
            price: 1500000,
            images: ['villa.jpg'],
        };

        (prisma.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

        await seoInjector(mockReq as Request, mockRes as Response, mockNext);

        expect(prisma.property.findUnique).toHaveBeenCalledWith({
            where: { id: 'prop-123' },
            select: {
                title: true,
                description: true,
                type: true,
                category: true,
                city: true,
                zone: true,
                price: true,
                images: true,
            },
        });

        const sentHtml = (mockRes.send as jest.Mock).mock.calls[0][0];

        // Verify meta tags are present
        expect(sentHtml).toContain('<title>Luxurious Villa in La Marsa — Villa à Vendre à Tunis | Look Immo</title>');
        expect(sentHtml).toContain('<meta property="og:title" content="Luxurious Villa in La Marsa — Villa à Vendre à Tunis | Look Immo">');
        
        // Verify JSON-LD is present
        expect(sentHtml).toContain('application/ld+json');
        expect(sentHtml).toContain('"@type":"RealEstateListing"');
        expect(sentHtml).toContain('"name":"Luxurious Villa in La Marsa"');
        expect(sentHtml).toContain('"businessFunction":"https://schema.org/sell"');

        // Verify body snapshot is present inside the root element
        expect(sentHtml).toContain('<div id="root">\n\n<article style="padding: 20px; max-width: 800px; margin: 0 auto;">');
        expect(sentHtml).toContain('<h1>Luxurious Villa in La Marsa</h1>');
        expect(sentHtml).toContain('<strong>Prix:</strong>');
        expect(sentHtml).toContain('1');
        expect(sentHtml).toContain('500');
        expect(sentHtml).toContain('000 TND');
        expect(sentHtml).toContain('</article>\n</div>');
    });

    it('should inject blog meta tags, JSON-LD, and body snapshot HTML for bot user agents', async () => {
        const blogReq = {
            headers: {
                'user-agent': 'googlebot',
            },
            originalUrl: '/blog-post/blog-123',
            path: '/blog-post/blog-123',
            params: { id: 'blog-123' },
        };

        const mockBlog = {
            id: 'blog-123',
            title: 'Buying Guide 2026',
            excerpt: 'How to buy properties in Tunisia.',
            content: 'Detailed buying guide contents.',
            image: 'blog.jpg',
        };

        (prisma.blog.findUnique as jest.Mock).mockResolvedValue(mockBlog);

        await seoInjector(blogReq as unknown as Request, mockRes as Response, mockNext);

        expect(prisma.blog.findUnique).toHaveBeenCalledWith({
            where: { id: 'blog-123' },
            select: {
                title: true,
                excerpt: true,
                content: true,
                image: true,
            },
        });

        const sentHtml = (mockRes.send as jest.Mock).mock.calls[0][0];

        // Verify meta tags are present
        expect(sentHtml).toContain('<title>Buying Guide 2026 | Blog Look Immo</title>');
        
        // Verify JSON-LD is present
        expect(sentHtml).toContain('application/ld+json');
        expect(sentHtml).toContain('"@type":"BlogPosting"');
        expect(sentHtml).toContain('"headline":"Buying Guide 2026"');

        // Verify body snapshot is present inside the root element
        expect(sentHtml).toContain('<div id="root">\n\n<article style="padding: 20px; max-width: 800px; margin: 0 auto;">');
        expect(sentHtml).toContain('<h1>Buying Guide 2026</h1>');
        expect(sentHtml).toContain('<p><strong>Extrait:</strong> How to buy properties in Tunisia.</p>');
        expect(sentHtml).toContain('</article>\n</div>');
    });
});
