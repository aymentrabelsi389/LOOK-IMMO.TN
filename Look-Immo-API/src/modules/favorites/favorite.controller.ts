import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../core/database/prisma';
import { createNotification } from '../notifications/notification.service';
import { logger } from '../../core/logger/logger';
import { asyncHandler, BadRequestError, UnauthorizedError, NotFoundError, ConflictError } from '../../core/errors';

// Get user's favorites
export const getFavorites = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
        throw new UnauthorizedError('Authentication required');
    }

    const favorites = await prisma.favorite.findMany({
        where: { userId },
        include: {
            property: {
                include: {
                    owner: {
                        select: { id: true, name: true },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    res.json(favorites.map((f) => f.property));
});

// Add to favorites
export const addFavorite = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { propertyId } = req.body;

    if (!userId) {
        throw new UnauthorizedError('Authentication required');
    }

    if (!propertyId) {
        throw new BadRequestError('Property ID is required');
    }

    try {
        const favorite = await prisma.favorite.create({
            data: { userId, propertyId },
            include: {
                property: true,
            },
        });

        res.status(201).json(favorite);

        // Send favorite notification to admins/agents
        try {
            await createNotification({
                type: 'wishlist_add',
                title: 'Bien Enregistré',
                message: `Le bien "${favorite.property.title}" a été ajouté aux favoris d'un utilisateur.`,
                icon: 'Heart',
                link: `/property/${propertyId}`,
                userId: null,
                metadata: { propertyId, userId }
            });
        } catch (notifErr) {
            logger.error('Failed to create favorite notification:', notifErr);
        }
    } catch (error: any) {
        if (error.code === 'P2002') {
            throw new ConflictError('Already in favorites');
        }
        if (error.code === 'P2003') {
            throw new NotFoundError('Property not found');
        }
        throw error; // Re-throw unexpected errors for the global handler
    }
});

// Remove from favorites
export const removeFavorite = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { propertyId } = req.params;

    if (!userId) {
        throw new UnauthorizedError('Authentication required');
    }

    try {
        await prisma.favorite.delete({
            where: {
                userId_propertyId: { userId, propertyId },
            },
        });

        res.json({ message: 'Removed from favorites' });
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw new NotFoundError('Favorite not found');
        }
        throw error; // Re-throw unexpected errors for the global handler
    }
});

// Check if property is favorited
export const checkFavorite = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { propertyId } = req.params;

    if (!userId) {
        res.json({ isFavorite: false });
        return;
    }

    const favorite = await prisma.favorite.findUnique({
        where: {
            userId_propertyId: { userId, propertyId },
        },
    });

    res.json({ isFavorite: !!favorite });
});
