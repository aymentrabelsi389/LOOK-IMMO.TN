import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { deleteCache, clearCachePattern } from '../../core/cache/redis';
import { prisma } from '../../core/database/prisma';
import { createNotification } from '../notifications/notification.service';
import { logger } from '../../core/logger/logger';
import { asyncHandler, BadRequestError, NotFoundError } from '../../core/errors';
import { CreateRatingDTO } from './rating.schema';

// Get all ratings
export const getRatings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
});

// Get single rating
export const getRating = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
        throw new NotFoundError('Rating not found');
    }

    res.json(rating);
});

// Create rating
export const createRating = asyncHandler(async (req: AuthRequest & { body: CreateRatingDTO }, res: Response): Promise<void> => {
    const { userName, propertyId, stars, comment } = req.body;
    // Only trust the server-verified identity (set by optionalAuth from a
    // valid JWT) — never a client-supplied userId, which would let an
    // unauthenticated caller attribute or overwrite a rating as anyone.
    const verifiedUserId = req.user?.id || null;

    if (!userName || !propertyId || !stars) {
        throw new BadRequestError('User name, property, and stars are required');
    }

    if (stars < 1 || stars > 5) {
        throw new BadRequestError('Stars must be between 1 and 5');
    }

    // Verify property exists
    const property = await prisma.property.findUnique({
        where: { id: propertyId },
    });

    if (!property) {
        throw new NotFoundError('Property not found');
    }

    // Check if an existing rating by this (verified) user exists
    let existingRating = null;
    if (verifiedUserId) {
        existingRating = await prisma.rating.findFirst({
            where: { propertyId, userId: verifiedUserId }
        });
    }

    // Fallback to name only when the caller is anonymous (no verified
    // identity) — anonymous ratings under the same display name are
    // treated as edits from the same person, same as before.
    if (!existingRating && !verifiedUserId && userName) {
        existingRating = await prisma.rating.findFirst({
            where: { propertyId, userName, userId: null }
        });
    }

    let rating;
    if (existingRating) {
        rating = await prisma.rating.update({
            where: { id: existingRating.id },
            data: {
                stars,
                comment: comment !== undefined ? comment : existingRating.comment,
                userId: verifiedUserId || existingRating.userId,
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
                userId: verifiedUserId,
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

    // Send new rating notification for admins
    try {
        await createNotification({
            type: 'rating_new',
            title: 'Nouvel Avis',
            message: `Le bien "${rating.property.title}" a reçu un nouvel avis de ${rating.stars} étoiles de ${rating.userName}.`,
            icon: 'Star',
            link: `/property/${propertyId}`,
            userId: null,
            metadata: { ratingId: rating.id, propertyId }
        });
    } catch (notifErr) {
        logger.error('Failed to create rating notification:', notifErr);
    }
});

// Delete rating
export const deleteRating = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const rating = await prisma.rating.findUnique({
        where: { id },
        include: { property: true },
    });

    if (!rating) {
        throw new NotFoundError('Rating not found');
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
        await createNotification({
            type: 'rating_delete',
            title: 'Avis Supprimé',
            message: `Avis supprimé : ${rating.stars} étoiles par ${rating.userName} pour ${rating.property.title}`,
            icon: 'Star',
            link: `/property/${rating.propertyId}`,
            userId: null,
            metadata: { ratingId: id, propertyId: rating.propertyId },
        });
    } catch (notifError) {
        logger.error('Failed to create notification for rating deletion:', notifError);
        // Non-critical, continue with deletion success
    }

    res.json({ message: 'Rating deleted successfully' });
});

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
