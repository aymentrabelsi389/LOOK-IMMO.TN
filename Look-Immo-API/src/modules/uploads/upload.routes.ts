import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminOnly, agentOrAdmin } from '../../middleware/roleGuard';
import { uploadContract, uploadImage, optimizeAndSave, assertMagicBytes } from '../../core/storage/upload';
import * as uploadController from './upload.controller';

const router = Router();

router.post(
  '/upload/property-image',
  authMiddleware,
  agentOrAdmin,
  uploadImage.single('image'),
  assertMagicBytes(),
  optimizeAndSave({ folder: 'properties', quality: 82, multiSize: true }),
  uploadController.handleImageUpload
);

router.post(
  '/upload/property-document',
  authMiddleware,
  agentOrAdmin,
  uploadContract.single('file'),
  assertMagicBytes(),
  uploadController.handleDocumentUpload
);

router.get('/download', authMiddleware, agentOrAdmin, uploadController.downloadFile);

router.post(
  '/upload/blog-image',
  authMiddleware,
  adminOnly,
  uploadImage.single('image'),
  assertMagicBytes(),
  optimizeAndSave({ folder: 'blog', width: 900, quality: 80 }),
  uploadController.handleImageUpload
);

export default router;
