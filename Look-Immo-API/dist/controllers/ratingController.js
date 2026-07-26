"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRating = exports.createRating = exports.getRating = exports.getRatings = void 0;
const redis_1 = require("../utils/redis");
const prisma_1 = require("../utils/prisma");
const notificationService_1 = require("../services/notificationService");
const logger_1 = require("../utils/logger");
// Get all ratings
const getRatings = async (req, res) => {
    try {
        const { propertyId, minStars } = req.query;
        const ratings = await prisma_1.prisma.rating.findMany({
            where: {
                ...(propertyId ? { propertyId: propertyId } : {}),
                ...(minStars ? { stars: { gte: parseInt(minStars) } } : {}),
            },
            include: {
                property: {
                    select: { id: true, title: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(ratings);
    }
    catch (error) {
        logger_1.logger.error('Get ratings error:', error);
        res.status(500).json({ error: 'Failed to get ratings' });
    }
};
exports.getRatings = getRatings;
// Get single rating
const getRating = async (req, res) => {
    try {
        const { id } = req.params;
        const rating = await prisma_1.prisma.rating.findUnique({
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
    }
    catch (error) {
        logger_1.logger.error('Get rating error:', error);
        res.status(500).json({ error: 'Failed to get rating' });
    }
};
exports.getRating = getRating;
// Create rating
const createRating = async (req, res) => {
    try {
        const { userName, propertyId, stars, comment } = req.body;
        // Only trust the server-verified identity (set by optionalAuth from a
        // valid JWT) — never a client-supplied userId, which would let an
        // unauthenticated caller attribute or overwrite a rating as anyone.
        const verifiedUserId = req.user?.id || null;
        if (!userName || !propertyId || !stars) {
            res.status(400).json({ error: 'User name, property, and stars are required' });
            return;
        }
        if (stars < 1 || stars > 5) {
            res.status(400).json({ error: 'Stars must be between 1 and 5' });
            return;
        }
        // Verify property exists
        const property = await prisma_1.prisma.property.findUnique({
            where: { id: propertyId },
        });
        if (!property) {
            res.status(404).json({ error: 'Property not found' });
            return;
        }
        // Check if an existing rating by this (verified) user exists
        let existingRating = null;
        if (verifiedUserId) {
            existingRating = await prisma_1.prisma.rating.findFirst({
                where: { propertyId, userId: verifiedUserId }
            });
        }
        // Fallback to name only when the caller is anonymous (no verified
        // identity) — anonymous ratings under the same display name are
        // treated as edits from the same person, same as before.
        if (!existingRating && !verifiedUserId && userName) {
            existingRating = await prisma_1.prisma.rating.findFirst({
                where: { propertyId, userName, userId: null }
            });
        }
        let rating;
        if (existingRating) {
            rating = await prisma_1.prisma.rating.update({
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
        }
        else {
            rating = await prisma_1.prisma.rating.create({
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
        await (0, redis_1.clearCachePattern)('properties:list:*');
        await (0, redis_1.deleteCache)(`properties:detail:${propertyId}`);
        res.status(201).json(rating);
        // Send new rating notification for admins
        try {
            await (0, notificationService_1.createNotification)({
                type: 'rating_new',
                title: 'Nouvel Avis',
                message: `Le bien "${rating.property.title}" a reçu un nouvel avis de ${rating.stars} étoiles de ${rating.userName}.`,
                icon: 'Star',
                link: `/property/${propertyId}`,
                userId: null,
                metadata: { ratingId: rating.id, propertyId }
            });
        }
        catch (notifErr) {
            logger_1.logger.error('Failed to create rating notification:', notifErr);
        }
    }
    catch (error) {
        logger_1.logger.error('Create rating error:', error);
        res.status(500).json({ error: 'Failed to create rating' });
    }
};
exports.createRating = createRating;
// Delete rating
const deleteRating = async (req, res) => {
    try {
        const { id } = req.params;
        const rating = await prisma_1.prisma.rating.findUnique({
            where: { id },
            include: { property: true },
        });
        if (!rating) {
            res.status(404).json({ error: 'Rating not found' });
            return;
        }
        await prisma_1.prisma.rating.delete({
            where: { id },
        });
        // Update denormalized aggregates on Property model
        await updatePropertyRatingFields(rating.propertyId);
        // Invalidate property cache since averageRating changes
        await (0, redis_1.clearCachePattern)('properties:list:*');
        await (0, redis_1.deleteCache)(`properties:detail:${rating.propertyId}`);
        // Create notification
        try {
            await prisma_1.prisma.notification.create({
                data: {
                    type: 'rating_delete', // Cast as any just in case it's missing in generated client
                    message: `Rating deleted: ${rating.stars} stars by ${rating.userName} for ${rating.property.title}`,
                    entityId: id,
                },
            });
        }
        catch (notifError) {
            logger_1.logger.error('Failed to create notification for rating deletion:', notifError);
            // Non-critical, continue with deletion success
        }
        res.json({ message: 'Rating deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Delete rating error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete rating' });
    }
};
exports.deleteRating = deleteRating;
// Helper to update denormalized rating fields on Property model
async function updatePropertyRatingFields(propertyId) {
    const aggregate = await prisma_1.prisma.rating.aggregate({
        where: { propertyId },
        _count: {
            stars: true
        },
        _avg: {
            stars: true
        }
    });
    await prisma_1.prisma.property.update({
        where: { id: propertyId },
        data: {
            averageRating: aggregate._avg.stars || 0,
            ratingsCount: aggregate._count.stars || 0
        }
    });
}
//# sourceMappingURL=ratingController.js.map