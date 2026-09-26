import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminOnly, agentOrAdmin } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { messageLimiter } from '../../middleware/rateLimiter';
import * as messageController from './message.controller';
import { createMessageSchema, updateMessageSchema } from './message.schema';

const router = Router();

router.get('/messages', authMiddleware, agentOrAdmin, messageController.getMessages);
router.get('/messages/:id', authMiddleware, agentOrAdmin, messageController.getMessage);
router.post('/messages', messageLimiter, validate(createMessageSchema), messageController.createMessage);
router.put('/messages/:id', authMiddleware, agentOrAdmin, validate(updateMessageSchema), messageController.updateMessage);
router.delete('/messages/:id', authMiddleware, adminOnly, messageController.deleteMessage);

export default router;
