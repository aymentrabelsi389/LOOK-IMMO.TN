import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../../middleware/auth';
import { authenticated } from '../../middleware/roleGuard';
import * as favoriteController from './favorite.controller';

const router = Router();

router.get('/favorites', authMiddleware, authenticated, favoriteController.getFavorites);
router.post('/favorites', authMiddleware, authenticated, favoriteController.addFavorite);
router.delete('/favorites/:propertyId', authMiddleware, authenticated, favoriteController.removeFavorite);
router.get('/favorites/check/:propertyId', optionalAuth, favoriteController.checkFavorite);

export default router;
