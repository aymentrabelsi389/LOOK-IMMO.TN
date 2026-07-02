"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roleGuard_1 = require("../middleware/roleGuard");
const upload_1 = require("../utils/upload"); // uploadContract still used for property-document upload
// Controllers
const authController = __importStar(require("../controllers/authController"));
const userController = __importStar(require("../controllers/userController"));
const propertyController = __importStar(require("../controllers/propertyController"));
const appointmentController = __importStar(require("../controllers/appointmentController"));
const clientDemandController = __importStar(require("../controllers/clientDemandController"));
const visitController = __importStar(require("../controllers/visitController"));
const messageController = __importStar(require("../controllers/messageController"));
const transactionController = __importStar(require("../controllers/transactionController"));
const ratingController = __importStar(require("../controllers/ratingController"));
const locationController = __importStar(require("../controllers/locationController"));
const blogController = __importStar(require("../controllers/blogController"));
const notificationController = __importStar(require("../controllers/notificationController"));
const statsController = __importStar(require("../controllers/statsController"));
const favoriteController = __importStar(require("../controllers/favoriteController"));
const settingController = __importStar(require("../controllers/settingController"));
const uploadController = __importStar(require("../controllers/uploadController"));
const exchangeRateController = __importStar(require("../controllers/exchangeRateController"));
const validate_1 = require("../middleware/validate");
const rateLimiter_1 = require("../middleware/rateLimiter");
const authSchema_1 = require("../schemas/authSchema");
const propertySchema_1 = require("../schemas/propertySchema");
const appointmentSchema_1 = require("../schemas/appointmentSchema");
const messageSchema_1 = require("../schemas/messageSchema");
const router = (0, express_1.Router)();
// ==================== AUTH ====================
router.post('/auth/register', rateLimiter_1.authLimiter, (0, validate_1.validate)(authSchema_1.registerSchema), authController.register);
router.post('/auth/login', rateLimiter_1.authLimiter, (0, validate_1.validate)(authSchema_1.loginSchema), authController.login);
router.post('/auth/logout', authController.logout);
router.post('/auth/refresh', authController.refresh);
router.get('/auth/me', auth_1.authMiddleware, authController.getMe);
router.post('/auth/forgot-password', rateLimiter_1.forgotPasswordLimiter, (0, validate_1.validate)(authSchema_1.forgotPasswordSchema), authController.forgotPassword);
router.post('/auth/verify-reset-code', (0, validate_1.validate)(authSchema_1.verifyResetCodeSchema), authController.verifyResetCode);
router.post('/auth/reset-password', (0, validate_1.validate)(authSchema_1.resetPasswordSchema), authController.resetPassword);
// ==================== USERS ====================
router.get('/users', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, userController.getUsers);
router.get('/users/:id', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, userController.getUser);
router.post('/users', auth_1.authMiddleware, roleGuard_1.adminOnly, userController.createUser);
router.put('/users/:id', auth_1.authMiddleware, roleGuard_1.authenticated, userController.updateUser);
router.delete('/users/:id', auth_1.authMiddleware, roleGuard_1.adminOnly, userController.deleteUser);
// ==================== PROPERTIES ====================
router.get('/properties', auth_1.optionalAuth, propertyController.getProperties);
router.get('/properties/:id', auth_1.optionalAuth, propertyController.getProperty);
router.post('/properties', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, (0, validate_1.validate)(propertySchema_1.createPropertySchema), propertyController.createProperty);
router.put('/properties/reorder', auth_1.authMiddleware, roleGuard_1.adminOnly, (0, validate_1.validate)(propertySchema_1.reorderPropertySchema), propertyController.updatePropertyOrder);
router.put('/properties/:id', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, (0, validate_1.validate)(propertySchema_1.updatePropertySchema), propertyController.updateProperty);
router.delete('/properties/:id', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, propertyController.deleteProperty);
// ==================== APPOINTMENTS ====================
router.get('/appointments', auth_1.authMiddleware, appointmentController.getAppointments);
router.get('/appointments/:id', auth_1.authMiddleware, appointmentController.getAppointment);
router.post('/appointments', rateLimiter_1.appointmentLimiter, (0, validate_1.validate)(appointmentSchema_1.createAppointmentSchema), appointmentController.createAppointment); // Public - clients can book
router.put('/appointments/:id', auth_1.authMiddleware, (0, validate_1.validate)(appointmentSchema_1.updateAppointmentSchema), appointmentController.updateAppointment);
router.delete('/appointments/:id', auth_1.authMiddleware, appointmentController.deleteAppointment);
// ==================== CLIENT DEMANDS ====================
router.get('/demands', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, clientDemandController.getClientDemands);
router.post('/demands', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, clientDemandController.createClientDemand);
router.put('/demands/:id', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, clientDemandController.updateClientDemand);
router.delete('/demands/:id', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, clientDemandController.deleteClientDemand);
// ==================== VISITS ====================
router.get('/visits', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, visitController.getVisits);
router.get('/visits/:id', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, visitController.getVisit);
router.post('/visits', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, visitController.createVisit);
router.delete('/visits/:id', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, visitController.deleteVisit);
// ==================== MESSAGES ====================
router.get('/messages', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, messageController.getMessages);
router.get('/messages/:id', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, messageController.getMessage);
router.post('/messages', rateLimiter_1.messageLimiter, (0, validate_1.validate)(messageSchema_1.createMessageSchema), messageController.createMessage); // Public - contact form
router.put('/messages/:id', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, (0, validate_1.validate)(messageSchema_1.updateMessageSchema), messageController.updateMessage);
router.delete('/messages/:id', auth_1.authMiddleware, roleGuard_1.adminOnly, messageController.deleteMessage);
// ==================== TRANSACTIONS ====================
router.get('/transactions', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, transactionController.getTransactions);
router.post('/transactions', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, transactionController.createTransaction);
router.put('/transactions/:id', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, transactionController.updateTransaction);
router.delete('/transactions/:id', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, transactionController.deleteTransaction);
// ==================== RATINGS ====================
router.get('/ratings', ratingController.getRatings); // Public
router.get('/ratings/:id', ratingController.getRating); // Public
router.post('/ratings', rateLimiter_1.ratingLimiter, ratingController.createRating); // Public (or authenticated clients)
router.delete('/ratings/:id', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, ratingController.deleteRating);
// ==================== LOCATIONS ====================
router.get('/locations', locationController.getLocations);
router.get('/locations/:id', locationController.getLocation);
router.post('/locations', auth_1.authMiddleware, roleGuard_1.adminOnly, locationController.createLocation);
router.put('/locations/reorder', auth_1.authMiddleware, roleGuard_1.adminOnly, locationController.updateLocationOrder);
router.put('/locations/:id', auth_1.authMiddleware, roleGuard_1.adminOnly, locationController.updateLocation);
router.delete('/locations/:id', auth_1.authMiddleware, roleGuard_1.adminOnly, locationController.deleteLocation);
// ==================== BLOG ====================
router.get('/blog', blogController.getBlogPosts); // Public
router.get('/blog/:id', blogController.getBlogPost); // Public
router.post('/blog', auth_1.authMiddleware, roleGuard_1.adminOnly, blogController.createBlogPost);
router.put('/blog/:id', auth_1.authMiddleware, roleGuard_1.adminOnly, blogController.updateBlogPost);
router.delete('/blog/:id', auth_1.authMiddleware, roleGuard_1.adminOnly, blogController.deleteBlogPost);
// ==================== NOTIFICATIONS ====================
router.get('/notifications', auth_1.authMiddleware, roleGuard_1.adminOnly, notificationController.getNotifications);
router.get('/notifications/unread-count', auth_1.authMiddleware, roleGuard_1.adminOnly, notificationController.getUnreadCount);
router.put('/notifications/:id/read', auth_1.authMiddleware, roleGuard_1.adminOnly, notificationController.markAsRead);
router.put('/notifications/mark-all-read', auth_1.authMiddleware, roleGuard_1.adminOnly, notificationController.markAllAsRead);
router.delete('/notifications/read', auth_1.authMiddleware, roleGuard_1.adminOnly, notificationController.deleteReadNotifications);
router.delete('/notifications/:id', auth_1.authMiddleware, roleGuard_1.adminOnly, notificationController.deleteNotification);
// ==================== STATISTICS ====================
router.post('/stats/track-visit', auth_1.optionalAuth, statsController.trackVisit); // Public
router.get('/stats/dashboard', auth_1.authMiddleware, roleGuard_1.adminOnly, statsController.getDashboardStats);
router.get('/stats/properties', auth_1.authMiddleware, roleGuard_1.adminOnly, statsController.getPropertyStats);
router.get('/stats/users', auth_1.authMiddleware, roleGuard_1.adminOnly, statsController.getUserStats);
// ==================== FAVORITES ====================
router.get('/favorites', auth_1.authMiddleware, roleGuard_1.authenticated, favoriteController.getFavorites);
router.post('/favorites', auth_1.authMiddleware, roleGuard_1.authenticated, favoriteController.addFavorite);
router.delete('/favorites/:propertyId', auth_1.authMiddleware, roleGuard_1.authenticated, favoriteController.removeFavorite);
router.get('/favorites/check/:propertyId', auth_1.optionalAuth, favoriteController.checkFavorite);
// ==================== IMAGE UPLOADS ====================
// POST /api/upload/property-image  — accepts 'image' field, returns { url }
router.post('/upload/property-image', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, upload_1.uploadImage.single('image'), (0, upload_1.optimizeAndSave)({ folder: 'properties', quality: 82, multiSize: true }), uploadController.handleImageUpload);
// POST /api/upload/property-document  — accepts 'file' field, returns { url }
router.post('/upload/property-document', auth_1.authMiddleware, roleGuard_1.agentOrAdmin, upload_1.uploadContract.single('file'), uploadController.handleDocumentUpload);
// GET /api/download  — secure direct file download
router.get('/download', uploadController.downloadFile);
// POST /api/upload/blog-image  — accepts 'image' field, returns { url }
router.post('/upload/blog-image', auth_1.authMiddleware, roleGuard_1.adminOnly, upload_1.uploadImage.single('image'), (0, upload_1.optimizeAndSave)({ folder: 'blog', width: 900, quality: 80 }), uploadController.handleImageUpload);
// ==================== SETTINGS ====================
// Anyone can read site settings
router.get('/settings', settingController.getSettings);
// Only admin can update settings
router.put('/settings', auth_1.authMiddleware, roleGuard_1.adminOnly, settingController.updateSettings);
// ==================== EXCHANGE RATES ====================
// Public — backend-managed, hourly cron refresh from open.er-api.com
router.get('/exchange-rates', exchangeRateController.getExchangeRates);
exports.default = router;
//# sourceMappingURL=index.js.map