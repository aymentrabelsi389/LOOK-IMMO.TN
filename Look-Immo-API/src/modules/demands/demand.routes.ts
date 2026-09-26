import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { agentOrAdmin } from '../../middleware/roleGuard';
import * as clientDemandController from './demand.controller';

const router = Router();

router.get('/demands', authMiddleware, agentOrAdmin, clientDemandController.getClientDemands);
router.post('/demands', authMiddleware, agentOrAdmin, clientDemandController.createClientDemand);
router.put('/demands/:id', authMiddleware, agentOrAdmin, clientDemandController.updateClientDemand);
router.delete('/demands/:id', authMiddleware, agentOrAdmin, clientDemandController.deleteClientDemand);

export default router;
