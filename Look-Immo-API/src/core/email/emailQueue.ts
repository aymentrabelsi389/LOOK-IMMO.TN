import { redisClient } from '../cache/redis';
import { logger } from '../logger/logger';
import { sendMailDirect } from './emailService';

export const EMAIL_QUEUE_KEY = 'queue:emails';
export const EMAIL_DEAD_LETTER_KEY = 'queue:emails:dead';

export interface EmailJob {
    id: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
    attempts: number;
    maxAttempts: number;
    createdAt: string;
    nextRetryAt?: number;
}

let isWorkerRunning = false;
let workerTimeout: NodeJS.Timeout | null = null;

/**
 * Push an email job into the Redis background queue.
 * If Redis is offline, falls back to non-blocking background direct sending.
 */
export const enqueueEmail = async (params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
    maxAttempts?: number;
}): Promise<string> => {
    const job: EmailJob = {
        id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        from: params.from,
        attempts: 0,
        maxAttempts: params.maxAttempts || 3,
        createdAt: new Date().toISOString(),
    };

    if (redisClient.isOpen && redisClient.isReady) {
        try {
            await redisClient.rPush(EMAIL_QUEUE_KEY, JSON.stringify(job));
            logger.debug(`[EMAIL QUEUE] Enqueued job ${job.id} for ${job.to}`);
            return job.id;
        } catch (err) {
            logger.warn(`[EMAIL QUEUE] Failed to push job ${job.id} to Redis, falling back to background direct sending:`, err);
        }
    }

    // Fallback: asynchronous direct sending without blocking the HTTP caller
    setImmediate(async () => {
        try {
            await sendMailDirect({
                to: job.to,
                subject: job.subject,
                html: job.html,
                text: job.text,
                from: job.from,
            });
        } catch (err) {
            logger.error(`[EMAIL QUEUE] Direct background fallback delivery failed for ${job.to}:`, err);
        }
    });

    return job.id;
};

/**
 * Process a single batch of emails from the Redis queue.
 * Returns number of jobs processed.
 */
export const processEmailQueueBatch = async (batchSize = 5): Promise<number> => {
    if (!redisClient.isOpen || !redisClient.isReady) return 0;

    let processedCount = 0;

    for (let i = 0; i < batchSize; i++) {
        try {
            if (!redisClient.isOpen || !redisClient.isReady) break;
            const raw = await redisClient.lPop(EMAIL_QUEUE_KEY);
            if (!raw) break;

            let job: EmailJob;
            try {
                job = JSON.parse(raw);
            } catch {
                logger.error('[EMAIL QUEUE] Malformed email job in queue, discarded:', raw);
                continue;
            }

            // If job has a retry delay and is not yet ready, push it back
            if (job.nextRetryAt && Date.now() < job.nextRetryAt) {
                await redisClient.rPush(EMAIL_QUEUE_KEY, JSON.stringify(job));
                continue;
            }

            job.attempts += 1;

            try {
                await sendMailDirect({
                    to: job.to,
                    subject: job.subject,
                    html: job.html,
                    text: job.text,
                    from: job.from,
                });
                logger.info(`[EMAIL QUEUE] Job ${job.id} delivered to ${job.to} (attempt ${job.attempts}/${job.maxAttempts})`);
                processedCount++;
            } catch (sendErr) {
                logger.warn(`[EMAIL QUEUE] Job ${job.id} delivery failed (attempt ${job.attempts}/${job.maxAttempts}):`, sendErr);

                if (job.attempts < job.maxAttempts) {
                    // Exponential backoff: 2s, 6s, 18s...
                    job.nextRetryAt = Date.now() + Math.pow(3, job.attempts) * 1000;
                    await redisClient.rPush(EMAIL_QUEUE_KEY, JSON.stringify(job));
                } else {
                    logger.error(`[EMAIL QUEUE] Job ${job.id} exhausted max retries (${job.maxAttempts}). Moved to dead-letter queue.`);
                    await redisClient.rPush(EMAIL_DEAD_LETTER_KEY, JSON.stringify({
                        ...job,
                        failedAt: new Date().toISOString(),
                        lastError: sendErr instanceof Error ? sendErr.message : String(sendErr),
                    }));
                }
            }
        } catch (queueErr) {
            if (redisClient.isOpen && redisClient.isReady) {
                logger.error('[EMAIL QUEUE] Error during queue processing cycle:', queueErr);
            }
            break;
        }
    }

    return processedCount;
};

/**
 * Start the background worker loop that processes email jobs.
 */
export const startEmailQueueWorker = (pollIntervalMs = 1500): void => {
    if (isWorkerRunning) return;
    isWorkerRunning = true;

    const runWorker = async () => {
        if (!isWorkerRunning) return;

        try {
            await processEmailQueueBatch();
        } catch (err) {
            logger.error('[EMAIL QUEUE] Worker error:', err);
        } finally {
            if (isWorkerRunning) {
                workerTimeout = setTimeout(runWorker, pollIntervalMs);
            }
        }
    };

    workerTimeout = setTimeout(runWorker, pollIntervalMs);
    logger.info('[EMAIL QUEUE] Background email queue worker started.');
};

/**
 * Stop the background worker loop gracefully.
 */
export const stopEmailQueueWorker = (): void => {
    isWorkerRunning = false;
    if (workerTimeout) {
        clearTimeout(workerTimeout);
        workerTimeout = null;
    }
    logger.info('[EMAIL QUEUE] Background email queue worker stopped.');
};
