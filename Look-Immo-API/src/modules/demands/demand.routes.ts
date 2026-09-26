import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { agentOrAdmin } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { createDemandSchema, updateDemandSchema } from './demand.schema';
import * as clientDemandController from './demand.controller';

const router = Router();

router.get('/demands', authMiddleware, agentOrAdmin, clientDemandController.getClientDemands);
router.post('/demands', authMiddleware, agentOrAdmin, validate(createDemandSchema), clientDemandController.createClientDemand);
router.put('/demands/:id', authMiddleware, agentOrAdmin, validate(updateDemandSchema), clientDemandController.updateClientDemand);
router.delete('/demands/:id', authMiddleware, agentOrAdmin, clientDemandController.deleteClientDemand);

export default router;
