import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../core/database/prisma';
import { BadRequestError, asyncHandler } from '../../core/errors';
import { CreateDemandDTO, UpdateDemandDTO } from './demand.schema';

// Get all client demands
export const getClientDemands = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { status, type, contractType, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));

    const where = {
        ...(status && status !== 'all' ? { status: status as any } : {}),
        ...(type && type !== 'all' ? { type: type as any } : {}),
        ...(contractType && contractType !== 'all' ? { contractType: contractType as any } : {}),
        ...(search
            ? {
                OR: [
                    { clientName: { contains: search as string, mode: 'insensitive' as const } },
                    { phone: { contains: search as string, mode: 'insensitive' as const } },
                    { description: { contains: search as string, mode: 'insensitive' as const } },
                ],
            }
            : {}),
    };

    const [demands, total] = await Promise.all([
        prisma.clientDemand.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.clientDemand.count({ where }),
    ]);

    res.setHeader('X-Total-Count', String(total));
    res.json(demands);
});

// Create client demand
export const createClientDemand = asyncHandler(async (req: AuthRequest & { body: CreateDemandDTO }, res: Response): Promise<void> => {
    const { clientName, phone, description, location, type, contractType, budget, priority, status } = req.body;

    if (!clientName || !description || !location || !type) {
        throw new BadRequestError('Client name, description, location, and type are required');
    }

    const demand = await prisma.clientDemand.create({
        data: {
            clientName,
            phone: phone || null,
            description,
            location,
            type,
            contractType: contractType || 'sale',
            budget: budget ? (typeof budget === 'number' ? budget : parseFloat(budget)) : null,
            priority: priority || 'medium',
            status: status || 'searching',
        } as any,
    });

    res.status(201).json(demand);
});

// Update client demand
export const updateClientDemand = asyncHandler(async (req: AuthRequest & { body: UpdateDemandDTO }, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = { ...req.body };

    if (data.budget !== undefined && data.budget !== null) {
        data.budget = typeof data.budget === 'number' ? data.budget : parseFloat(data.budget);
    }

    const demand = await prisma.clientDemand.update({
        where: { id },
        data: data as any,
    });

    res.json(demand);
});

// Delete client demand
export const deleteClientDemand = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    await prisma.clientDemand.delete({
        where: { id },
    });

    res.json({ message: 'Client demand deleted successfully' });
});
