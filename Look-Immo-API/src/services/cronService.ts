import cron from 'node-cron';
import { prisma } from '../utils/prisma';
import { createNotification } from './notificationService';
import { logger } from '../utils/logger';

export const checkTodayVisitsAndNotify = async () => {
    try {
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        
        const todayEnd = new Date();
        todayEnd.setUTCHours(23, 59, 59, 999);

        // Count today's scheduled visits (accepted or pending appointments)
        const count = await prisma.appointment.count({
            where: {
                date: {
                    gte: todayStart,
                    lte: todayEnd,
                },
                status: {
                    in: ['pending', 'accepted']
                }
            }
        });

        if (count > 0) {
            await createNotification({
                type: 'morning_reminder',
                title: "Visites d'aujourd'hui",
                message: `Vous avez ${count} visite(s) de biens programmée(s) aujourd'hui.`,
                icon: 'Calendar',
                link: '/dashboard', // Link points to dashboard where "Prochains Rendez-vous" is rendered
                userId: null, // General admin notification
                metadata: { count }
            });
            logger.info(`Morning reminder notification sent with ${count} visits.`);
        } else {
            logger.info('No visits scheduled for today. Notification skipped.');
        }
    } catch (error) {
        logger.error('Failed to check today\'s visits:', error);
    }
};

export const initMorningReminderCron = () => {
    // Run every day at 08:00 morning
    cron.schedule('0 8 * * *', async () => {
        logger.info('Running daily morning reminder cron job');
        await checkTodayVisitsAndNotify();
    });
};

export const cleanupExpiredRefreshTokens = async () => {
    try {
        const result = await prisma.refreshToken.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
        if (result.count > 0) {
            logger.info(`Cleaned up ${result.count} expired refresh token(s).`);
        }
    } catch (error) {
        logger.error('Failed to clean up expired refresh tokens:', error);
    }
};

export const initRefreshTokenCleanupCron = () => {
    // Run every day at 03:00 — expired-but-unused RefreshToken rows
    // accumulate indefinitely otherwise (rotation/reuse-detection only
    // deletes tokens on explicit logout/refresh/reset, not on plain expiry).
    cron.schedule('0 3 * * *', async () => {
        logger.info('Running refresh token cleanup cron job');
        await cleanupExpiredRefreshTokens();
    });
};
