import { createProperty } from './propertyController';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { clearCachePattern } from '../utils/redis';
import { createNotification, checkPropertyMatchesAndNotify } from '../services/notificationService';

jest.mock('../utils/prisma', () => ({
    prisma: {
        property: {
            create: jest.fn(),
        },
    },
}));

jest.mock('../utils/redis', () => ({
    getCache: jest.fn(),
    setCache: jest.fn(),
    deleteCache: jest.fn(),
    clearCachePattern: jest.fn(),
}));

jest.mock('../services/notificationService', () => ({
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
