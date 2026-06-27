import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';

// Get user's favorites
export const getFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
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
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: 'Failed to get favorites' });
    }
};

// Add to favorites
export const addFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { propertyId } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!propertyId) {
            res.status(400).json({ error: 'Property ID is required' });
            return;
        }

        const favorite = await prisma.favorite.create({
            data: { userId, propertyId },
            include: {
                property: true,
            },
        });

        res.status(201).json(favorite);
    } catch (error: any) {
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Already in favorites' });
            return;
        }
        if (error.code === 'P2003') {
            res.status(404).json({ error: 'Property not found' });
            return;
        }
        console.error('Add favorite error:', error);
        res.status(500).json({ error: 'Failed to add to favorites' });
    }
};

// Remove from favorites
export const removeFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { propertyId } = req.params;

        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        await prisma.favorite.delete({
            where: {
                userId_propertyId: { userId, propertyId },
            },
        });

        res.json({ message: 'Removed from favorites' });
    } catch (error: any) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Favorite not found' });
            return;
        }
        console.error('Remove favorite error:', error);
        res.status(500).json({ error: 'Failed to remove from favorites' });
    }
};

// Check if property is favorited
export const checkFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
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
    } catch (error) {
        console.error('Check favorite error:', error);
        res.status(500).json({ error: 'Failed to check favorite status' });
    }
};
