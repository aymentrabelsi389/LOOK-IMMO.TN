"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRating = exports.createRating = exports.getRating = exports.getRatings = void 0;
const redis_1 = require("../utils/redis");
const prisma_1 = require("../utils/prisma");
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
        console.error('Get ratings error:', error);
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
        console.error('Get rating error:', error);
        res.status(500).json({ error: 'Failed to get rating' });
    }
};
exports.getRating = getRating;
// Create rating
const createRating = async (req, res) => {
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
        const property = await prisma_1.prisma.property.findUnique({
            where: { id: propertyId },
        });
        if (!property) {
            res.status(404).json({ error: 'Property not found' });
            return;
        }
        // Check if an existing rating by this user exists
        let existingRating = null;
        if (req.body.userId) {
            existingRating = await prisma_1.prisma.rating.findFirst({
                where: { propertyId, userId: req.body.userId }
            });
        }
        // Fallback to name if user ID was not reliably saved
        if (!existingRating && userName) {
            existingRating = await prisma_1.prisma.rating.findFirst({
                where: { propertyId, userName }
            });
        }
        let rating;
        if (existingRating) {
            rating = await prisma_1.prisma.rating.update({
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
        }
        else {
            rating = await prisma_1.prisma.rating.create({
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
        await (0, redis_1.clearCachePattern)('properties:list:*');
        await (0, redis_1.deleteCache)(`properties:detail:${propertyId}`);
        res.status(201).json(rating);
    }
    catch (error) {
        console.error('Create rating error:', error);
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
            console.error('Failed to create notification for rating deletion:', notifError);
            // Non-critical, continue with deletion success
        }
        res.json({ message: 'Rating deleted successfully' });
    }
    catch (error) {
        console.error('Delete rating error:', error);
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