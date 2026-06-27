import { z } from 'zod';

// Strict schema for Registration
// .strict() ensures that NO unexpected payload properties are allowed (anti-injection)
export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters"),
        
        email: z.string().email("Invalid email format"),
        
        password: z.string().min(6, "Password must be at least 6 characters").max(100),
        
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
        password: z.string().min(6, "Le mot de passe doit comporter au moins 6 caractères").max(100),
    }).strict()
});

