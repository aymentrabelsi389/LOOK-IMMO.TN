"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVisit = exports.createVisit = exports.getVisit = exports.getVisits = void 0;
const prisma_1 = require("../utils/prisma");
// Get all visits
const getVisits = async (req, res) => {
    try {
        const { propertyId, userId, search } = req.query;
        const visits = await prisma_1.prisma.visit.findMany({
            where: {
                ...(propertyId ? { propertyId: propertyId } : {}),
                ...(userId ? { userId: userId } : {}),
                ...(search
                    ? {
                        OR: [
                            { visitorName: { contains: search, mode: 'insensitive' } },
                            { idCard: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            include: {
                property: {
                    select: { id: true, title: true, city: true },
                },
                user: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { date: 'desc' },
        });
        res.json(visits);
    }
    catch (error) {
        console.error('Get visits error:', error);
        res.status(500).json({ error: 'Failed to get visits' });
    }
};
exports.getVisits = getVisits;
// Get single visit
const getVisit = async (req, res) => {
    try {
        const { id } = req.params;
        const visit = await prisma_1.prisma.visit.findUnique({
            where: { id },
            include: {
                property: {
                    select: { id: true, title: true, city: true, price: true },
                },
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        if (!visit) {
            res.status(404).json({ error: 'Visit not found' });
            return;
        }
        res.json(visit);
    }
    catch (error) {
        console.error('Get visit error:', error);
        res.status(500).json({ error: 'Failed to get visit' });
    }
};
exports.getVisit = getVisit;
// Create visit
const createVisit = async (req, res) => {
    try {
        const { visitorName, idCard, propertyId, date, notes } = req.body;
        const userId = req.user?.id;
        if (!visitorName || !idCard || !propertyId || !date || !userId) {
            res.status(400).json({ error: 'Visitor name, ID card, property, and date are required' });
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
        const visit = await prisma_1.prisma.visit.create({
            data: {
                visitorName,
                idCard,
                propertyId,
                userId,
                date: new Date(date),
                notes,
            },
            include: {
                property: {
                    select: { id: true, title: true, city: true },
                },
                user: {
                    select: { id: true, name: true },
                },
            },
        });
        res.status(201).json(visit);
    }
    catch (error) {
        console.error('Create visit error:', error);
        res.status(500).json({ error: 'Failed to create visit' });
    }
};
exports.createVisit = createVisit;
// Delete visit
const deleteVisit = async (req, res) => {
    try {
        const { id } = req.params;
        const visit = await prisma_1.prisma.visit.findUnique({
            where: { id },
        });
        if (!visit) {
            res.status(404).json({ error: 'Visit not found' });
            return;
        }
        await prisma_1.prisma.visit.delete({
            where: { id },
        });
        res.json({ message: 'Visit deleted successfully' });
    }
    catch (error) {
        console.error('Delete visit error:', error);
        res.status(500).json({ error: 'Failed to delete visit' });
    }
};
exports.deleteVisit = deleteVisit;
//# sourceMappingURL=visitController.js.map