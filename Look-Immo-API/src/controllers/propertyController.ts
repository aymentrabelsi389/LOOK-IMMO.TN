import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getCache, setCache, deleteCache, clearCachePattern } from '../utils/redis';
import { prisma } from '../utils/prisma';

// Get all properties
export const getProperties = async (req: Request, res: Response): Promise<void> => {
    try {
    // Normalize cache key: sort query params to avoid duplicate cache entries
    // e.g. {page:1,limit:24} and {limit:24,page:1} should be the same key
    const sortedQuery = Object.keys(req.query).sort().reduce((acc: any, k) => { acc[k] = req.query[k]; return acc; }, {});
    const cacheKey = `properties:list:${JSON.stringify(sortedQuery)}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            res.json(cached);
            return;
        }

        const {
            type, category, city, minPrice, maxPrice, status, search, ownerId,
            minBedrooms, minArea, isHotDeal,
            page = '1', limit = '24', noLimit
        } = req.query;

        // noLimit is an admin-only escape hatch (used for reorder/map views)
        const isNoLimit = noLimit === 'true';
        const p = isNoLimit ? 1 : (parseInt(page as string) || 1);
        const l = isNoLimit ? 9999 : (parseInt(limit as string) || 24);
        const skip = isNoLimit ? 0 : (p - 1) * l;

        const where: any = {
            ...(type && type !== 'all' ? { type: type as any } : {}),
            ...(category && category !== 'all' ? { category: category as string } : {}),
            ...(city && city !== 'all' ? { city: { contains: city as string, mode: 'insensitive' as any } } : {}),
            ...(status && status !== 'all' ? { status: status as any } : {}),
            ...(ownerId ? { ownerId: ownerId as string } : {}),
            ...(minPrice ? { price: { gte: parseFloat(minPrice as string) } } : {}),
            ...(maxPrice ? { price: { lte: parseFloat(maxPrice as string) } } : {}),
            ...(isHotDeal === 'true' ? { isHotDeal: true } : {}),
            ...(search
                ? {
                    OR: [
                        { title: { contains: search as string, mode: 'insensitive' as any } },
                        { city: { contains: search as string, mode: 'insensitive' as any } },
                        { zone: { contains: search as string, mode: 'insensitive' as any } },
                    ],
                }
                : {}),
        };

        // JSON field filters — each path filter must be a separate AND condition in Prisma
        const jsonPathFilters: any[] = [];
        if (minBedrooms && parseInt(minBedrooms as string) > 0) {
            jsonPathFilters.push({ features: { path: ['bedrooms'], gte: parseInt(minBedrooms as string) } });
        }
        if (minArea && parseInt(minArea as string) > 0) {
            jsonPathFilters.push({ features: { path: ['area'], gte: parseInt(minArea as string) } });
        }

        // Merge base where with JSON path filters using AND
        const fullWhere = jsonPathFilters.length > 0
            ? { AND: [where, ...jsonPathFilters] }
            : where;

        const [properties, total] = await Promise.all([
            prisma.property.findMany({
                where: fullWhere,
                select: {
                    id: true,
                    title: true,
                    price: true,
                    priceType: true,
                    type: true,
                    city: true,
                    zone: true,
                    status: true,
                    images: true, // We'll still take the array but only use first in JS
                    createdAt: true,
                    latitude: true,
                    longitude: true,
                    category: true,
                    features: true,
                    isFeatured: true,
                    isNew: true,
                    isHotDeal: true,
                    displayOrder: true,
                    owner: {
                        select: { id: true, name: true },
                    },
                    _count: {
                        select: { ratings: true },
                    },
                    ratings: {
                        select: { stars: true },
                    },
                },
                orderBy: [
                    { displayOrder: 'asc' },
                    { createdAt: 'desc' }
                ],
                skip,
                take: l,
            }),
            prisma.property.count({ where: fullWhere })
        ]);


        // Post-process to calculate average and limit images
        const optimizedProperties = properties.map(p => {
            const ratingsCount = p._count.ratings;
            const averageRating = ratingsCount > 0 
                ? p.ratings.reduce((acc: number, r: { stars: number }) => acc + r.stars, 0) / ratingsCount 
                : 0;

            return {
                ...p,
                images: p.images && p.images.length > 0 ? [p.images[0]] : [],
                averageRating,
                ratingsCount,
                ratings: undefined, // Remove the raw ratings data from response
                _count: undefined   // Remove the internal count object
            };
        });

        const responseData = {
            data: optimizedProperties,
            pagination: {
                total,
                page: p,
                limit: l,
                totalPages: Math.ceil(total / l)
            }
        };

        await setCache(cacheKey, responseData, 300); // 5-minute TTL

        res.json(responseData);
    } catch (error) {
        console.error('Get properties error:', error);
        res.status(500).json({ error: 'Failed to get properties' });
    }
};

// Get single property
export const getProperty = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const cacheKey = `properties:detail:${id}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            res.json(cached);
            return;
        }

        const property = await prisma.property.findUnique({
            where: { id },
            include: {
                owner: {
                    select: { id: true, name: true, email: true, phone: true },
                },
                ratings: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                _count: {
                    select: { appointments: true, visits: true, ratings: true },
                },
            },
        });

        if (!property) {
            res.status(404).json({ error: 'Property not found' });
            return;
        }

        await setCache(cacheKey, property, 300); // 5-minute TTL

        res.json(property);
    } catch (error) {
        console.error('Get property error:', error);
        res.status(500).json({ error: 'Failed to get property' });
    }
};

// Create property
export const createProperty = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, description, price, priceType, type, city, zone, status, images, features, category, isFeatured, isNew, isHotDeal, location } = req.body;
        const ownerId = req.user?.id;

        if (!title || !price || !type || !city || !ownerId) {
            res.status(400).json({ error: 'Title, price, type, and city are required' });
            return;
        }

        // Get max displayOrder to assign new property to end
        const maxOrder = await prisma.property.findFirst({
            orderBy: { displayOrder: 'desc' },
            select: { displayOrder: true }
        });

        const property = await prisma.property.create({
            data: {
                title,
                description,
                price: parseFloat(price),
                priceType: priceType || 'total',
                type,
                city,
                zone,
                status: status || 'available',
                images: images || [],
                features: features ? features : undefined,
                category: category || 'apartment',
                isFeatured: isFeatured || false,
                isNew: isNew || false,
                isHotDeal: isHotDeal || false,
                displayOrder: (maxOrder?.displayOrder || 0) + 1,
                ownerId,
                // Handle lat/lng if provided in location object or directly
                latitude: location?.lat || req.body.latitude,
                longitude: location?.lng || req.body.longitude,
            },
            include: {
                owner: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        // Create notification
        await prisma.notification.create({
            data: {
                type: 'property_add',
                message: `New property added: ${property.title}`,
                entityId: property.id,
                userId: ownerId,
            },
        });

        // Invalidate property list cache
        await clearCachePattern('properties:list:*');

        res.status(201).json(property);
    } catch (error) {
        console.error('Create property error:', error);
        res.status(500).json({ error: 'Failed to create property' });
    }
};

// Update property
export const updateProperty = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, price, priceType, type, city, zone, status, images, features, category, isFeatured, isNew, isHotDeal, location } = req.body;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        console.log('Update Property Request Body:', req.body);
        console.log('isFeatured Type:', typeof req.body.isFeatured);
        console.log('isFeatured Value:', req.body.isFeatured);

        const existingProperty = await prisma.property.findUnique({
            where: { id },
        });

        if (!existingProperty) {
            res.status(404).json({ error: 'Property not found' });
            return;
        }

        // Check ownership (unless admin)
        if (userRole !== 'admin' && existingProperty.ownerId !== userId) {
            res.status(403).json({ error: 'Not authorized to update this property' });
            return;
        }

        const property = await prisma.property.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(price && { price: parseFloat(price) }),
                ...(priceType && { priceType }),
                ...(type && { type }),
                ...(city && { city }),
                ...(zone !== undefined && { zone }),
                ...(status && { status }),
                ...(images && { images }),
                ...(req.body.features && { features: req.body.features }),
                ...(req.body.category && { category: req.body.category }),
                ...(req.body.isFeatured !== undefined && { isFeatured: req.body.isFeatured }),
                ...(req.body.isNew !== undefined && { isNew: req.body.isNew }),
                ...(req.body.isHotDeal !== undefined && { isHotDeal: req.body.isHotDeal }),
                // Handle lat/lng updates
                ...((location?.lat || req.body.latitude) && { latitude: parseFloat(location?.lat || req.body.latitude) }),
                ...((location?.lng || req.body.longitude) && { longitude: parseFloat(location?.lng || req.body.longitude) }),
            },
            include: {
                owner: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        // Create notification
        await prisma.notification.create({
            data: {
                type: 'property_edit',
                message: `Property updated: ${property.title}`,
                entityId: property.id,
                userId,
            },
        });

        // Invalidate caches
        await clearCachePattern('properties:list:*');
        await deleteCache(`properties:detail:${id}`);

        res.json(property);
    } catch (error) {
        console.error('Update property error:', error);
        res.status(500).json({ error: 'Failed to update property' });
    }
};

// Delete property
export const deleteProperty = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        const property = await prisma.property.findUnique({
            where: { id },
        });

        if (!property) {
            res.status(404).json({ error: 'Property not found' });
            return;
        }

        // Check ownership (unless admin)
        if (userRole !== 'admin' && property.ownerId !== userId) {
            res.status(403).json({ error: 'Not authorized to delete this property' });
            return;
        }

        await prisma.property.delete({
            where: { id },
        });

        // Create notification
        await prisma.notification.create({
            data: {
                type: 'property_delete',
                message: `Property deleted: ${property.title}`,
                entityId: id,
                userId,
            },
        });

        // Invalidate caches
        await clearCachePattern('properties:list:*');
        await deleteCache(`properties:detail:${id}`);

        res.json({ message: 'Property deleted successfully' });
    } catch (error) {
        console.error('Delete property error:', error);
        res.status(500).json({ error: 'Failed to delete property' });
    }
};

// Update property order (bulk)
export const updatePropertyOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { updates }: { updates: { id: string; displayOrder: number }[] } = req.body;
        const userRole = req.user?.role;

        // Only admins can reorder properties
        if (userRole !== 'admin') {
            res.status(403).json({ error: 'Only admins can reorder properties' });
            return;
        }

        if (!updates || !Array.isArray(updates)) {
            res.status(400).json({ error: 'Updates array is required' });
            return;
        }

        // Batch update using transaction
        await prisma.$transaction(
            updates.map(({ id, displayOrder }) =>
                prisma.property.update({
                    where: { id },
                    data: { displayOrder }
                })
            )
        );

        // Invalidate property list cache
        await clearCachePattern('properties:list:*');

        res.json({ success: true, message: 'Property order updated successfully' });
    } catch (error) {
        console.error('Update property order error:', error);
        res.status(500).json({ error: 'Failed to update property order' });
    }
};
