import { createProperty } from './property.controller';
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../core/database/prisma';
import { clearCachePattern } from '../../core/cache/redis';
import { createNotification, checkPropertyMatchesAndNotify } from '../notifications/notification.service';

jest.mock('../../core/database/prisma', () => ({
    prisma: {
        property: {
            create: jest.fn(),
        },
    },
}));

jest.mock('../../core/cache/redis', () => ({
    getCache: jest.fn(),
    setCache: jest.fn(),
    deleteCache: jest.fn(),
    clearCachePattern: jest.fn(),
}));

jest.mock('../notifications/notification.service', () => ({
    createNotification: jest.fn(),
    checkPropertyMatchesAndNotify: jest.fn(),
}));

describe('propertyController createProperty', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            user: {
                id: 'owner-123',
                email: 'owner@example.com',
                role: 'agent',
            },
            body: {
                title: 'Beautiful Apartment',
                description: 'A beautiful apartment in Tunis',
                price: '250000',
                priceType: 'total',
                type: 'apartment',
                city: 'Tunis',
                zone: 'Lac 2',
                status: 'available',
                images: ['image1.jpg'],
                features: { rooms: 3 },
                category: 'apartment',
                isFeatured: true,
                isNew: true,
                isHotDeal: true,
                location: { lat: 36.8, lng: 10.2 },
            },
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    it('should successfully create a property without manual displayOrder calculation and call clearCachePattern', async () => {
        const mockCreatedProperty = {
            id: 'prop-123',
            title: 'Beautiful Apartment',
            description: 'A beautiful apartment in Tunis',
            price: 250000,
            priceType: 'total',
            type: 'apartment',
            city: 'Tunis',
            zone: 'Lac 2',
            status: 'available',
            images: ['image1.jpg'],
            features: { rooms: 3 },
            category: 'apartment',
            isFeatured: true,
            isNew: true,
            isHotDeal: true,
            latitude: 36.8,
            longitude: 10.2,
            ownerId: 'owner-123',
            displayOrder: 42, // returned by DB autoincrement
            owner: { id: 'owner-123', name: 'John Doe', email: 'owner@example.com' },
        };

        (prisma.property.create as jest.Mock).mockResolvedValue(mockCreatedProperty);

        await createProperty(mockReq as AuthRequest, mockRes as Response);

        // Verify prisma.property.create was called with the correct data structure, and without displayOrder!
        expect(prisma.property.create).toHaveBeenCalledWith({
            data: {
                title: 'Beautiful Apartment',
                description: 'A beautiful apartment in Tunis',
                price: 250000,
                priceType: 'total',
                type: 'apartment',
                city: 'Tunis',
                zone: 'Lac 2',
                status: 'available',
                images: ['image1.jpg'],
                features: { rooms: 3 },
                category: 'apartment',
                isFeatured: true,
                isNew: true,
                isHotDeal: true,
                ownerId: 'owner-123',
                ownerPhone: null,
                latitude: 36.8,
                longitude: 10.2,
            },
            include: {
                owner: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        // Verify notification service calls
        expect(createNotification).toHaveBeenCalledWith({
            type: 'property_add',
            title: 'Nouvelle Propriété',
            message: 'Une nouvelle propriété a été ajoutée : Beautiful Apartment',
            icon: 'Home',
            link: '/property/prop-123',
            userId: null,
            metadata: { propertyId: 'prop-123' },
        });
        expect(checkPropertyMatchesAndNotify).toHaveBeenCalledWith(mockCreatedProperty);

        // Verify cache invalidation call
        expect(clearCachePattern).toHaveBeenCalledWith('properties:list:*');

        // Verify response
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(mockCreatedProperty);
    });

    it('should return 400 if required fields are missing', async () => {
        mockReq.body.title = ''; // missing title

        await createProperty(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Title, price, type, and city are required' });
        expect(prisma.property.create).not.toHaveBeenCalled();
    });
});

describe('propertyController movePropertyOrder', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            user: {
                id: 'admin-123',
                email: 'admin@example.com',
                role: 'admin',
            },
            params: { id: 'prop-3' },
            body: { action: 'top' },
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    it('should reject non-admin users with 403', async () => {
        mockReq.user!.role = 'agent';
        const { movePropertyOrder } = require('./property.controller');
        await movePropertyOrder(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Only admins can reorder properties' });
    });

    it('should move property to top and normalize sequential displayOrders', async () => {
        const mockProps = [
            { id: 'prop-1', displayOrder: 1 },
            { id: 'prop-2', displayOrder: 2 },
            { id: 'prop-3', displayOrder: 3 },
            { id: 'prop-4', displayOrder: 4 },
        ];

        const mockTx = {
            property: {
                findMany: jest.fn().mockResolvedValue(mockProps),
                update: jest.fn().mockResolvedValue({}),
            },
        };

        (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async (cb) => {
            return cb(mockTx);
        });

        const { movePropertyOrder } = require('./property.controller');
        await movePropertyOrder(mockReq as AuthRequest, mockRes as Response);

        // Moving prop-3 to top means order becomes: prop-3 (1), prop-1 (2), prop-2 (3), prop-4 (4)
        expect(mockTx.property.update).toHaveBeenCalledWith({
            where: { id: 'prop-3' },
            data: { displayOrder: 1 },
        });
        expect(mockTx.property.update).toHaveBeenCalledWith({
            where: { id: 'prop-1' },
            data: { displayOrder: 2 },
        });
        expect(mockTx.property.update).toHaveBeenCalledWith({
            where: { id: 'prop-2' },
            data: { displayOrder: 3 },
        });

        expect(clearCachePattern).toHaveBeenCalledWith('properties:list:*');
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                oldPosition: 3,
                newPosition: 1,
                totalProperties: 4,
            }),
        }));
    });

    it('should move property to specific targetPosition (e.g. 5 -> 2)', async () => {
        mockReq.params = { id: 'prop-5' };
        mockReq.body = { targetPosition: 2 };

        const mockProps = [
            { id: 'prop-1', displayOrder: 1 },
            { id: 'prop-2', displayOrder: 2 },
            { id: 'prop-3', displayOrder: 3 },
            { id: 'prop-4', displayOrder: 4 },
            { id: 'prop-5', displayOrder: 5 },
        ];

        const mockTx = {
            property: {
                findMany: jest.fn().mockResolvedValue(mockProps),
                update: jest.fn().mockResolvedValue({}),
            },
        };

        (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async (cb) => {
            return cb(mockTx);
        });

        const { movePropertyOrder } = require('./property.controller');
        await movePropertyOrder(mockReq as AuthRequest, mockRes as Response);

        // prop-5 moved to position 2 -> prop-1 (1), prop-5 (2), prop-2 (3), prop-3 (4), prop-4 (5)
        expect(mockTx.property.update).toHaveBeenCalledWith({
            where: { id: 'prop-5' },
            data: { displayOrder: 2 },
        });
        expect(mockTx.property.update).toHaveBeenCalledWith({
            where: { id: 'prop-2' },
            data: { displayOrder: 3 },
        });
        expect(mockTx.property.update).toHaveBeenCalledWith({
            where: { id: 'prop-3' },
            data: { displayOrder: 4 },
        });
        expect(mockTx.property.update).toHaveBeenCalledWith({
            where: { id: 'prop-4' },
            data: { displayOrder: 5 },
        });

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                oldPosition: 5,
                newPosition: 2,
                totalProperties: 5,
            }),
        }));
    });
});

