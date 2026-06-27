"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReadNotifications = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getUnreadCount = exports.getNotifications = void 0;
const prisma_1 = require("../utils/prisma");
// Get all notifications
const getNotifications = async (req, res) => {
    try {
        const { type, read, limit } = req.query;
        const notifications = await prisma_1.prisma.notification.findMany({
            where: {
                ...(type ? { type: type } : {}),
                ...(read !== undefined ? { read: read === 'true' } : {}),
            },
            include: {
                user: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit ? parseInt(limit) : 50,
        });
        res.json(notifications);
    }
    catch (error) {
        console.error('Get notifications error:', error);
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
        console.error('Get unread count error:', error);
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
        console.error('Mark as read error:', error);
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
        console.error('Mark all as read error:', error);
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
        console.error('Delete notification error:', error);
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
        console.error('Delete read notifications error:', error);
        res.status(500).json({ error: 'Failed to delete read notifications' });
    }
};
exports.deleteReadNotifications = deleteReadNotifications;
//# sourceMappingURL=notificationController.js.map