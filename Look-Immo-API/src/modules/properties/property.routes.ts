import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../../middleware/auth';
import { adminOnly, agentOrAdmin } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import * as propertyController from './property.controller';
import {
  createPropertySchema,
  updatePropertySchema,
  reorderPropertySchema,
  movePropertyOrderSchema
} from './property.schema';

const router = Router();

router.get('/properties', optionalAuth, propertyController.getProperties);
router.get('/properties/:id', optionalAuth, propertyController.getProperty);
router.post('/properties', authMiddleware, agentOrAdmin, validate(createPropertySchema), propertyController.createProperty);
router.put('/properties/reorder', authMiddleware, adminOnly, validate(reorderPropertySchema), propertyController.updatePropertyOrder);
router.patch('/properties/:id/order', authMiddleware, adminOnly, validate(movePropertyOrderSchema), propertyController.movePropertyOrder);
router.put('/properties/:id', authMiddleware, agentOrAdmin, validate(updatePropertySchema), propertyController.updateProperty);
router.delete('/properties/:id', authMiddleware, agentOrAdmin, propertyController.deleteProperty);

export default router;
