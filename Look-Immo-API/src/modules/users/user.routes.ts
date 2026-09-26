import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminOnly, agentOrAdmin, authenticated } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import * as userController from './user.controller';
import { createUserSchema, updateUserSchema } from './user.schema';

const router = Router();

router.get('/users', authMiddleware, agentOrAdmin, userController.getUsers);
router.get('/users/:id', authMiddleware, agentOrAdmin, userController.getUser);
router.post('/users', authMiddleware, adminOnly, validate(createUserSchema), userController.createUser);
router.put('/users/:id', authMiddleware, authenticated, validate(updateUserSchema), userController.updateUser);
router.delete('/users/:id', authMiddleware, adminOnly, userController.deleteUser);

export default router;
