import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminOnly } from '../../middleware/roleGuard';
import * as blogController from './blog.controller';

const router = Router();

router.get('/blog', blogController.getBlogPosts);
router.get('/blog/:id', blogController.getBlogPost);
router.post('/blog', authMiddleware, adminOnly, blogController.createBlogPost);
router.put('/blog/:id', authMiddleware, adminOnly, blogController.updateBlogPost);
router.delete('/blog/:id', authMiddleware, adminOnly, blogController.deleteBlogPost);

export default router;
