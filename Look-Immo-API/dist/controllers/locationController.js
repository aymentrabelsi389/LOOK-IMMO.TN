"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLocationOrder = exports.deleteLocation = exports.updateLocation = exports.createLocation = exports.getLocation = exports.getLocations = void 0;
const prisma_1 = require("../utils/prisma");
// Get all locations
const getLocations = async (req, res) => {
    try {
        const { search } = req.query;
        const locations = await prisma_1.prisma.location.findMany({
            where: search
                ? {
                    name: { contains: search, mode: 'insensitive' },
                }
                : {},
            orderBy: { displayOrder: 'asc' },
        });
        res.json(locations);
    }
    catch (error) {
        console.error('Get locations error:', error);
        res.status(500).json({ error: 'Failed to get locations' });
    }
};
exports.getLocations = getLocations;
// Get single location
const getLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const location = await prisma_1.prisma.location.findUnique({
            where: { id },
        });
        if (!location) {
            res.status(404).json({ error: 'Location not found' });
            return;
        }
        res.json(location);
    }
    catch (error) {
        console.error('Get location error:', error);
        res.status(500).json({ error: 'Failed to get location' });
    }
};
exports.getLocation = getLocation;
// Create location
const createLocation = async (req, res) => {
    try {
        const { name, centerLat, centerLng, radius } = req.body;
        if (!name || centerLat === undefined || centerLng === undefined || !radius) {
            res.status(400).json({ error: 'Name, coordinates, and radius are required' });
            return;
        }
        const location = await prisma_1.prisma.location.create({
            data: {
                name,
                centerLat: parseFloat(centerLat),
                centerLng: parseFloat(centerLng),
                radius: parseFloat(radius),
            },
        });
        // Create notification
        await prisma_1.prisma.notification.create({
            data: {
                type: 'location_add',
                message: `New location added: ${location.name}`,
                entityId: location.id,
            },
        });
        res.status(201).json(location);
    }
    catch (error) {
        console.error('Create location error:', error);
        res.status(500).json({ error: 'Failed to create location' });
    }
};
exports.createLocation = createLocation;
// Update location
const updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, centerLat, centerLng, radius } = req.body;
        const existingLocation = await prisma_1.prisma.location.findUnique({
            where: { id },
        });
        if (!existingLocation) {
            res.status(404).json({ error: 'Location not found' });
            return;
        }
        const location = await prisma_1.prisma.location.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(centerLat !== undefined && { centerLat: parseFloat(centerLat) }),
                ...(centerLng !== undefined && { centerLng: parseFloat(centerLng) }),
                ...(radius !== undefined && { radius: parseFloat(radius) }),
            },
        });
        // Create notification
        await prisma_1.prisma.notification.create({
            data: {
                type: 'location_edit',
                message: `Location updated: ${location.name}`,
                entityId: location.id,
            },
        });
        res.json(location);
    }
    catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
};
exports.updateLocation = updateLocation;
// Delete location
const deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const location = await prisma_1.prisma.location.findUnique({
            where: { id },
        });
        if (!location) {
            res.status(404).json({ error: 'Location not found' });
            return;
        }
        await prisma_1.prisma.location.delete({
            where: { id },
        });
        // Create notification
        await prisma_1.prisma.notification.create({
            data: {
                type: 'location_delete',
                message: `Location deleted: ${location.name}`,
                entityId: id,
            },
        });
        res.json({ message: 'Location deleted successfully' });
    }
    catch (error) {
        console.error('Delete location error:', error);
        res.status(500).json({ error: 'Failed to delete location' });
    }
};
exports.deleteLocation = deleteLocation;
// Update location order (bulk)
const updateLocationOrder = async (req, res) => {
    try {
        const { updates } = req.body;
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
        await prisma_1.prisma.$transaction(updates.map(({ id, displayOrder }) => prisma_1.prisma.location.update({
            where: { id },
            data: { displayOrder }
        })));
        res.json({ success: true, message: 'Location order updated successfully' });
    }
    catch (error) {
        console.error('Update location order error:', error);
        res.status(500).json({ error: 'Failed to update location order' });
    }
};
exports.updateLocationOrder = updateLocationOrder;
//# sourceMappingURL=locationController.js.map