import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strip>;
export declare const forgotPasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strip>;
export declare const verifyResetCodeSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        code: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strip>;
export declare const resetPasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        code: z.ZodString;
        password: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strip>;
//# sourceMappingURL=authSchema.d.ts.map