import { z } from 'zod';

// Schema for creating a new contact message (public route)
export const createMessageSchema = z.object({
    body: z.object({
        // Accept both "name" and "fullName" for backward compatibility
        name: z.string()
            .min(2, "Name must be at least 2 characters")
            .max(100, "Name cannot exceed 100 characters")
            .optional(),

        fullName: z.string()
            .min(2, "Name must be at least 2 characters")
            .max(100, "Name cannot exceed 100 characters")
            .optional(),

        email: z.string()
            .email("Must be a valid email address"),

        phone: z.string()
            .max(25, "Phone number cannot exceed 25 characters")
            .regex(/^[0-9+\-\s()]*$/, "Phone number contains invalid characters")
            .optional()
            .or(z.literal('')),

        subject: z.string()
            .max(200, "Subject cannot exceed 200 characters")
            .optional(),

        message: z.string()
            .min(10, "Message must be at least 10 characters")
            .max(5000, "Message cannot exceed 5000 characters"),

        // Honeypot anti-bot field — rendered as a hidden <input> in the frontend.
        // Real users never fill it. If a bot fills it, reject silently with 400.
        website: z.string()
            .max(0, "Bot detected")
            .optional()
            .or(z.literal('')),
    }).refine(
        (data) => data.name || data.fullName,
        { message: "Either 'name' or 'fullName' must be provided", path: ["name"] }
    ).refine(
        (data) => !data.website,
        { message: "Bot detected", path: ["website"] }
    ),
});


// Schema for updating a message status (admin/agent only)
export const updateMessageSchema = z.object({
    params: z.object({
        id: z.string().min(1, "Message ID is required"),
    }),
    body: z.object({
        status: z.enum(['unread', 'read', 'archived'], {
            message: "Status must be one of: unread, read, archived",
        }),
    }),
});
