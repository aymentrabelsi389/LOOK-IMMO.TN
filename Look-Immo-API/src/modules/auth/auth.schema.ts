import { z } from 'zod';

// Shared password policy: 8+ chars, at least one letter and one digit.
// (Bumped from a bare 6-char minimum — too weak for accounts tied to
// financial/transaction data.)
const passwordSchema = z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number");

// Strict schema for Registration
// .strict() ensures that NO unexpected payload properties are allowed (anti-injection)
export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters"),
        
        email: z.string().email("Invalid email format"),
        
        password: passwordSchema,
        
        phone: z.string().max(20, "Phone number is too long").optional(),
    }).strict()
});

// Strict schema for Login
export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
        
        password: z.string().min(1, "Password cannot be empty")
    }).strict() // Reject any extra fields the user sends
});

// Forgot Password Schemas
export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
    }).strict()
});

export const verifyResetCodeSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
        code: z.string().length(6, "Le code doit comporter 6 chiffres").regex(/^\d+$/, "Le code ne doit contenir que des chiffres"),
    }).strict()
});

export const resetPasswordSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
        code: z.string().length(6, "Le code doit comporter 6 chiffres").regex(/^\d+$/, "Le code ne doit contenir que des chiffres"),
        password: passwordSchema,
    }).strict()
});

