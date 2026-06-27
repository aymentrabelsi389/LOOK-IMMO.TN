import { z } from 'zod';
export declare const createMessageSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        fullName: z.ZodOptional<z.ZodString>;
        email: z.ZodString;
        phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        subject: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateMessageSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        status: z.ZodEnum<{
            read: "read";
            unread: "unread";
            archived: "archived";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=messageSchema.d.ts.map