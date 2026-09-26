import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { agentOrAdmin } from '../../middleware/roleGuard';
import * as visitController from './visit.controller';

const router = Router();

router.get('/visits', authMiddleware, agentOrAdmin, visitController.getVisits);
router.get('/visits/:id', authMiddleware, agentOrAdmin, visitController.getVisit);
router.post('/visits', authMiddleware, agentOrAdmin, visitController.createVisit);
router.delete('/visits/:id', authMiddleware, agentOrAdmin, visitController.deleteVisit);

export default router;
