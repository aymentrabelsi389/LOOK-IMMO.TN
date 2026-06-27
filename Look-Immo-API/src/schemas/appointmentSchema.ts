import { z } from 'zod';

const appointmentSources = ['website', 'phone', 'walk-in', 'referral', 'social', 'other'] as const;
const meetingTypes = ['visite', 'consultation', 'signature', 'other'] as const;
const appointmentStatuses = ['pending', 'accepted', 'rejected'] as const;

// ISO date string validator (YYYY-MM-DD or full ISO timestamp)
const dateString = z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Must be a valid date string (e.g. 2024-06-15)" }
);

// HH:MM time validator
const timeString = z.string().regex(
    /^\d{1,2}:\d{2}$/,
    "Time must be in HH:MM format (e.g. 14:30)"
);

// Schema for creating a new appointment (public route)
export const createAppointmentSchema = z.object({
    body: z.object({
        clientName: z.string()
            .min(2, "Client name must be at least 2 characters")
            .max(100, "Client name cannot exceed 100 characters"),

        clientEmail: z.string().email("Must be a valid email address").optional().or(z.literal('')),

        clientPhone: z.string()
            .max(25, "Phone number cannot exceed 25 characters")
            .regex(/^[0-9+\-\s()]*$/, "Phone number contains invalid characters")
            .optional(),

        date: dateString,

        time: timeString,

        propertyId: z.string().optional().nullable(),

        notes: z.string()
            .max(2000, "Notes cannot exceed 2000 characters")
            .optional(),

        source: z.enum(appointmentSources).optional().default('other'),

        meetingType: z.enum(meetingTypes).optional().default('visite'),
    }).refine(
        (data) => data.clientEmail || data.clientPhone,
        { message: "Either clientEmail or clientPhone must be provided", path: ["clientEmail"] }
    ),
});

// Schema for updating an appointment (auth-protected)
export const updateAppointmentSchema = z.object({
    params: z.object({
        id: z.string().min(1, "Appointment ID is required"),
    }),
    body: z.object({
        status: z.enum(appointmentStatuses).optional(),
        date: dateString.optional(),
        time: timeString.optional(),
        notes: z.string().max(2000).optional(),
        source: z.enum(appointmentSources).optional(),
        meetingType: z.enum(meetingTypes).optional(),
        propertyId: z.string().optional().nullable(),
        clientName: z.string().min(2).max(100).optional(),
        clientPhone: z.string().max(25).regex(/^[0-9+\-\s()]*$/).optional(),
        clientEmail: z.string().email().optional().or(z.literal('')),
    }).refine(
        (data) => Object.keys(data).length > 0,
        { message: "At least one field is required to update" }
    ),
});
