import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../../middleware/auth';
import { agentOrAdmin } from '../../middleware/roleGuard';
import { ratingLimiter } from '../../middleware/rateLimiter';
import { validate } from '../../middleware/validate';
import { createRatingSchema } from './rating.schema';
import * as ratingController from './rating.controller';

const router = Router();

router.get('/ratings', ratingController.getRatings);
router.get('/ratings/:id', ratingController.getRating);
router.post('/ratings', ratingLimiter, optionalAuth, validate(createRatingSchema), ratingController.createRating);
router.delete('/ratings/:id', authMiddleware, agentOrAdmin, ratingController.deleteRating);

export default router;
