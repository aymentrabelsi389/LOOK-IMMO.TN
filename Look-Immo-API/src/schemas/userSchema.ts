import { z } from 'zod';

// Shared password policy — same as authSchema (8+ chars, letter + digit).
const passwordSchema = z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number");

const roleSchema = z.enum(['admin', 'agent', 'client']);

// Admin-only user creation
export const createUserSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(50),
        email: z.string().email("Invalid email format"),
        password: passwordSchema,
        phone: z.string().max(20).optional(),
        role: roleSchema.optional(),
    }).strict()
});

// Self or admin update — every field optional since this is a partial update.
// Role changes are further restricted to admins inside the controller
// (the schema alone can't know the caller's role).
export const updateUserSchema = z.object({
    body: z.object({
        name: z.string().min(2).max(50).optional(),
        email: z.string().email("Invalid email format").optional(),
        phone: z.string().max(20).optional(),
        role: roleSchema.optional(),
        password: passwordSchema.optional(),
    }).strict(),
    params: z.object({
        id: z.string().min(1),
    })
});
