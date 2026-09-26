import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminOnly } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { updateSettingSchema } from './setting.schema';
import * as settingController from './setting.controller';

const router = Router();

router.get('/settings', settingController.getSettings);
router.get('/settings/resolve-map', settingController.resolveGoogleMapsUrl);
router.post('/settings/resolve-map', settingController.resolveGoogleMapsUrl);
router.put('/settings', authMiddleware, adminOnly, validate(updateSettingSchema), settingController.updateSettings);

export default router;
