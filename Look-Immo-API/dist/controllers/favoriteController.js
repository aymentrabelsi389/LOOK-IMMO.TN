"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkFavorite = exports.removeFavorite = exports.addFavorite = exports.getFavorites = void 0;
const prisma_1 = require("../utils/prisma");
const notificationService_1 = require("../services/notificationService");
const logger_1 = require("../utils/logger");
// Get user's favorites
const getFavorites = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const favorites = await prisma_1.prisma.favorite.findMany({
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
    }
    catch (error) {
        logger_1.logger.error('Get favorites error:', error);
        res.status(500).json({ error: 'Failed to get favorites' });
    }
};
exports.getFavorites = getFavorites;
// Add to favorites
const addFavorite = async (req, res) => {
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
        const favorite = await prisma_1.prisma.favorite.create({
            data: { userId, propertyId },
            include: {
                property: true,
            },
        });
        res.status(201).json(favorite);
        // Send favorite notification to admins/agents
        try {
            await (0, notificationService_1.createNotification)({
                type: 'wishlist_add',
                title: 'Bien Enregistré',
                message: `Le bien "${favorite.property.title}" a été ajouté aux favoris d'un utilisateur.`,
                icon: 'Heart',
                link: `/property/${propertyId}`,
                userId: null,
                metadata: { propertyId, userId }
            });
        }
        catch (notifErr) {
            logger_1.logger.error('Failed to create favorite notification:', notifErr);
        }
    }
    catch (error) {
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Already in favorites' });
            return;
        }
        if (error.code === 'P2003') {
            res.status(404).json({ error: 'Property not found' });
            return;
        }
        logger_1.logger.error('Add favorite error:', error);
        res.status(500).json({ error: 'Failed to add to favorites' });
    }
};
exports.addFavorite = addFavorite;
// Remove from favorites
const removeFavorite = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { propertyId } = req.params;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        await prisma_1.prisma.favorite.delete({
            where: {
                userId_propertyId: { userId, propertyId },
            },
        });
        res.json({ message: 'Removed from favorites' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Favorite not found' });
            return;
        }
        logger_1.logger.error('Remove favorite error:', error);
        res.status(500).json({ error: 'Failed to remove from favorites' });
    }
};
exports.removeFavorite = removeFavorite;
// Check if property is favorited
const checkFavorite = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { propertyId } = req.params;
        if (!userId) {
            res.json({ isFavorite: false });
            return;
        }
        const favorite = await prisma_1.prisma.favorite.findUnique({
            where: {
                userId_propertyId: { userId, propertyId },
            },
        });
        res.json({ isFavorite: !!favorite });
    }
    catch (error) {
        logger_1.logger.error('Check favorite error:', error);
        res.status(500).json({ error: 'Failed to check favorite status' });
    }
};
exports.checkFavorite = checkFavorite;
//# sourceMappingURL=favoriteController.js.map