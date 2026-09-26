import { Request, Response } from 'express';
import { prisma } from '../../core/database/prisma';
import { sanitizeHTML } from '../../utils/sanitize';
import { createNotification } from '../notifications/notification.service';
import { logger } from '../../core/logger/logger';
import { asyncHandler, BadRequestError, NotFoundError } from '../../core/errors';
import { CreateBlogPostDTO, UpdateBlogPostDTO } from './blog.schema';

// Get all blog posts
export const getBlogPosts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { published, search, page = '1', limit = '10' } = req.query;
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 10;
    const skip = (p - 1) * l;

    const where = {
        ...(published !== undefined ? { published: published === 'true' } : {}),
        ...(search
            ? {
                OR: [
                    { title: { contains: search as string, mode: 'insensitive' as any } },
                    { excerpt: { contains: search as string, mode: 'insensitive' as any } },
                    { content: { contains: search as string, mode: 'insensitive' as any } },
                ],
            }
            : {}),
    };

    const [posts, total] = await Promise.all([
        prisma.blog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: l,
        }),
        prisma.blog.count({ where }),
    ]);

    res.json({
        posts,
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
    });
});

// Get single blog post
export const getBlogPost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const post = await prisma.blog.findUnique({
        where: { id },
    });

    if (!post) {
        throw new NotFoundError('Blog post not found');
    }

    res.json(post);
});

// Create blog post
export const createBlogPost = asyncHandler(async (req: Request<Record<string, never>, unknown, CreateBlogPostDTO>, res: Response): Promise<void> => {
    const { title, content, excerpt, image, category, published } = req.body;

    if (!title || !content) {
        throw new BadRequestError('Title and content are required');
    }

    // Sanitize rich text inputs before persisting to DB
    const sanitizedContent = sanitizeHTML(content);
    const sanitizedExcerpt = excerpt ? sanitizeHTML(excerpt) : undefined;

    const post = await prisma.blog.create({
        data: {
            title,
            content: sanitizedContent,
            excerpt: sanitizedExcerpt,
            image,
            category: category || 'Actualités',
            published: published || false,
        },
    });

    // Create notification
    try {
        await createNotification({
            type: 'blog_add',
            title: 'Nouvel Article',
            message: `Nouvel article de blog : ${post.title}`,
            icon: 'FileText',
            link: '/admin',
            userId: null,
            metadata: { blogId: post.id },
        });
    } catch (notifError) {
        // notification failures should not abort blog creation
    }

    res.status(201).json(post);
});

// Update blog post
export const updateBlogPost = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateBlogPostDTO>, res: Response): Promise<void> => {
    const { id } = req.params;
    const { title, content, excerpt, image, category, published } = req.body;

    const existingPost = await prisma.blog.findUnique({
        where: { id },
    });

    if (!existingPost) {
        throw new NotFoundError('Blog post not found');
    }

    const post = await prisma.blog.update({
        where: { id },
        data: {
            ...(title && { title }),
            ...(content && { content: sanitizeHTML(content) }),
            ...(excerpt !== undefined && { excerpt: sanitizeHTML(excerpt) }),
            ...(image !== undefined && { image }),
            ...(category !== undefined && { category }),
            ...(published !== undefined && { published }),
        },
    });

    // Create notification
    try {
        await createNotification({
            type: 'blog_edit',
            title: 'Article Modifié',
            message: `Article de blog mis à jour : ${post.title}`,
            icon: 'FileText',
            link: '/admin',
            userId: null,
            metadata: { blogId: post.id },
        });
    } catch (notifError) {
        logger.error('Failed to create blog update notification:', notifError);
    }

    res.json(post);
});

// Delete blog post
export const deleteBlogPost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const post = await prisma.blog.findUnique({
        where: { id },
    });

    if (!post) {
        throw new NotFoundError('Blog post not found');
    }

    await prisma.blog.delete({
        where: { id },
    });

    // Create notification
    try {
        await createNotification({
            type: 'blog_delete',
            title: 'Article Supprimé',
            message: `Article de blog supprimé : ${post.title}`,
            icon: 'FileText',
            link: '/admin',
            userId: null,
            metadata: { blogId: id },
        });
    } catch (notifError) {
        logger.error('Failed to create blog delete notification:', notifError);
    }

    res.json({ message: 'Blog post deleted successfully' });
});
