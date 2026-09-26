import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authLimiter, forgotPasswordLimiter } from '../../middleware/rateLimiter';
import * as authController from './auth.controller';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  verifyResetCodeSchema,
  resetPasswordSchema
} from './auth.schema';

const router = Router();

router.post('/auth/register', authLimiter, validate(registerSchema), authController.register);
router.post('/auth/login', authLimiter, validate(loginSchema), authController.login);
router.post('/auth/logout', authController.logout);
router.post('/auth/refresh', authController.refresh);
router.get('/auth/me', authMiddleware, authController.getMe);
router.post('/auth/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/auth/verify-reset-code', validate(verifyResetCodeSchema), authController.verifyResetCode);
router.post('/auth/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;
