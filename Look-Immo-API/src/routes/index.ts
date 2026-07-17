import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { adminOnly, agentOrAdmin, authenticated } from '../middleware/roleGuard';
import { uploadContract, uploadImage, optimizeAndSave, assertMagicBytes } from '../utils/upload'; // uploadContract still used for property-document upload

// Controllers
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import * as propertyController from '../controllers/propertyController';
import * as appointmentController from '../controllers/appointmentController';
import * as clientDemandController from '../controllers/clientDemandController';
import * as visitController from '../controllers/visitController';
import * as messageController from '../controllers/messageController';

import * as transactionController from '../controllers/transactionController';
import * as ratingController from '../controllers/ratingController';
import * as locationController from '../controllers/locationController';
import * as blogController from '../controllers/blogController';
import * as notificationController from '../controllers/notificationController';
import * as statsController from '../controllers/statsController';
import * as favoriteController from '../controllers/favoriteController';
import * as settingController from '../controllers/settingController';
import * as uploadController from '../controllers/uploadController';
import * as exchangeRateController from '../controllers/exchangeRateController';
import { validate } from '../middleware/validate';
import { authLimiter, forgotPasswordLimiter, messageLimiter, appointmentLimiter, ratingLimiter } from '../middleware/rateLimiter';
import { loginSchema, registerSchema, forgotPasswordSchema, verifyResetCodeSchema, resetPasswordSchema } from '../schemas/authSchema';
import { createPropertySchema, updatePropertySchema, reorderPropertySchema } from '../schemas/propertySchema';
import { createAppointmentSchema, updateAppointmentSchema } from '../schemas/appointmentSchema';
import { createMessageSchema, updateMessageSchema } from '../schemas/messageSchema';

const router = Router();

// ==================== AUTH ====================
router.post('/auth/register', authLimiter, validate(registerSchema), authController.register);
router.post('/auth/login', authLimiter, validate(loginSchema), authController.login);
router.post('/auth/logout', authController.logout);
router.post('/auth/refresh', authController.refresh);
router.get('/auth/me', authMiddleware, authController.getMe);
router.post('/auth/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/auth/verify-reset-code', validate(verifyResetCodeSchema), authController.verifyResetCode);
router.post('/auth/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// ==================== USERS ====================
router.get('/users', authMiddleware, agentOrAdmin, userController.getUsers);
router.get('/users/:id', authMiddleware, agentOrAdmin, userController.getUser);
router.post('/users', authMiddleware, adminOnly, userController.createUser);
router.put('/users/:id', authMiddleware, authenticated, userController.updateUser);
router.delete('/users/:id', authMiddleware, adminOnly, userController.deleteUser);

// ==================== PROPERTIES ====================
router.get('/properties', optionalAuth, propertyController.getProperties);
router.get('/properties/:id', optionalAuth, propertyController.getProperty);
router.post('/properties', authMiddleware, agentOrAdmin, validate(createPropertySchema), propertyController.createProperty);
router.put('/properties/reorder', authMiddleware, adminOnly, validate(reorderPropertySchema), propertyController.updatePropertyOrder);
router.put('/properties/:id', authMiddleware, agentOrAdmin, validate(updatePropertySchema), propertyController.updateProperty);
router.delete('/properties/:id', authMiddleware, agentOrAdmin, propertyController.deleteProperty);

// ==================== APPOINTMENTS ====================
router.get('/appointments', authMiddleware, appointmentController.getAppointments);
router.get('/appointments/:id', authMiddleware, appointmentController.getAppointment);
router.post('/appointments', appointmentLimiter, validate(createAppointmentSchema), appointmentController.createAppointment); // Public - clients can book
router.put('/appointments/:id', authMiddleware, validate(updateAppointmentSchema), appointmentController.updateAppointment);
router.delete('/appointments/:id', authMiddleware, appointmentController.deleteAppointment);

// ==================== CLIENT DEMANDS ====================
router.get('/demands', authMiddleware, agentOrAdmin, clientDemandController.getClientDemands);
router.post('/demands', authMiddleware, agentOrAdmin, clientDemandController.createClientDemand);
router.put('/demands/:id', authMiddleware, agentOrAdmin, clientDemandController.updateClientDemand);
router.delete('/demands/:id', authMiddleware, agentOrAdmin, clientDemandController.deleteClientDemand);

// ==================== VISITS ====================
router.get('/visits', authMiddleware, agentOrAdmin, visitController.getVisits);
router.get('/visits/:id', authMiddleware, agentOrAdmin, visitController.getVisit);
router.post('/visits', authMiddleware, agentOrAdmin, visitController.createVisit);
router.delete('/visits/:id', authMiddleware, agentOrAdmin, visitController.deleteVisit);

// ==================== MESSAGES ====================
router.get('/messages', authMiddleware, agentOrAdmin, messageController.getMessages);
router.get('/messages/:id', authMiddleware, agentOrAdmin, messageController.getMessage);
router.post('/messages', messageLimiter, validate(createMessageSchema), messageController.createMessage); // Public - contact form
router.put('/messages/:id', authMiddleware, agentOrAdmin, validate(updateMessageSchema), messageController.updateMessage);
router.delete('/messages/:id', authMiddleware, adminOnly, messageController.deleteMessage);



// ==================== TRANSACTIONS ====================
router.get('/transactions', authMiddleware, agentOrAdmin, transactionController.getTransactions);
router.post('/transactions', authMiddleware, agentOrAdmin, transactionController.createTransaction);
router.put('/transactions/:id', authMiddleware, agentOrAdmin, transactionController.updateTransaction);
router.delete('/transactions/:id', authMiddleware, agentOrAdmin, transactionController.deleteTransaction);

// ==================== RATINGS ====================
router.get('/ratings', ratingController.getRatings); // Public
router.get('/ratings/:id', ratingController.getRating); // Public
router.post('/ratings', ratingLimiter, ratingController.createRating); // Public (or authenticated clients)
router.delete('/ratings/:id', authMiddleware, agentOrAdmin, ratingController.deleteRating);

// ==================== LOCATIONS ====================
router.get('/locations', locationController.getLocations);
router.get('/locations/:id', locationController.getLocation);
router.post('/locations', authMiddleware, adminOnly, locationController.createLocation);
router.put('/locations/reorder', authMiddleware, adminOnly, locationController.updateLocationOrder);
router.put('/locations/:id', authMiddleware, adminOnly, locationController.updateLocation);
router.delete('/locations/:id', authMiddleware, adminOnly, locationController.deleteLocation);

// ==================== BLOG ====================
router.get('/blog', blogController.getBlogPosts); // Public
router.get('/blog/:id', blogController.getBlogPost); // Public
router.post('/blog', authMiddleware, adminOnly, blogController.createBlogPost);
router.put('/blog/:id', authMiddleware, adminOnly, blogController.updateBlogPost);
router.delete('/blog/:id', authMiddleware, adminOnly, blogController.deleteBlogPost);

// ==================== NOTIFICATIONS ====================
router.get('/notifications', authMiddleware, adminOnly, notificationController.getNotifications);
router.get('/notifications/unread-count', authMiddleware, adminOnly, notificationController.getUnreadCount);
router.put('/notifications/mark-all-read', authMiddleware, adminOnly, notificationController.markAllAsRead);
router.put('/notifications/:id/read', authMiddleware, adminOnly, notificationController.markAsRead);
router.delete('/notifications/read', authMiddleware, adminOnly, notificationController.deleteReadNotifications);
router.delete('/notifications/all', authMiddleware, adminOnly, notificationController.deleteAllNotifications);
router.delete('/notifications/:id', authMiddleware, adminOnly, notificationController.deleteNotification);

// ==================== STATISTICS ====================
router.post('/stats/track-visit', optionalAuth, statsController.trackVisit); // Public
router.get('/stats/dashboard', authMiddleware, adminOnly, statsController.getDashboardStats);
router.get('/stats/properties', authMiddleware, adminOnly, statsController.getPropertyStats);
router.get('/stats/users', authMiddleware, adminOnly, statsController.getUserStats);

// ==================== FAVORITES ====================
router.get('/favorites', authMiddleware, authenticated, favoriteController.getFavorites);
router.post('/favorites', authMiddleware, authenticated, favoriteController.addFavorite);
router.delete('/favorites/:propertyId', authMiddleware, authenticated, favoriteController.removeFavorite);
router.get('/favorites/check/:propertyId', optionalAuth, favoriteController.checkFavorite);

// ==================== IMAGE UPLOADS ====================
// POST /api/upload/property-image  — accepts 'image' field, returns { url }
router.post(
    '/upload/property-image',
    authMiddleware,
    agentOrAdmin,
    uploadImage.single('image'),
    assertMagicBytes(),
    optimizeAndSave({ folder: 'properties', quality: 82, multiSize: true }),
    uploadController.handleImageUpload
);

// POST /api/upload/property-document  — accepts 'file' field, returns { url }
router.post(
    '/upload/property-document',
    authMiddleware,
    agentOrAdmin,
    uploadContract.single('file'),
    assertMagicBytes(),
    uploadController.handleDocumentUpload
);

// GET /api/download  — secure direct file download
router.get('/download', uploadController.downloadFile);

// POST /api/upload/blog-image  — accepts 'image' field, returns { url }
router.post(
    '/upload/blog-image',
    authMiddleware,
    adminOnly,
    uploadImage.single('image'),
    assertMagicBytes(),
    optimizeAndSave({ folder: 'blog', width: 900, quality: 80 }),
    uploadController.handleImageUpload
);

// ==================== SETTINGS ====================
// Anyone can read site settings
router.get('/settings', settingController.getSettings);
// Only admin can update settings
router.put('/settings', authMiddleware, adminOnly, settingController.updateSettings);

// ==================== EXCHANGE RATES ====================
// Public — backend-managed, hourly cron refresh from open.er-api.com
router.get('/exchange-rates', exchangeRateController.getExchangeRates);

export default router;
