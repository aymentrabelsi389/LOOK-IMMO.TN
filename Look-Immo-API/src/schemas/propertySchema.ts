import { z } from 'zod';

const propertyTypes = ['apartment', 'villa', 'land', 'commercial', 'studio', 'duplex', 'triplex', 'penthouse', 'commerce', 'depot'] as const;
const listingTypes = ['sale', 'rent'] as const;
const priceTypes = ['total', 'per_m2', 'per_month'] as const;
const statusTypes = ['available', 'sold', 'rented', 'pending', 'reserved'] as const;

// Shared nested schemas
const featuresSchema = z.object({
    bedrooms: z.number().int().min(0).max(50).optional(),
    bathrooms: z.number().int().min(0).max(20).optional(),
    area: z.number().positive("Area must be positive").max(100000).optional(),
    floor: z.number().int().min(-5).max(200).optional(),
    parking: z.boolean().optional(),
    furnished: z.boolean().optional(),
    pool: z.boolean().optional(),
    garden: z.boolean().optional(),
    elevator: z.boolean().optional(),
    security: z.boolean().optional(),
    airConditioning: z.boolean().optional(),
    heating: z.boolean().optional(),
    balcony: z.boolean().optional(),
    terrace: z.boolean().optional(),
    vocation: z.string().max(100).optional(),
    cos: z.union([z.number(), z.string()]).optional(),
}).optional();

const locationSchema = z.object({
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
}).optional();

// Schema for creating a new property
export const createPropertySchema = z.object({
    body: z.object({
        title: z.string()
            .min(3, "Title must be at least 3 characters")
            .max(150, "Title cannot exceed 150 characters"),

        description: z.string()
            .max(5000, "Description cannot exceed 5000 characters")
            .optional(),

        price: z.union([
            z.number().positive("Price must be positive"),
            z.string().regex(/^\d+(\.\d+)?$/, "Price must be a valid number").transform(Number),
        ]),

        priceType: z.enum(priceTypes).optional().default('total'),

        type: z.enum(listingTypes, {
            message: `Type must be one of: ${listingTypes.join(', ')}`,
        }),

        listingType: z.enum(listingTypes).optional(),

        city: z.string()
            .min(2, "City must be at least 2 characters")
            .max(100, "City cannot exceed 100 characters"),

        zone: z.string().max(100).optional(),

        status: z.enum(statusTypes).optional().default('available'),

        images: z.array(z.string()).max(20, "Cannot have more than 20 images").optional(),

        features: featuresSchema,

        category: z.enum(propertyTypes, {
            message: `Category must be one of: ${propertyTypes.join(', ')}`,
        }).optional(),

        isFeatured: z.boolean().optional().default(false),

        isNew: z.boolean().optional().default(false),

        isHotDeal: z.boolean().optional().default(false),

        latitude: z.number().min(-90).max(90).optional(),

        longitude: z.number().min(-180).max(180).optional(),

        location: locationSchema,
    }),
});

// Schema for partially updating a property
export const updatePropertySchema = z.object({
    params: z.object({
        id: z.string().min(1, "Property ID is required"),
    }),
    body: z.object({
        title: z.string().min(3).max(150).optional(),
        description: z.string().max(5000).optional(),
        price: z.union([
            z.number().positive(),
            z.string().regex(/^\d+(\.\d+)?$/).transform(Number),
        ]).optional(),
        priceType: z.enum(priceTypes).optional(),
        type: z.enum(listingTypes).optional(),
        listingType: z.enum(listingTypes).optional(),
        city: z.string().min(2).max(100).optional(),
        zone: z.string().max(100).optional(),
        status: z.enum(statusTypes).optional(),
        images: z.array(z.string()).max(20).optional(),
        features: featuresSchema,
        category: z.enum(propertyTypes).optional(),
        isFeatured: z.boolean().optional(),
        isNew: z.boolean().optional(),
        isHotDeal: z.boolean().optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        location: locationSchema,
    }),
});

// Schema for bulk reorder
export const reorderPropertySchema = z.object({
    body: z.object({
        updates: z.array(
            z.object({
                id: z.string().min(1),
                displayOrder: z.number().int().min(0),
            })
        ).min(1, "At least one update is required"),
    }),
});
