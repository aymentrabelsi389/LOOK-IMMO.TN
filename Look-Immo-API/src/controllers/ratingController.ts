import { Request, Response } from 'express';
import { deleteCache, clearCachePattern } from '../utils/redis';
import { prisma } from '../utils/prisma';

// Get all ratings
export const getRatings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { propertyId, minStars } = req.query;

        const ratings = await prisma.rating.findMany({
            where: {
                ...(propertyId ? { propertyId: propertyId as string } : {}),
                ...(minStars ? { stars: { gte: parseInt(minStars as string) } } : {}),
            },
            include: {
                property: {
                    select: { id: true, title: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(ratings);
    } catch (error) {
        console.error('Get ratings error:', error);
        res.status(500).json({ error: 'Failed to get ratings' });
    }
};

// Get single rating
export const getRating = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const rating = await prisma.rating.findUnique({
            where: { id },
            include: {
                property: {
                    select: { id: true, title: true },
                },
            },
        });

        if (!rating) {
            res.status(404).json({ error: 'Rating not found' });
            return;
        }

        res.json(rating);
    } catch (error) {
        console.error('Get rating error:', error);
        res.status(500).json({ error: 'Failed to get rating' });
    }
};

// Create rating
export const createRating = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userName, propertyId, stars, comment } = req.body;

        if (!userName || !propertyId || !stars) {
            res.status(400).json({ error: 'User name, property, and stars are required' });
            return;
        }

        if (stars < 1 || stars > 5) {
            res.status(400).json({ error: 'Stars must be between 1 and 5' });
            return;
        }

        // Verify property exists
        const property = await prisma.property.findUnique({
            where: { id: propertyId },
        });

        if (!property) {
            res.status(404).json({ error: 'Property not found' });
            return;
        }

        // Check if an existing rating by this user exists
        let existingRating = null;
        if (req.body.userId) {
            existingRating = await prisma.rating.findFirst({
                where: { propertyId, userId: req.body.userId }
            });
        }
        
        // Fallback to name if user ID was not reliably saved
        if (!existingRating && userName) {
            existingRating = await prisma.rating.findFirst({
                where: { propertyId, userName }
            });
        }

        let rating;
        if (existingRating) {
            rating = await prisma.rating.update({
                where: { id: existingRating.id },
                data: {
                    stars,
                    comment: comment !== undefined ? comment : existingRating.comment,
                    userId: req.body.userId || existingRating.userId,
                },
                include: {
                    property: { select: { id: true, title: true } },
                },
            });
        } else {
            rating = await prisma.rating.create({
                data: {
                    userName,
                    propertyId,
                    stars,
                    comment,
                    userId: req.body.userId || null,
                },
                include: {
                    property: { select: { id: true, title: true } },
                },
            });
        }

        // Update denormalized aggregates on Property model
        await updatePropertyRatingFields(propertyId);

        // Invalidate property cache since averageRating changes
        await clearCachePattern('properties:list:*');
        await deleteCache(`properties:detail:${propertyId}`);

        res.status(201).json(rating);
    } catch (error) {
        console.error('Create rating error:', error);
        res.status(500).json({ error: 'Failed to create rating' });
    }
};

// Delete rating
export const deleteRating = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const rating = await prisma.rating.findUnique({
            where: { id },
            include: { property: true },
        });

        if (!rating) {
            res.status(404).json({ error: 'Rating not found' });
            return;
        }

        await prisma.rating.delete({
            where: { id },
        });

        // Update denormalized aggregates on Property model
        await updatePropertyRatingFields(rating.propertyId);

        // Invalidate property cache since averageRating changes
        await clearCachePattern('properties:list:*');
        await deleteCache(`properties:detail:${rating.propertyId}`);

        // Create notification
        try {
            await prisma.notification.create({
                data: {
                    type: 'rating_delete' as any, // Cast as any just in case it's missing in generated client
                    message: `Rating deleted: ${rating.stars} stars by ${rating.userName} for ${rating.property.title}`,
                    entityId: id,
                },
            });
        } catch (notifError) {
            console.error('Failed to create notification for rating deletion:', notifError);
            // Non-critical, continue with deletion success
        }

        res.json({ message: 'Rating deleted successfully' });
    } catch (error: any) {
        console.error('Delete rating error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete rating' });
    }
};

// Helper to update denormalized rating fields on Property model
async function updatePropertyRatingFields(propertyId: string): Promise<void> {
    const aggregate = await prisma.rating.aggregate({
        where: { propertyId },
        _count: {
            stars: true
        },
        _avg: {
            stars: true
        }
    });

    await prisma.property.update({
        where: { id: propertyId },
        data: {
            averageRating: aggregate._avg.stars || 0,
            ratingsCount: aggregate._count.stars || 0
        } as any
    });
}
