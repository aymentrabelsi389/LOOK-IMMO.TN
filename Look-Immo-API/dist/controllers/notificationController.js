"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllNotifications = exports.deleteReadNotifications = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getUnreadCount = exports.getNotifications = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
// Get all notifications (with pagination and filters)
const getNotifications = async (req, res) => {
    try {
        const { filter, page = '1', limit = '20' } = req.query;
        const p = parseInt(page) || 1;
        const l = parseInt(limit) || 20;
        const skip = (p - 1) * l;
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const where = {
            ...(filter === 'unread' ? { read: false } : {}),
            ...(filter === 'today' ? { createdAt: { gte: todayStart } } : {}),
            ...(filter === 'week' ? { createdAt: { gte: weekStart } } : {}),
        };
        const [notifications, total] = await Promise.all([
            prisma_1.prisma.notification.findMany({
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
            prisma_1.prisma.notification.count({ where })
        ]);
        res.json({
            notifications,
            total,
            page: p,
            limit: l,
            totalPages: Math.ceil(total / l),
        });
    }
    catch (error) {
        logger_1.logger.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
};
exports.getNotifications = getNotifications;
// Get unread count
const getUnreadCount = async (req, res) => {
    try {
        const count = await prisma_1.prisma.notification.count({
            where: { read: false },
        });
        res.json({ count });
    }
    catch (error) {
        logger_1.logger.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
};
exports.getUnreadCount = getUnreadCount;
// Mark notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await prisma_1.prisma.notification.update({
            where: { id },
            data: { read: true },
        });
        res.json(notification);
    }
    catch (error) {
        logger_1.logger.error('Mark as read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};
exports.markAsRead = markAsRead;
// Mark all as read
const markAllAsRead = async (req, res) => {
    try {
        await prisma_1.prisma.notification.updateMany({
            where: { read: false },
            data: { read: true },
        });
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        logger_1.logger.error('Mark all as read error:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
};
exports.markAllAsRead = markAllAsRead;
// Delete notification
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.notification.delete({
            where: { id },
        });
        res.json({ message: 'Notification deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Delete notification error:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};
exports.deleteNotification = deleteNotification;
// Delete all read notifications
const deleteReadNotifications = async (req, res) => {
    try {
        const result = await prisma_1.prisma.notification.deleteMany({
            where: { read: true },
        });
        res.json({ message: `Deleted ${result.count} notifications` });
    }
    catch (error) {
        logger_1.logger.error('Delete read notifications error:', error);
        res.status(500).json({ error: 'Failed to delete read notifications' });
    }
};
exports.deleteReadNotifications = deleteReadNotifications;
// Delete all notifications
const deleteAllNotifications = async (req, res) => {
    try {
        await prisma_1.prisma.notification.deleteMany({});
        res.json({ message: 'All notifications deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Delete all notifications error:', error);
        res.status(500).json({ error: 'Failed to delete all notifications' });
    }
};
exports.deleteAllNotifications = deleteAllNotifications;
//# sourceMappingURL=notificationController.js.map