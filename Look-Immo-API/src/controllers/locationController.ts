import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { createNotification } from '../services/notificationService';
import { logger } from '../utils/logger';

// Get all locations
export const getLocations = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search } = req.query;

        const locations = await prisma.location.findMany({
            where: search
                ? {
                    name: { contains: search as string, mode: 'insensitive' as any },
                }
                : {},
            orderBy: { displayOrder: 'asc' },
        });

        res.json(locations);
    } catch (error) {
        logger.error('Get locations error:', error);
        res.status(500).json({ error: 'Failed to get locations' });
    }
};

// Get single location
export const getLocation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const location = await prisma.location.findUnique({
            where: { id },
        });

        if (!location) {
            res.status(404).json({ error: 'Location not found' });
            return;
        }

        res.json(location);
    } catch (error) {
        logger.error('Get location error:', error);
        res.status(500).json({ error: 'Failed to get location' });
    }
};

// Create location
export const createLocation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, centerLat, centerLng, radius } = req.body;

        if (!name || centerLat === undefined || centerLng === undefined || radius === undefined) {
            res.status(400).json({ error: 'Name, centerLat, centerLng, and radius are required' });
            return;
        }

        const location = await prisma.location.create({
            data: {
                name,
                centerLat: parseFloat(centerLat),
                centerLng: parseFloat(centerLng),
                radius: parseFloat(radius),
            },
        });

        // Create notification
        try {
            await createNotification({
                type: 'location_add',
                title: 'Nouvelle Zone',
                message: `Nouvelle zone ajoutée : ${location.name}`,
                icon: 'MapPin',
                link: '/admin',
                userId: null,
                metadata: { locationId: location.id },
            });
        } catch (notifError) {
            logger.error('Failed to create location notification:', notifError);
        }

        res.status(201).json(location);
    } catch (error) {
        logger.error('Create location error:', error);
        res.status(500).json({ error: 'Failed to create location' });
    }
};

// Update location
export const updateLocation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, centerLat, centerLng, radius } = req.body;

        const existingLocation = await prisma.location.findUnique({
            where: { id },
        });

        if (!existingLocation) {
            res.status(404).json({ error: 'Location not found' });
            return;
        }

        const location = await prisma.location.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(centerLat !== undefined && { centerLat: parseFloat(centerLat) }),
                ...(centerLng !== undefined && { centerLng: parseFloat(centerLng) }),
                ...(radius !== undefined && { radius: parseFloat(radius) }),
            },
        });

        // Create notification
        try {
            await createNotification({
                type: 'location_edit',
                title: 'Zone Modifiée',
                message: `Zone mise à jour : ${location.name}`,
                icon: 'MapPin',
                link: '/admin',
                userId: null,
                metadata: { locationId: location.id },
            });
        } catch (notifError) {
            logger.error('Failed to create location update notification:', notifError);
        }

        res.json(location);
    } catch (error) {
        logger.error('Update location error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
};

// Delete location
export const deleteLocation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const location = await prisma.location.findUnique({
            where: { id },
        });

        if (!location) {
            res.status(404).json({ error: 'Location not found' });
            return;
        }

        await prisma.location.delete({
            where: { id },
        });

        // Create notification
        try {
            await createNotification({
                type: 'location_delete',
                title: 'Zone Supprimée',
                message: `Zone supprimée : ${location.name}`,
                icon: 'MapPin',
                link: '/admin',
                userId: null,
                metadata: { locationId: id },
            });
        } catch (notifError) {
            logger.error('Failed to create location delete notification:', notifError);
        }

        res.json({ message: 'Location deleted successfully' });
    } catch (error) {
        logger.error('Delete location error:', error);
        res.status(500).json({ error: 'Failed to delete location' });
    }
};

// Update location order (bulk)
export const updateLocationOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { updates }: { updates: { id: string; displayOrder: number }[] } = req.body;

        if (!updates || !Array.isArray(updates)) {
            res.status(400).json({ error: 'Invalid updates format' });
            return;
        }

        // Only admins can reorder properties
        if (req.user?.role !== 'admin') {
            res.status(403).json({ error: 'Only admins can reorder locations' });
            return;
        }

        // Use transaction for atomic bulk update
        await prisma.$transaction(
            updates.map(({ id, displayOrder }) =>
                prisma.location.update({
                    where: { id },
                    data: { displayOrder }
                })
            )
        );

        res.json({ success: true, message: 'Location order updated successfully' });
    } catch (error) {
        logger.error('Update location order error:', error);
        res.status(500).json({ error: 'Failed to update location order' });
    }
};
