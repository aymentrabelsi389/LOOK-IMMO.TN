import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';

// Get all visits
export const getVisits = async (req: Request, res: Response): Promise<void> => {
    try {
        const { propertyId, userId, search } = req.query;

        const visits = await prisma.visit.findMany({
            where: {
                ...(propertyId ? { propertyId: propertyId as string } : {}),
                ...(userId ? { userId: userId as string } : {}),
                ...(search
                    ? {
                        OR: [
                            { visitorName: { contains: search as string, mode: 'insensitive' } },
                            { idCard: { contains: search as string, mode: 'insensitive' } },
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
    } catch (error) {
        console.error('Get visits error:', error);
        res.status(500).json({ error: 'Failed to get visits' });
    }
};

// Get single visit
export const getVisit = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const visit = await prisma.visit.findUnique({
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
    } catch (error) {
        console.error('Get visit error:', error);
        res.status(500).json({ error: 'Failed to get visit' });
    }
};

// Create visit
export const createVisit = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { visitorName, idCard, propertyId, date, notes } = req.body;
        const userId = req.user?.id;

        if (!visitorName || !idCard || !propertyId || !date || !userId) {
            res.status(400).json({ error: 'Visitor name, ID card, property, and date are required' });
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

        const visit = await prisma.visit.create({
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
    } catch (error) {
        console.error('Create visit error:', error);
        res.status(500).json({ error: 'Failed to create visit' });
    }
};

// Delete visit
export const deleteVisit = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const visit = await prisma.visit.findUnique({
            where: { id },
        });

        if (!visit) {
            res.status(404).json({ error: 'Visit not found' });
            return;
        }

        await prisma.visit.delete({
            where: { id },
        });

        res.json({ message: 'Visit deleted successfully' });
    } catch (error) {
        console.error('Delete visit error:', error);
        res.status(500).json({ error: 'Failed to delete visit' });
    }
};
