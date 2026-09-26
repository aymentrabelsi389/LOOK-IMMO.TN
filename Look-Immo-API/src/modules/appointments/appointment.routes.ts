import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { appointmentLimiter } from '../../middleware/rateLimiter';
import * as appointmentController from './appointment.controller';
import { createAppointmentSchema, updateAppointmentSchema } from './appointment.schema';

const router = Router();

router.get('/appointments', authMiddleware, appointmentController.getAppointments);
router.get('/appointments/:id', authMiddleware, appointmentController.getAppointment);
router.post('/appointments', appointmentLimiter, validate(createAppointmentSchema), appointmentController.createAppointment);
router.put('/appointments/:id', authMiddleware, validate(updateAppointmentSchema), appointmentController.updateAppointment);
router.delete('/appointments/:id', authMiddleware, appointmentController.deleteAppointment);

export default router;
