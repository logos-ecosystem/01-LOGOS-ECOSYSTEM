import { Router } from 'express';
import { validationController } from '../api/controllers/validation.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

// Admin only routes
router.post('/run', authMiddleware, adminMiddleware, validationController.runValidation);
router.get('/history', authMiddleware, adminMiddleware, validationController.getValidationHistory);
router.get('/report/:filename', authMiddleware, adminMiddleware, validationController.getValidationReport);

export default router;