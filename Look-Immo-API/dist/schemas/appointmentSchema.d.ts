import { z } from 'zod';
export declare const createAppointmentSchema: z.ZodObject<{
    body: z.ZodObject<{
        clientName: z.ZodString;
        clientEmail: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        clientPhone: z.ZodOptional<z.ZodString>;
        date: z.ZodString;
        time: z.ZodString;
        propertyId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        notes: z.ZodOptional<z.ZodString>;
        source: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            other: "other";
            phone: "phone";
            website: "website";
            "walk-in": "walk-in";
            referral: "referral";
            social: "social";
        }>>>;
        meetingType: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            other: "other";
            visite: "visite";
            consultation: "consultation";
            signature: "signature";
        }>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateAppointmentSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        status: z.ZodOptional<z.ZodEnum<{
            pending: "pending";
            accepted: "accepted";
            rejected: "rejected";
        }>>;
        date: z.ZodOptional<z.ZodString>;
        time: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
        source: z.ZodOptional<z.ZodEnum<{
            other: "other";
            phone: "phone";
            website: "website";
            "walk-in": "walk-in";
            referral: "referral";
            social: "social";
        }>>;
        meetingType: z.ZodOptional<z.ZodEnum<{
            other: "other";
            visite: "visite";
            consultation: "consultation";
            signature: "signature";
        }>>;
        propertyId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        clientName: z.ZodOptional<z.ZodString>;
        clientPhone: z.ZodOptional<z.ZodString>;
        clientEmail: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=appointmentSchema.d.ts.map