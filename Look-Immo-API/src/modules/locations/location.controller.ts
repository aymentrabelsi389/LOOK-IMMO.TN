import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../core/database/prisma';
import { createNotification } from '../notifications/notification.service';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError } from '../../core/errors';
import { CreateLocationDTO, UpdateLocationDTO, ReorderLocationDTO } from './location.schema';

// Get all locations
export const getLocations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
});

// Get single location
export const getLocation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const location = await prisma.location.findUnique({
        where: { id },
    });

    if (!location) {
        throw new NotFoundError('Location not found');
    }

    res.json(location);
});

// Create location
export const createLocation = asyncHandler(async (req: Request<Record<string, never>, unknown, CreateLocationDTO>, res: Response): Promise<void> => {
    const { name, centerLat, centerLng, radius } = req.body;

    if (!name || centerLat === undefined || centerLng === undefined || radius === undefined) {
        throw new BadRequestError('Name, centerLat, centerLng, and radius are required');
    }

    const location = await prisma.location.create({
        data: {
            name,
            centerLat: typeof centerLat === 'number' ? centerLat : parseFloat(centerLat),
            centerLng: typeof centerLng === 'number' ? centerLng : parseFloat(centerLng),
            radius: typeof radius === 'number' ? radius : parseFloat(radius),
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
        // notification failures should not abort location creation
    }

    res.status(201).json(location);
});

// Update location
export const updateLocation = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateLocationDTO>, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, centerLat, centerLng, radius } = req.body;

    const existingLocation = await prisma.location.findUnique({
        where: { id },
    });

    if (!existingLocation) {
        throw new NotFoundError('Location not found');
    }

    const location = await prisma.location.update({
        where: { id },
        data: {
            ...(name && { name }),
            ...(centerLat !== undefined && { centerLat: typeof centerLat === 'number' ? centerLat : parseFloat(centerLat) }),
            ...(centerLng !== undefined && { centerLng: typeof centerLng === 'number' ? centerLng : parseFloat(centerLng) }),
            ...(radius !== undefined && { radius: typeof radius === 'number' ? radius : parseFloat(radius) }),
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
        // notification failures should not abort location update
    }

    res.json(location);
});

// Delete location
export const deleteLocation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const location = await prisma.location.findUnique({
        where: { id },
    });

    if (!location) {
        throw new NotFoundError('Location not found');
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
        // notification failures should not abort location delete
    }

    res.json({ message: 'Location deleted successfully' });
});

// Update location order (bulk)
export const updateLocationOrder = asyncHandler(async (req: AuthRequest & { body: ReorderLocationDTO }, res: Response): Promise<void> => {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
        throw new BadRequestError('Invalid updates format');
    }

    // Only admins can reorder properties
    if (req.user?.role !== 'admin') {
        throw new ForbiddenError('Only admins can reorder locations');
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
});
