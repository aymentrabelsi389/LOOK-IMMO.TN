import { z } from 'zod';

export const createBlogPostSchema = z.object({
    body: z.object({
        title: z.string().min(2, "Title must be at least 2 characters").max(200),
        content: z.string().min(10, "Content must be at least 10 characters"),
        excerpt: z.string().max(1000).optional(),
        image: z.string().optional().nullable(),
        category: z.string().optional().default('Actualités'),
        published: z.boolean().optional().default(false),
    }),
});

export const updateBlogPostSchema = z.object({
    params: z.object({
        id: z.string().min(1),
    }),
    body: z.object({
        title: z.string().min(2).max(200).optional(),
        content: z.string().min(10).optional(),
        excerpt: z.string().max(1000).optional(),
        image: z.string().optional().nullable(),
        category: z.string().optional(),
        published: z.boolean().optional(),
    }),
});

export type CreateBlogPostDTO = z.infer<typeof createBlogPostSchema>['body'];
export type UpdateBlogPostDTO = z.infer<typeof updateBlogPostSchema>['body'];
