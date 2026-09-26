import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminOnly } from '../../middleware/roleGuard';
import * as notificationController from './notification.controller';

const router = Router();

router.get('/notifications', authMiddleware, adminOnly, notificationController.getNotifications);
router.get('/notifications/unread-count', authMiddleware, adminOnly, notificationController.getUnreadCount);
router.put('/notifications/mark-all-read', authMiddleware, adminOnly, notificationController.markAllAsRead);
router.put('/notifications/:id/read', authMiddleware, adminOnly, notificationController.markAsRead);
router.delete('/notifications/read', authMiddleware, adminOnly, notificationController.deleteReadNotifications);
router.delete('/notifications/all', authMiddleware, adminOnly, notificationController.deleteAllNotifications);
router.delete('/notifications/:id', authMiddleware, adminOnly, notificationController.deleteNotification);

export default router;
