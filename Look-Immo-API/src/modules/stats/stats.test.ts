import { bufferVisit, flushVisitBuffer } from './stats.service';
import { redisClient } from '../../core/cache/redis';
import { prisma } from '../../core/database/prisma';

jest.mock('../../core/database/prisma', () => ({
    prisma: {
        websiteVisit: {
            create: jest.fn(),
            createMany: jest.fn(),
        },
    },
}));

jest.mock('../../core/cache/redis', () => ({
    redisClient: {
        isOpen: true,
        rPush: jest.fn(),
        lLen: jest.fn(),
        lPopCount: jest.fn(),
    },
}));

describe('stats.service Website Visits Redis Buffer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should buffer visits into Redis list when Redis is open', async () => {
        (redisClient as any).isOpen = true;
        (redisClient.rPush as jest.Mock).mockResolvedValue(1);

        await bufferVisit({
            ip: '197.1.2.3',
            userAgent: 'Mozilla/5.0',
            path: '/property/123',
        });

        expect(redisClient.rPush).toHaveBeenCalledWith(
            'analytics:visits:buffer',
            expect.stringContaining('"ip":"197.1.2.3"')
        );
        expect(prisma.websiteVisit.create).not.toHaveBeenCalled();
    });

    it('should fallback to direct DB insert when Redis is closed', async () => {
        (redisClient as any).isOpen = false;

        await bufferVisit({
            ip: '197.1.2.3',
            userAgent: 'Mozilla/5.0',
            path: '/listings',
        });

        expect(prisma.websiteVisit.create).toHaveBeenCalledWith({
            data: {
                ip: '197.1.2.3',
                userAgent: 'Mozilla/5.0',
                path: '/listings',
            },
        });
    });

    it('should flush buffered visits from Redis to PostgreSQL using createMany in batch', async () => {
        (redisClient as any).isOpen = true;
        (redisClient.lLen as jest.Mock).mockResolvedValue(2);
        (redisClient.lPopCount as jest.Mock).mockResolvedValue([
            JSON.stringify({ ip: '1.1.1.1', userAgent: 'Bot', path: '/', createdAt: '2026-09-26T10:00:00.000Z' }),
            JSON.stringify({ ip: '2.2.2.2', userAgent: 'Chrome', path: '/property/1', createdAt: '2026-09-26T10:01:00.000Z' }),
        ]);
        (prisma.websiteVisit.createMany as jest.Mock).mockResolvedValue({ count: 2 });

        const count = await flushVisitBuffer();

        expect(count).toBe(2);
        expect(prisma.websiteVisit.createMany).toHaveBeenCalledWith({
            data: [
                { ip: '1.1.1.1', userAgent: 'Bot', path: '/', createdAt: new Date('2026-09-26T10:00:00.000Z') },
                { ip: '2.2.2.2', userAgent: 'Chrome', path: '/property/1', createdAt: new Date('2026-09-26T10:01:00.000Z') },
            ],
            skipDuplicates: true,
        });
    });

    it('should return 0 when buffer is empty', async () => {
        (redisClient as any).isOpen = true;
        (redisClient.lLen as jest.Mock).mockResolvedValue(0);

        const count = await flushVisitBuffer();

        expect(count).toBe(0);
        expect(prisma.websiteVisit.createMany).not.toHaveBeenCalled();
    });
});
