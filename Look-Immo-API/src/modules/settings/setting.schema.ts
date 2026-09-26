import { z } from 'zod';

export const updateSettingSchema = z.object({
    body: z.object({
        websiteName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        phoneNumber: z.string().optional(),
        address: z.string().optional(),
        socialMedia: z.record(z.string(), z.string()).optional(),
        workingHours: z.record(z.string(), z.string()).optional(),
        aboutText: z.string().optional(),
    }).passthrough(),
});

export type UpdateSettingDTO = z.infer<typeof updateSettingSchema>['body'];
