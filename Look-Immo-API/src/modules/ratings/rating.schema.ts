import { z } from 'zod';

export const createRatingSchema = z.object({
    body: z.object({
        userName: z.string().min(2, "Name must be at least 2 characters").max(100),
        propertyId: z.string().min(1, "Property ID is required"),
        stars: z.number().int().min(1).max(5),
        comment: z.string().max(2000).optional(),
    }),
});

export type CreateRatingDTO = z.infer<typeof createRatingSchema>['body'];
