import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminOnly } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { createLocationSchema, updateLocationSchema, reorderLocationSchema } from './location.schema';
import * as locationController from './location.controller';

const router = Router();

router.get('/locations', locationController.getLocations);
router.get('/locations/:id', locationController.getLocation);
router.post('/locations', authMiddleware, adminOnly, validate(createLocationSchema), locationController.createLocation);
router.put('/locations/reorder', authMiddleware, adminOnly, validate(reorderLocationSchema), locationController.updateLocationOrder);
router.put('/locations/:id', authMiddleware, adminOnly, validate(updateLocationSchema), locationController.updateLocation);
router.delete('/locations/:id', authMiddleware, adminOnly, locationController.deleteLocation);

export default router;
