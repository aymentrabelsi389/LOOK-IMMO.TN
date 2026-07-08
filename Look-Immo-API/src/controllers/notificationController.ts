import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// Get all notifications (with pagination and filters)
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const { filter, page = '1', limit = '20' } = req.query;
        const p = parseInt(page as string) || 1;
        const l = parseInt(limit as string) || 20;
        const skip = (p - 1) * l;

        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        const where: any = {
            ...(filter === 'unread' ? { read: false } : {}),
            ...(filter === 'today' ? { createdAt: { gte: todayStart } } : {}),
            ...(filter === 'week' ? { createdAt: { gte: weekStart } } : {}),
        };

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: l,
            }),
            prisma.notification.count({ where })
        ]);

        res.json({
            notifications,
            total,
            page: p,
            limit: l,
            totalPages: Math.ceil(total / l),
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
};

// Get unread count
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
        const count = await prisma.notification.count({
            where: { read: false },
        });

        res.json({ count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const notification = await prisma.notification.update({
            where: { id },
            data: { read: true },
        });

        res.json(notification);
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

// Mark all as read
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        await prisma.notification.updateMany({
            where: { read: false },
            data: { read: true },
        });

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
};

// Delete notification
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        await prisma.notification.delete({
            where: { id },
        });

        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};

// Delete all read notifications
export const deleteReadNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await prisma.notification.deleteMany({
            where: { read: true },
        });

        res.json({ message: `Deleted ${result.count} notifications` });
    } catch (error) {
        console.error('Delete read notifications error:', error);
        res.status(500).json({ error: 'Failed to delete read notifications' });
    }
};

// Delete all notifications
export const deleteAllNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        await prisma.notification.deleteMany({});
        res.json({ message: 'All notifications deleted successfully' });
    } catch (error) {
        console.error('Delete all notifications error:', error);
        res.status(500).json({ error: 'Failed to delete all notifications' });
    }
};
