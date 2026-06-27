"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderPropertySchema = exports.updatePropertySchema = exports.createPropertySchema = void 0;
const zod_1 = require("zod");
const propertyTypes = ['apartment', 'villa', 'land', 'commercial', 'studio', 'duplex', 'triplex', 'penthouse', 'commerce', 'depot'];
const listingTypes = ['sale', 'rent'];
const priceTypes = ['total', 'per_m2', 'per_month'];
const statusTypes = ['available', 'sold', 'rented', 'pending', 'reserved'];
// Shared nested schemas
const featuresSchema = zod_1.z.object({
    bedrooms: zod_1.z.number().int().min(0).max(50).optional(),
    bathrooms: zod_1.z.number().int().min(0).max(20).optional(),
    area: zod_1.z.number().positive("Area must be positive").max(100000).optional(),
    floor: zod_1.z.number().int().min(-5).max(200).optional(),
    parking: zod_1.z.boolean().optional(),
    furnished: zod_1.z.boolean().optional(),
    pool: zod_1.z.boolean().optional(),
    garden: zod_1.z.boolean().optional(),
    elevator: zod_1.z.boolean().optional(),
    security: zod_1.z.boolean().optional(),
    airConditioning: zod_1.z.boolean().optional(),
    heating: zod_1.z.boolean().optional(),
    balcony: zod_1.z.boolean().optional(),
    terrace: zod_1.z.boolean().optional(),
    vocation: zod_1.z.string().max(100).optional(),
    cos: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
}).optional();
const locationSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90).optional(),
    lng: zod_1.z.number().min(-180).max(180).optional(),
}).optional();
// Schema for creating a new property
exports.createPropertySchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string()
            .min(3, "Title must be at least 3 characters")
            .max(150, "Title cannot exceed 150 characters"),
        description: zod_1.z.string()
            .max(5000, "Description cannot exceed 5000 characters")
            .optional(),
        price: zod_1.z.union([
            zod_1.z.number().positive("Price must be positive"),
            zod_1.z.string().regex(/^\d+(\.\d+)?$/, "Price must be a valid number").transform(Number),
        ]),
        priceType: zod_1.z.enum(priceTypes).optional().default('total'),
        type: zod_1.z.enum(listingTypes, {
            message: `Type must be one of: ${listingTypes.join(', ')}`,
        }),
        listingType: zod_1.z.enum(listingTypes).optional(),
        city: zod_1.z.string()
            .min(2, "City must be at least 2 characters")
            .max(100, "City cannot exceed 100 characters"),
        zone: zod_1.z.string().max(100).optional(),
        status: zod_1.z.enum(statusTypes).optional().default('available'),
        images: zod_1.z.array(zod_1.z.string()).max(20, "Cannot have more than 20 images").optional(),
        features: featuresSchema,
        category: zod_1.z.enum(propertyTypes, {
            message: `Category must be one of: ${propertyTypes.join(', ')}`,
        }).optional(),
        isFeatured: zod_1.z.boolean().optional().default(false),
        isNew: zod_1.z.boolean().optional().default(false),
        isHotDeal: zod_1.z.boolean().optional().default(false),
        latitude: zod_1.z.number().min(-90).max(90).optional(),
        longitude: zod_1.z.number().min(-180).max(180).optional(),
        location: locationSchema,
    }),
});
// Schema for partially updating a property
exports.updatePropertySchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, "Property ID is required"),
    }),
    body: zod_1.z.object({
        title: zod_1.z.string().min(3).max(150).optional(),
        description: zod_1.z.string().max(5000).optional(),
        price: zod_1.z.union([
            zod_1.z.number().positive(),
            zod_1.z.string().regex(/^\d+(\.\d+)?$/).transform(Number),
        ]).optional(),
        priceType: zod_1.z.enum(priceTypes).optional(),
        type: zod_1.z.enum(listingTypes).optional(),
        listingType: zod_1.z.enum(listingTypes).optional(),
        city: zod_1.z.string().min(2).max(100).optional(),
        zone: zod_1.z.string().max(100).optional(),
        status: zod_1.z.enum(statusTypes).optional(),
        images: zod_1.z.array(zod_1.z.string()).max(20).optional(),
        features: featuresSchema,
        category: zod_1.z.enum(propertyTypes).optional(),
        isFeatured: zod_1.z.boolean().optional(),
        isNew: zod_1.z.boolean().optional(),
        isHotDeal: zod_1.z.boolean().optional(),
        latitude: zod_1.z.number().min(-90).max(90).optional(),
        longitude: zod_1.z.number().min(-180).max(180).optional(),
        location: locationSchema,
    }),
});
// Schema for bulk reorder
exports.reorderPropertySchema = zod_1.z.object({
    body: zod_1.z.object({
        updates: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string().min(1),
            displayOrder: zod_1.z.number().int().min(0),
        })).min(1, "At least one update is required"),
    }),
});
//# sourceMappingURL=propertySchema.js.map