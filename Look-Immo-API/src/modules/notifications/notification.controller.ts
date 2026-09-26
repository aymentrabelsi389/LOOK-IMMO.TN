import { Request, Response } from 'express';
import { prisma } from '../../core/database/prisma';
import { asyncHandler, NotFoundError } from '../../core/errors';

// Get all notifications (with pagination and filters)
export const getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
});

// Get unread count
export const getUnreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const count = await prisma.notification.count({
        where: { read: false },
    });

    res.json({ count });
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const notification = await prisma.notification.update({
        where: { id },
        data: { read: true },
    });

    res.json(notification);
});

// Mark all as read
export const markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await prisma.notification.updateMany({
        where: { read: false },
        data: { read: true },
    });

    res.json({ message: 'All notifications marked as read' });
});

// Delete notification
export const deleteNotification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    await prisma.notification.delete({
        where: { id },
    });

    res.json({ message: 'Notification deleted successfully' });
});

// Delete all read notifications
export const deleteReadNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await prisma.notification.deleteMany({
        where: { read: true },
    });

    res.json({ message: `Deleted ${result.count} notifications` });
});

// Delete all notifications
export const deleteAllNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await prisma.notification.deleteMany({});
    res.json({ message: 'All notifications deleted successfully' });
});
