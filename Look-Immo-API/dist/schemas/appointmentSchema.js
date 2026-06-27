"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAppointmentSchema = exports.createAppointmentSchema = void 0;
const zod_1 = require("zod");
const appointmentSources = ['website', 'phone', 'walk-in', 'referral', 'social', 'other'];
const meetingTypes = ['visite', 'consultation', 'signature', 'other'];
const appointmentStatuses = ['pending', 'accepted', 'rejected'];
// ISO date string validator (YYYY-MM-DD or full ISO timestamp)
const dateString = zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Must be a valid date string (e.g. 2024-06-15)" });
// HH:MM time validator
const timeString = zod_1.z.string().regex(/^\d{1,2}:\d{2}$/, "Time must be in HH:MM format (e.g. 14:30)");
// Schema for creating a new appointment (public route)
exports.createAppointmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        clientName: zod_1.z.string()
            .min(2, "Client name must be at least 2 characters")
            .max(100, "Client name cannot exceed 100 characters"),
        clientEmail: zod_1.z.string().email("Must be a valid email address").optional().or(zod_1.z.literal('')),
        clientPhone: zod_1.z.string()
            .max(25, "Phone number cannot exceed 25 characters")
            .regex(/^[0-9+\-\s()]*$/, "Phone number contains invalid characters")
            .optional(),
        date: dateString,
        time: timeString,
        propertyId: zod_1.z.string().optional().nullable(),
        notes: zod_1.z.string()
            .max(2000, "Notes cannot exceed 2000 characters")
            .optional(),
        source: zod_1.z.enum(appointmentSources).optional().default('other'),
        meetingType: zod_1.z.enum(meetingTypes).optional().default('visite'),
    }).refine((data) => data.clientEmail || data.clientPhone, { message: "Either clientEmail or clientPhone must be provided", path: ["clientEmail"] }),
});
// Schema for updating an appointment (auth-protected)
exports.updateAppointmentSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Appointment ID is required"),
    }),
    body: zod_1.z.object({
        status: zod_1.z.enum(appointmentStatuses).optional(),
        date: dateString.optional(),
        time: timeString.optional(),
        notes: zod_1.z.string().max(2000).optional(),
        source: zod_1.z.enum(appointmentSources).optional(),
        meetingType: zod_1.z.enum(meetingTypes).optional(),
        propertyId: zod_1.z.string().optional().nullable(),
        clientName: zod_1.z.string().min(2).max(100).optional(),
        clientPhone: zod_1.z.string().max(25).regex(/^[0-9+\-\s()]*$/).optional(),
        clientEmail: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    }).refine((data) => Object.keys(data).length > 0, { message: "At least one field is required to update" }),
});
//# sourceMappingURL=appointmentSchema.js.map