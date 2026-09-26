import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getCache, setCache, deleteCache, clearCachePattern } from '../utils/redis';
import { prisma } from '../utils/prisma';
import { createNotification, checkPropertyMatchesAndNotify } from '../services/notificationService';
import { logger } from '../utils/logger';

// Helper to compute a property's total price (especially for lands sold per m²)
export const getPropertyTotalPrice = (p: { price: number; priceType?: string | null; category?: string | null; features?: any }): number => {
    const area = p.features && typeof p.features === 'object' && (p.features as any).area ? Number((p.features as any).area) : null;
    const isPerM2 = p.priceType === 'per_m2' || (!p.priceType && p.category === 'land' && p.price < 20_000);
    if (isPerM2 && area && area > 0) {
        return Math.round(p.price * area);
    }
    return p.price;
};

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
            minBedrooms, minArea, isHotDeal, excludeSold,
            page = '1', limit = '24', noLimit
        } = req.query;

        // noLimit is an admin-only escape hatch (used for reorder/map views)
        const isNoLimit = noLimit === 'true';
        const p = isNoLimit ? 1 : (parseInt(page as string) || 1);
        const l = isNoLimit ? 9999 : (parseInt(limit as string) || 24);
        const skip = isNoLimit ? 0 : (p - 1) * l;

        const isLand = category === 'land';
        const hasPriceFilter = Boolean(minPrice || maxPrice);

        const where: any = {
            ...(type && type !== 'all' ? { type: type as any } : {}),
            ...(category && category !== 'all' ? { category: category as string } : {}),
            ...(city && city !== 'all' ? { city: { contains: city as string, mode: 'insensitive' as any } } : {}),
            // If a specific status filter is provided use it; if excludeSold=true hide sold/rented (public listing)
            ...(status && status !== 'all'
                ? { status: status as any }
                : excludeSold === 'true'
                    ? { status: { notIn: ['sold', 'rented'] } }
                    : {}),
            ...(ownerId ? { ownerId: ownerId as string } : {}),
            // For lands, price in DB is often per m² while min/maxPrice is total price.
            // When querying lands, filter by total price in-memory to accurately calculate price * area.
            ...(!isLand && minPrice ? { price: { gte: parseFloat(minPrice as string) } } : {}),
            ...(!isLand && maxPrice ? { price: { lte: parseFloat(maxPrice as string) } } : {}),
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

        const propertySelect = {
            id: true,
            title: true,
            price: true,
            priceType: true,
            type: true,
            city: true,
            zone: true,
            status: true,
            images: true,
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
            averageRating: true,
            ratingsCount: true,
            ownerPhone: true,
        } as const;

        let properties: any[];
        let total: number;

        if (isLand && hasPriceFilter) {
            const min = minPrice ? parseFloat(minPrice as string) : null;
            const max = maxPrice ? parseFloat(maxPrice as string) : null;

            // Fetch candidate lands matching all other filters
            const allMatchingLands = await prisma.property.findMany({
                where: fullWhere,
                select: propertySelect as any,
                orderBy: [
                    { displayOrder: 'asc' },
                    { createdAt: 'desc' }
                ],
            });

            // Filter lands by their total estimated price (price * area if per_m2)
            const filteredLands = allMatchingLands.filter(land => {
                const totalEstimated = getPropertyTotalPrice(land as any);
                if (min !== null && totalEstimated < min) return false;
                if (max !== null && totalEstimated > max) return false;
                return true;
            });

            total = filteredLands.length;
            properties = isNoLimit ? filteredLands : filteredLands.slice(skip, skip + l);
        } else {
            const [queriedProperties, count] = await Promise.all([
                prisma.property.findMany({
                    where: fullWhere,
                    select: propertySelect as any,
                    orderBy: [
                        { displayOrder: 'asc' },
                        { createdAt: 'desc' }
                    ],
                    skip,
                    take: l,
                }),
                prisma.property.count({ where: fullWhere })
            ]);

            properties = queriedProperties;
            total = count;

            // If query is across all categories with a max price, ensure any lands don't leak through on unit price
            if (!isLand && hasPriceFilter && maxPrice) {
                const maxVal = parseFloat(maxPrice as string);
                properties = properties.filter(p => {
                    const totalEstimated = getPropertyTotalPrice(p as any);
                    return totalEstimated <= maxVal;
                });
            }
        }


        // Post-process to limit images
        const optimizedProperties = properties.map(p => ({
            ...p,
            images: p.images && p.images.length > 0 ? [p.images[0]] : [],
        }));

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
        logger.error('Get properties error:', error);
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
        logger.error('Get property error:', error);
        res.status(500).json({ error: 'Failed to get property' });
    }
};

// Create property
export const createProperty = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, description, price, priceType, type, city, zone, status, images, features, category, isFeatured, isNew, isHotDeal, location, ownerPhone } = req.body;
        const ownerId = req.user?.id;

        if (!title || !price || !type || !city || !ownerId) {
            res.status(400).json({ error: 'Title, price, type, and city are required' });
            return;
        }

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
                ownerId,
                ownerPhone: ownerPhone || null,
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

        // Invalidate property list cache
        await clearCachePattern('properties:list:*');

        res.status(201).json(property);

        // Notification + demand-matching scan run AFTER the response is sent.
        // checkPropertyMatchesAndNotify loops over every active ClientDemand
        // doing string/score matching — it was previously awaited before the
        // response, adding latency to property creation proportional to
        // demand volume. Fire-and-forget with its own error handling instead.
        (async () => {
            try {
                const feats = property.features ? (property.features as any) : {};
                const details: string[] = [];
                if (feats.bedrooms) details.push(`${feats.bedrooms} ch`);
                if (feats.bathrooms) details.push(`${feats.bathrooms} sdb`);
                if (feats.area) details.push(`${feats.area} m²`);
                const detailsStr = details.length > 0 ? ` (${details.join(', ')})` : '';

                await createNotification({
                    type: 'property_add',
                    title: 'Nouvelle Propriété',
                    message: `Une nouvelle propriété a été ajoutée : ${property.title}${detailsStr}`,
                    icon: 'Home',
                    link: `/property/${property.id}`,
                    userId: null, // Send to all admins/agents
                    metadata: { propertyId: property.id }
                });

                await checkPropertyMatchesAndNotify(property);
            } catch (notifErr) {
                logger.error('Failed to create property notifications:', notifErr);
            }
        })();
    } catch (error) {
        logger.error('Create property error:', error);
        res.status(500).json({ error: 'Failed to create property' });
    }
};

// Update property
export const updateProperty = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, price, priceType, type, city, zone, status, images, location, ownerPhone } = req.body;
        const userId = req.user?.id;
        const userRole = req.user?.role;



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
                ...(ownerPhone !== undefined && { ownerPhone: ownerPhone || null }),
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
        try {
            await createNotification({
                type: 'property_edit',
                title: 'Propriété Modifiée',
                message: `Propriété mise à jour : ${property.title}`,
                icon: 'Home',
                link: `/property/${property.id}`,
                userId: null,
                metadata: { propertyId: property.id },
            });
        } catch (notifError) {
            logger.error('Failed to create property update notification:', notifError);
        }

        // Invalidate caches
        await clearCachePattern('properties:list:*');
        await deleteCache(`properties:detail:${id}`);

        res.json(property);
    } catch (error) {
        logger.error('Update property error:', error);
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
        try {
            await createNotification({
                type: 'property_delete',
                title: 'Propriété Supprimée',
                message: `Propriété supprimée : ${property.title}`,
                icon: 'Home',
                link: '/admin',
                userId: null,
                metadata: { propertyId: id },
            });
        } catch (notifError) {
            logger.error('Failed to create property delete notification:', notifError);
        }

        // Invalidate caches
        await clearCachePattern('properties:list:*');
        await deleteCache(`properties:detail:${id}`);

        res.json({ message: 'Property deleted successfully' });
    } catch (error) {
        logger.error('Delete property error:', error);
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

        // Sort updates by requested displayOrder and normalize sequentially 1..N
        const sortedUpdates = [...updates].sort((a, b) => a.displayOrder - b.displayOrder);

        // Batch update using transaction
        await prisma.$transaction(
            sortedUpdates.map(({ id }, index) =>
                prisma.property.update({
                    where: { id },
                    data: { displayOrder: index + 1 }
                })
            )
        );

        // Invalidate property list cache
        await clearCachePattern('properties:list:*');

        res.json({ success: true, message: 'Property order updated successfully' });
    } catch (error) {
        logger.error('Update property order error:', error);
        res.status(500).json({ error: 'Failed to update property order' });
    }
};

// Move a single property to a deterministic position or action (top, bottom, up, down, set)
export const movePropertyOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { action, targetPosition } = req.body;
        const userRole = req.user?.role;

        if (userRole !== 'admin') {
            res.status(403).json({ error: 'Only admins can reorder properties' });
            return;
        }

        // Run reordering inside a single transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch all properties sorted by current displayOrder, createdAt
            const allProperties = await tx.property.findMany({
                select: { id: true, displayOrder: true },
                orderBy: [
                    { displayOrder: 'asc' },
                    { createdAt: 'desc' },
                ],
            });

            const currentIndex = allProperties.findIndex((p) => p.id === id);
            if (currentIndex === -1) {
                return null;
            }

            const total = allProperties.length;
            let newIndex = currentIndex;

            if (action === 'top' || targetPosition === 1) {
                newIndex = 0;
            } else if (action === 'bottom' || targetPosition === total) {
                newIndex = total - 1;
            } else if (action === 'up') {
                newIndex = Math.max(0, currentIndex - 1);
            } else if (action === 'down') {
                newIndex = Math.min(total - 1, currentIndex + 1);
            } else if (targetPosition !== undefined && targetPosition >= 1) {
                newIndex = Math.max(0, Math.min(total - 1, targetPosition - 1));
            }

            // Move the element in the array
            const reordered = [...allProperties];
            const [movedItem] = reordered.splice(currentIndex, 1);
            reordered.splice(newIndex, 0, movedItem);

            // Normalize displayOrder from 1 to N and prepare updates
            const updatePromises: Promise<any>[] = [];
            const updatedItems: { id: string; displayOrder: number }[] = [];

            for (let i = 0; i < reordered.length; i++) {
                const normalizedPosition = i + 1;
                const prop = reordered[i];
                updatedItems.push({ id: prop.id, displayOrder: normalizedPosition });

                if (prop.displayOrder !== normalizedPosition) {
                    updatePromises.push(
                        tx.property.update({
                            where: { id: prop.id },
                            data: { displayOrder: normalizedPosition },
                        })
                    );
                }
            }

            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
            }

            return {
                id,
                oldPosition: currentIndex + 1,
                newPosition: newIndex + 1,
                totalProperties: total,
                updates: updatedItems,
            };
        });

        if (!result) {
            res.status(404).json({ error: 'Property not found' });
            return;
        }

        // Invalidate cache
        await clearCachePattern('properties:list:*');
        await deleteCache(`properties:detail:${id}`);

        res.json({
            success: true,
            message: `Property moved from #${result.oldPosition} to #${result.newPosition}`,
            data: result,
        });
    } catch (error) {
        logger.error('Move property order error:', error);
        res.status(500).json({ error: 'Failed to move property order' });
    }
};

