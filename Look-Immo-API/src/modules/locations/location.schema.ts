import { z } from 'zod';

export const createLocationSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Location name must be at least 2 characters").max(100),
        centerLat: z.number().or(z.string().regex(/^-?\d+(\.\d+)?$/)),
        centerLng: z.number().or(z.string().regex(/^-?\d+(\.\d+)?$/)),
        radius: z.number().or(z.string().regex(/^\d+(\.\d+)?$/)),
    }),
});

export const updateLocationSchema = z.object({
    params: z.object({
        id: z.string().min(1),
    }),
    body: z.object({
        name: z.string().min(2).max(100).optional(),
        centerLat: z.number().or(z.string().regex(/^-?\d+(\.\d+)?$/)).optional(),
        centerLng: z.number().or(z.string().regex(/^-?\d+(\.\d+)?$/)).optional(),
        radius: z.number().or(z.string().regex(/^\d+(\.\d+)?$/)).optional(),
    }),
});

export const reorderLocationSchema = z.object({
    body: z.object({
        updates: z.array(
            z.object({
                id: z.string().min(1),
                displayOrder: z.number().int(),
            })
        ).min(1),
    }),
});

export type CreateLocationDTO = z.infer<typeof createLocationSchema>['body'];
export type UpdateLocationDTO = z.infer<typeof updateLocationSchema>['body'];
export type ReorderLocationDTO = z.infer<typeof reorderLocationSchema>['body'];
