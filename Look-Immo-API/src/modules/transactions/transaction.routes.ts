import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { agentOrAdmin } from '../../middleware/roleGuard';
import * as transactionController from './transaction.controller';

const router = Router();

router.get('/transactions', authMiddleware, agentOrAdmin, transactionController.getTransactions);
router.post('/transactions', authMiddleware, agentOrAdmin, transactionController.createTransaction);
router.put('/transactions/:id', authMiddleware, agentOrAdmin, transactionController.updateTransaction);
router.delete('/transactions/:id', authMiddleware, agentOrAdmin, transactionController.deleteTransaction);

export default router;
