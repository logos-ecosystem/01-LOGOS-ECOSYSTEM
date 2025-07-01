import { Router } from 'express';
import { rollbackController } from '../api/controllers/rollback.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

// Admin only routes
router.post('/snapshot', authMiddleware, adminMiddleware, rollbackController.createSnapshot);
router.post('/perform', authMiddleware, adminMiddleware, rollbackController.performRollback);
router.get('/history', authMiddleware, adminMiddleware, rollbackController.getRollbackHistory);

// Automatic rollback (requires special token)
router.post('/automatic', rollbackController.automaticRollback);

export default router;