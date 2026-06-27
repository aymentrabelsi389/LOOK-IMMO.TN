import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// Get all blog posts
export const getBlogPosts = async (req: Request, res: Response): Promise<void> => {
    try {
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
                    ],
                }
                : {}),
        };

        const [posts, total] = await Promise.all([
            prisma.blog.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    excerpt: true,
                    image: true,
                    category: true,
                    published: true,
                    createdAt: true,
                    updatedAt: true,
                    // Note: 'content' is omitted here to keep payload small for lists
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: l,
            }),
            prisma.blog.count({ where })
        ]);

        res.json({
            data: posts,
            pagination: {
                total,
                page: p,
                limit: l,
                totalPages: Math.ceil(total / l)
            }
        });
    } catch (error) {
        console.error('Get blog posts error:', error);
        res.status(500).json({ error: 'Failed to get blog posts' });
    }
};

// Get single blog post
export const getBlogPost = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const post = await prisma.blog.findUnique({
            where: { id },
        });

        if (!post) {
            res.status(404).json({ error: 'Blog post not found' });
            return;
        }

        res.json(post);
    } catch (error) {
        console.error('Get blog post error:', error);
        res.status(500).json({ error: 'Failed to get blog post' });
    }
};

// Create blog post
export const createBlogPost = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, content, excerpt, image, category, published } = req.body;

        if (!title || !content) {
            res.status(400).json({ error: 'Title and content are required' });
            return;
        }

        const post = await prisma.blog.create({
            data: {
                title,
                content,
                excerpt,
                image,
                category: category || 'Actualités',
                published: published || false,
            },
        });

        // Create notification
        await prisma.notification.create({
            data: {
                type: 'blog_add',
                message: `New blog post: ${post.title}`,
                entityId: post.id,
            },
        });

        res.status(201).json(post);
    } catch (error) {
        console.error('Create blog post error:', error);
        res.status(500).json({ error: 'Failed to create blog post' });
    }
};

// Update blog post
export const updateBlogPost = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, content, excerpt, image, category, published } = req.body;

        const existingPost = await prisma.blog.findUnique({
            where: { id },
        });

        if (!existingPost) {
            res.status(404).json({ error: 'Blog post not found' });
            return;
        }

        const post = await prisma.blog.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(content && { content }),
                ...(excerpt !== undefined && { excerpt }),
                ...(image !== undefined && { image }),
                ...(category !== undefined && { category }),
                ...(published !== undefined && { published }),
            },
        });

        // Create notification
        await prisma.notification.create({
            data: {
                type: 'blog_edit',
                message: `Blog post updated: ${post.title}`,
                entityId: post.id,
            },
        });

        res.json(post);
    } catch (error) {
        console.error('Update blog post error:', error);
        res.status(500).json({ error: 'Failed to update blog post' });
    }
};

// Delete blog post
export const deleteBlogPost = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const post = await prisma.blog.findUnique({
            where: { id },
        });

        if (!post) {
            res.status(404).json({ error: 'Blog post not found' });
            return;
        }

        await prisma.blog.delete({
            where: { id },
        });

        // Create notification
        await prisma.notification.create({
            data: {
                type: 'blog_delete',
                message: `Blog post deleted: ${post.title}`,
                entityId: id,
            },
        });

        res.json({ message: 'Blog post deleted successfully' });
    } catch (error) {
        console.error('Delete blog post error:', error);
        res.status(500).json({ error: 'Failed to delete blog post' });
    }
};
