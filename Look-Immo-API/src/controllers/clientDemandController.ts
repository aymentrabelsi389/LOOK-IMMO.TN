import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

// Get all client demands
export const getClientDemands = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status, type, search } = req.query;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));

        const where = {
            ...(status && status !== 'all' ? { status: status as any } : {}),
            ...(type && type !== 'all' ? { type: type as any } : {}),
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
    } catch (error) {
        logger.error('Get client demands error:', error);
        res.status(500).json({ error: 'Failed to get client demands' });
    }
};

// Create client demand
export const createClientDemand = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { clientName, phone, description, location, type, budget, priority, status } = req.body;

        if (!clientName || !description || !location || !type) {
            res.status(400).json({ error: 'Client name, description, location, and type are required' });
            return;
        }

        const demand = await prisma.clientDemand.create({
            data: {
                clientName,
                phone,
                description,
                location,
                type,
                budget: budget ? parseFloat(budget) : null,
                priority: priority || 'medium',
                status: status || 'searching',
            },
        });

        res.status(201).json(demand);
    } catch (error) {
        logger.error('Create client demand error:', error);
        res.status(500).json({ error: 'Failed to create client demand' });
    }
};

// Update client demand
export const updateClientDemand = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (data.budget) {
            data.budget = parseFloat(data.budget);
        }

        const demand = await prisma.clientDemand.update({
            where: { id },
            data,
        });

        res.json(demand);
    } catch (error) {
        logger.error('Update client demand error:', error);
        res.status(500).json({ error: 'Failed to update client demand' });
    }
};

// Delete client demand
export const deleteClientDemand = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        await prisma.clientDemand.delete({
            where: { id },
        });

        res.json({ message: 'Client demand deleted successfully' });
    } catch (error) {
        logger.error('Delete client demand error:', error);
        res.status(500).json({ error: 'Failed to delete client demand' });
    }
};
