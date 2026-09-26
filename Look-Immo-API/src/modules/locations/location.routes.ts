import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminOnly } from '../../middleware/roleGuard';
import * as locationController from './location.controller';

const router = Router();

router.get('/locations', locationController.getLocations);
router.get('/locations/:id', locationController.getLocation);
router.post('/locations', authMiddleware, adminOnly, locationController.createLocation);
router.put('/locations/reorder', authMiddleware, adminOnly, locationController.updateLocationOrder);
router.put('/locations/:id', authMiddleware, adminOnly, locationController.updateLocation);
router.delete('/locations/:id', authMiddleware, adminOnly, locationController.deleteLocation);

export default router;
