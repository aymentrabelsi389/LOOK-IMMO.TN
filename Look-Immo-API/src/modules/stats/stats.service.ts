import { redisClient } from '../../core/cache/redis';
import { prisma } from '../../core/database/prisma';
import { logger } from '../../core/logger/logger';

const VISITS_BUFFER_KEY = 'analytics:visits:buffer';

export interface VisitPayload {
    ip: string;
    userAgent?: string;
    path: string;
    createdAt?: Date | string;
}

/**
 * Push an incoming website visit into the Redis buffer for high-throughput batching.
 * Falls back to direct DB insert if Redis is offline.
 */
export const bufferVisit = async (visit: VisitPayload): Promise<void> => {
    try {
        if (redisClient.isOpen) {
            await redisClient.rPush(VISITS_BUFFER_KEY, JSON.stringify({
                ip: visit.ip,
                userAgent: visit.userAgent || null,
                path: visit.path || '/',
                createdAt: typeof visit.createdAt === 'string' ? visit.createdAt : (visit.createdAt ? visit.createdAt.toISOString() : new Date().toISOString()),
            }));
            return;
        }
    } catch (err) {
        logger.warn('[ANALYTICS] Failed to buffer visit in Redis, falling back to direct DB insert:', err);
    }

    // Direct database write fallback if Redis is unavailable
    try {
        await prisma.websiteVisit.create({
            data: {
                ip: visit.ip,
                userAgent: visit.userAgent || null,
                path: visit.path || '/',
            },
        });
    } catch (dbErr) {
        logger.error('[ANALYTICS] Direct DB insert fallback failed:', dbErr);
    }
};

/**
 * Flush all buffered website visits from Redis to PostgreSQL in a single batch insert.
 */
export const flushVisitBuffer = async (): Promise<number> => {
    if (!redisClient.isOpen) return 0;

    try {
        const len = await redisClient.lLen(VISITS_BUFFER_KEY);
        if (len === 0) return 0;

        // Pop up to 1000 items in a single batch
        const batchSize = Math.min(len, 1000);
        const rawItems = await redisClient.lPopCount(VISITS_BUFFER_KEY, batchSize);
        if (!rawItems || rawItems.length === 0) return 0;

        const visitsToInsert: Array<{ ip: string; userAgent: string | null; path: string; createdAt: Date }> = [];
        for (const item of rawItems) {
            try {
                const parsed = JSON.parse(item);
                visitsToInsert.push({
                    ip: parsed.ip,
                    userAgent: parsed.userAgent || null,
                    path: parsed.path || '/',
                    createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
                });
            } catch (parseErr) {
                logger.warn('[ANALYTICS] Skipping malformed visit buffer item:', parseErr);
            }
        }

        if (visitsToInsert.length > 0) {
            await prisma.websiteVisit.createMany({
                data: visitsToInsert,
                skipDuplicates: true,
            });
            logger.debug(`[ANALYTICS] Flushed ${visitsToInsert.length} visits to database.`);
        }

        return visitsToInsert.length;
    } catch (err) {
        logger.error('[ANALYTICS] Error flushing website visits buffer:', err);
        return 0;
    }
};
