import {
    enqueueEmail,
    processEmailQueueBatch,
    EMAIL_QUEUE_KEY,
    EMAIL_DEAD_LETTER_KEY,
} from './emailQueue';
import { redisClient } from '../cache/redis';
import * as emailService from './emailService';

jest.mock('../cache/redis', () => ({
    redisClient: {
        isOpen: true,
        isReady: true,
        rPush: jest.fn(),
        lPop: jest.fn(),
    },
}));

jest.mock('./emailService', () => ({
    sendMailDirect: jest.fn(),
    sendResetCodeEmail: jest.requireActual('./emailService').sendResetCodeEmail,
}));

describe('Background Email Queue (emailQueue)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (redisClient as any).isOpen = true;
        (redisClient as any).isReady = true;
    });

    describe('enqueueEmail', () => {
        it('should push email job to Redis queue when Redis is connected', async () => {
            (redisClient.rPush as jest.Mock).mockResolvedValue(1);

            const jobId = await enqueueEmail({
                to: 'client@example.com',
                subject: 'Test Subject',
                html: '<p>Test</p>',
                text: 'Test',
            });

            expect(jobId).toMatch(/^email-/);
            expect(redisClient.rPush).toHaveBeenCalledWith(
                EMAIL_QUEUE_KEY,
                expect.stringContaining('"to":"client@example.com"')
            );
        });

        it('should fallback to non-blocking background direct delivery when Redis is offline', async () => {
            (redisClient as any).isOpen = false;
            (emailService.sendMailDirect as jest.Mock).mockResolvedValue(undefined);

            const jobId = await enqueueEmail({
                to: 'fallback@example.com',
                subject: 'Fallback Test',
                html: '<p>Fallback</p>',
            });

            expect(jobId).toMatch(/^email-/);
            expect(redisClient.rPush).not.toHaveBeenCalled();

            // Wait for next tick so setImmediate runs
            await new Promise((resolve) => setImmediate(resolve));

            expect(emailService.sendMailDirect).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'fallback@example.com',
                    subject: 'Fallback Test',
                })
            );
        });
    });

    describe('processEmailQueueBatch', () => {
        it('should pop jobs and send them via sendMailDirect', async () => {
            const mockJob = {
                id: 'email-123',
                to: 'user@example.com',
                subject: 'Password Reset',
                html: '<p>Code 123456</p>',
                attempts: 0,
                maxAttempts: 3,
                createdAt: new Date().toISOString(),
            };

            (redisClient.lPop as jest.Mock)
                .mockResolvedValueOnce(JSON.stringify(mockJob))
                .mockResolvedValueOnce(null);

            (emailService.sendMailDirect as jest.Mock).mockResolvedValue(undefined);

            const count = await processEmailQueueBatch(5);

            expect(count).toBe(1);
            expect(emailService.sendMailDirect).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'user@example.com',
                    subject: 'Password Reset',
                })
            );
        });

        it('should retry failed jobs with exponential backoff if attempts < maxAttempts', async () => {
            const mockJob = {
                id: 'email-456',
                to: 'retry@example.com',
                subject: 'Retry Subject',
                html: '<p>Retry</p>',
                attempts: 0,
                maxAttempts: 3,
                createdAt: new Date().toISOString(),
            };

            (redisClient.lPop as jest.Mock)
                .mockResolvedValueOnce(JSON.stringify(mockJob))
                .mockResolvedValueOnce(null);

            (emailService.sendMailDirect as jest.Mock).mockRejectedValueOnce(new Error('SMTP Connection timeout'));

            const count = await processEmailQueueBatch(5);

            expect(count).toBe(0);
            expect(redisClient.rPush).toHaveBeenCalledWith(
                EMAIL_QUEUE_KEY,
                expect.stringMatching(/"attempts":1/)
            );
        });

        it('should move exhausted jobs to dead-letter queue after maxAttempts exceeded', async () => {
            const mockJob = {
                id: 'email-789',
                to: 'failed@example.com',
                subject: 'Final Fail',
                html: '<p>Dead</p>',
                attempts: 2,
                maxAttempts: 3,
                createdAt: new Date().toISOString(),
            };

            (redisClient.lPop as jest.Mock)
                .mockResolvedValueOnce(JSON.stringify(mockJob))
                .mockResolvedValueOnce(null);

            (emailService.sendMailDirect as jest.Mock).mockRejectedValueOnce(new Error('550 User not found'));

            const count = await processEmailQueueBatch(5);

            expect(count).toBe(0);
            expect(redisClient.rPush).toHaveBeenCalledWith(
                EMAIL_DEAD_LETTER_KEY,
                expect.stringContaining('"lastError":"550 User not found"')
            );
        });
    });
});
