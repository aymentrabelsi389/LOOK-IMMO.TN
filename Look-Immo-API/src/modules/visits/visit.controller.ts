import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../core/database/prisma';
import { asyncHandler, BadRequestError, NotFoundError } from '../../core/errors';
import { CreateVisitDTO } from './visit.schema';

// Get all visits
export const getVisits = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
});

// Get single visit
export const getVisit = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
        throw new NotFoundError('Visit not found');
    }

    res.json(visit);
});

// Create visit
export const createVisit = asyncHandler(async (req: AuthRequest & { body: CreateVisitDTO }, res: Response): Promise<void> => {
    const { visitorName, idCard, propertyId, date, notes } = req.body;
    const userId = req.user?.id;

    if (!visitorName || !idCard || !propertyId || !date || !userId) {
        throw new BadRequestError('Visitor name, ID card, property, and date are required');
    }

    // Verify property exists
    const property = await prisma.property.findUnique({
        where: { id: propertyId },
    });

    if (!property) {
        throw new NotFoundError('Property not found');
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
});

// Delete visit
export const deleteVisit = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const visit = await prisma.visit.findUnique({
        where: { id },
    });

    if (!visit) {
        throw new NotFoundError('Visit not found');
    }

    await prisma.visit.delete({
        where: { id },
    });

    res.json({ message: 'Visit deleted successfully' });
});
