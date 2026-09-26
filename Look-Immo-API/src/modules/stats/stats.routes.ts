import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../../middleware/auth';
import { adminOnly } from '../../middleware/roleGuard';
import { trackVisitLimiter } from '../../middleware/rateLimiter';
import * as statsController from './stats.controller';

const router = Router();

router.post('/stats/track-visit', trackVisitLimiter, optionalAuth, statsController.trackVisit);
router.get('/stats/dashboard', authMiddleware, adminOnly, statsController.getDashboardStats);
router.get('/stats/properties', authMiddleware, adminOnly, statsController.getPropertyStats);
router.get('/stats/users', authMiddleware, adminOnly, statsController.getUserStats);

export default router;
