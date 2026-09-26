import { z } from 'zod';

export const createVisitSchema = z.object({
    body: z.object({
        visitorName: z.string().min(2, "Visitor name must be at least 2 characters").max(100),
        idCard: z.string().min(4, "ID card is required").max(50),
        propertyId: z.string().min(1, "Property ID is required"),
        date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
        notes: z.string().max(2000).optional(),
    }),
});

export type CreateVisitDTO = z.infer<typeof createVisitSchema>['body'];
