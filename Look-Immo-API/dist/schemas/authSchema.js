"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.verifyResetCodeSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// Strict schema for Registration
// .strict() ensures that NO unexpected payload properties are allowed (anti-injection)
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters"),
        email: zod_1.z.string().email("Invalid email format"),
        password: zod_1.z.string().min(6, "Password must be at least 6 characters").max(100),
        phone: zod_1.z.string().max(20, "Phone number is too long").optional(),
    }).strict()
});
// Strict schema for Login
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Invalid email format"),
        password: zod_1.z.string().min(1, "Password cannot be empty")
    }).strict() // Reject any extra fields the user sends
});
// Forgot Password Schemas
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Invalid email format"),
    }).strict()
});
exports.verifyResetCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Invalid email format"),
        code: zod_1.z.string().length(6, "Le code doit comporter 6 chiffres").regex(/^\d+$/, "Le code ne doit contenir que des chiffres"),
    }).strict()
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Invalid email format"),
        code: zod_1.z.string().length(6, "Le code doit comporter 6 chiffres").regex(/^\d+$/, "Le code ne doit contenir que des chiffres"),
        password: zod_1.z.string().min(6, "Le mot de passe doit comporter au moins 6 caractères").max(100),
    }).strict()
});
//# sourceMappingURL=authSchema.js.map