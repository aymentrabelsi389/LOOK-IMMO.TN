"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMessageSchema = exports.createMessageSchema = void 0;
const zod_1 = require("zod");
// Schema for creating a new contact message (public route)
exports.createMessageSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Accept both "name" and "fullName" for backward compatibility
        name: zod_1.z.string()
            .min(2, "Name must be at least 2 characters")
            .max(100, "Name cannot exceed 100 characters")
            .optional(),
        fullName: zod_1.z.string()
            .min(2, "Name must be at least 2 characters")
            .max(100, "Name cannot exceed 100 characters")
            .optional(),
        email: zod_1.z.string()
            .email("Must be a valid email address"),
        phone: zod_1.z.string()
            .max(25, "Phone number cannot exceed 25 characters")
            .regex(/^[0-9+\-\s()]*$/, "Phone number contains invalid characters")
            .optional()
            .or(zod_1.z.literal('')),
        subject: zod_1.z.string()
            .max(200, "Subject cannot exceed 200 characters")
            .optional(),
        message: zod_1.z.string()
            .min(10, "Message must be at least 10 characters")
            .max(5000, "Message cannot exceed 5000 characters"),
    }).refine((data) => data.name || data.fullName, { message: "Either 'name' or 'fullName' must be provided", path: ["name"] }),
});
// Schema for updating a message status (admin/agent only)
exports.updateMessageSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Message ID is required"),
    }),
    body: zod_1.z.object({
        status: zod_1.z.enum(['unread', 'read', 'archived'], {
            message: "Status must be one of: unread, read, archived",
        }),
    }),
});
//# sourceMappingURL=messageSchema.js.map