import { z } from 'zod';
export declare const createPropertySchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        price: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
        priceType: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            total: "total";
            per_m2: "per_m2";
            per_month: "per_month";
        }>>>;
        type: z.ZodEnum<{
            rent: "rent";
            sale: "sale";
        }>;
        listingType: z.ZodOptional<z.ZodEnum<{
            rent: "rent";
            sale: "sale";
        }>>;
        city: z.ZodString;
        zone: z.ZodOptional<z.ZodString>;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            pending: "pending";
            available: "available";
            sold: "sold";
            rented: "rented";
            reserved: "reserved";
        }>>>;
        images: z.ZodOptional<z.ZodArray<z.ZodString>>;
        features: z.ZodOptional<z.ZodObject<{
            bedrooms: z.ZodOptional<z.ZodNumber>;
            bathrooms: z.ZodOptional<z.ZodNumber>;
            area: z.ZodOptional<z.ZodNumber>;
            floor: z.ZodOptional<z.ZodNumber>;
            parking: z.ZodOptional<z.ZodBoolean>;
            furnished: z.ZodOptional<z.ZodBoolean>;
            pool: z.ZodOptional<z.ZodBoolean>;
            garden: z.ZodOptional<z.ZodBoolean>;
            elevator: z.ZodOptional<z.ZodBoolean>;
            security: z.ZodOptional<z.ZodBoolean>;
            airConditioning: z.ZodOptional<z.ZodBoolean>;
            heating: z.ZodOptional<z.ZodBoolean>;
            balcony: z.ZodOptional<z.ZodBoolean>;
            terrace: z.ZodOptional<z.ZodBoolean>;
            vocation: z.ZodOptional<z.ZodString>;
            cos: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
        }, z.core.$strip>>;
        category: z.ZodOptional<z.ZodEnum<{
            apartment: "apartment";
            villa: "villa";
            commerce: "commerce";
            land: "land";
            commercial: "commercial";
            studio: "studio";
            duplex: "duplex";
            triplex: "triplex";
            penthouse: "penthouse";
            depot: "depot";
        }>>;
        isFeatured: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        isNew: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        isHotDeal: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        latitude: z.ZodOptional<z.ZodNumber>;
        longitude: z.ZodOptional<z.ZodNumber>;
        location: z.ZodOptional<z.ZodObject<{
            lat: z.ZodOptional<z.ZodNumber>;
            lng: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updatePropertySchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        price: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>>;
        priceType: z.ZodOptional<z.ZodEnum<{
            total: "total";
            per_m2: "per_m2";
            per_month: "per_month";
        }>>;
        type: z.ZodOptional<z.ZodEnum<{
            rent: "rent";
            sale: "sale";
        }>>;
        listingType: z.ZodOptional<z.ZodEnum<{
            rent: "rent";
            sale: "sale";
        }>>;
        city: z.ZodOptional<z.ZodString>;
        zone: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<{
            pending: "pending";
            available: "available";
            sold: "sold";
            rented: "rented";
            reserved: "reserved";
        }>>;
        images: z.ZodOptional<z.ZodArray<z.ZodString>>;
        features: z.ZodOptional<z.ZodObject<{
            bedrooms: z.ZodOptional<z.ZodNumber>;
            bathrooms: z.ZodOptional<z.ZodNumber>;
            area: z.ZodOptional<z.ZodNumber>;
            floor: z.ZodOptional<z.ZodNumber>;
            parking: z.ZodOptional<z.ZodBoolean>;
            furnished: z.ZodOptional<z.ZodBoolean>;
            pool: z.ZodOptional<z.ZodBoolean>;
            garden: z.ZodOptional<z.ZodBoolean>;
            elevator: z.ZodOptional<z.ZodBoolean>;
            security: z.ZodOptional<z.ZodBoolean>;
            airConditioning: z.ZodOptional<z.ZodBoolean>;
            heating: z.ZodOptional<z.ZodBoolean>;
            balcony: z.ZodOptional<z.ZodBoolean>;
            terrace: z.ZodOptional<z.ZodBoolean>;
            vocation: z.ZodOptional<z.ZodString>;
            cos: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
        }, z.core.$strip>>;
        category: z.ZodOptional<z.ZodEnum<{
            apartment: "apartment";
            villa: "villa";
            commerce: "commerce";
            land: "land";
            commercial: "commercial";
            studio: "studio";
            duplex: "duplex";
            triplex: "triplex";
            penthouse: "penthouse";
            depot: "depot";
        }>>;
        isFeatured: z.ZodOptional<z.ZodBoolean>;
        isNew: z.ZodOptional<z.ZodBoolean>;
        isHotDeal: z.ZodOptional<z.ZodBoolean>;
        latitude: z.ZodOptional<z.ZodNumber>;
        longitude: z.ZodOptional<z.ZodNumber>;
        location: z.ZodOptional<z.ZodObject<{
            lat: z.ZodOptional<z.ZodNumber>;
            lng: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const reorderPropertySchema: z.ZodObject<{
    body: z.ZodObject<{
        updates: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            displayOrder: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=propertySchema.d.ts.map