import { z } from 'zod';

export const createDemandSchema = z.object({
    body: z.object({
        clientName: z.string().min(2, "Client name must be at least 2 characters").max(100),
        phone: z.string().max(30).optional().nullable(),
        description: z.string().min(5, "Description must be at least 5 characters").max(5000),
        location: z.string().min(2, "Location is required").max(200),
        type: z.string().min(1, "Type is required"),
        contractType: z.enum(['sale', 'rent']).optional().default('sale'),
        budget: z.number().or(z.string().regex(/^\d+(\.\d+)?$/)).optional().nullable(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
        status: z.enum(['searching', 'contacted', 'visiting', 'negotiating', 'closed', 'cancelled']).optional().default('searching'),
    }),
});

export const updateDemandSchema = z.object({
    params: z.object({
        id: z.string().min(1),
    }),
    body: z.object({
        clientName: z.string().min(2).max(100).optional(),
        phone: z.string().max(30).optional().nullable(),
        description: z.string().min(5).max(5000).optional(),
        location: z.string().min(2).max(200).optional(),
        type: z.string().optional(),
        contractType: z.enum(['sale', 'rent']).optional(),
        budget: z.number().or(z.string().regex(/^\d+(\.\d+)?$/)).optional().nullable(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        status: z.enum(['searching', 'contacted', 'visiting', 'negotiating', 'closed', 'cancelled']).optional(),
    }),
});

// Strict DTO types inferred directly from Zod schemas
export type CreateDemandDTO = z.infer<typeof createDemandSchema>['body'];
export type UpdateDemandDTO = z.infer<typeof updateDemandSchema>['body'];
