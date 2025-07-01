import { Router } from 'express';
import { body } from 'express-validator';
import authController from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Register
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('username').isLength({ min: 3 }).trim(),
    body('password').isLength({ min: 6 })
  ],
  validateRequest,
  authController.register
);

// Login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  validateRequest,
  authController.login
);

// Refresh token
router.post('/refresh',
  [
    body('refreshToken').notEmpty()
  ],
  validateRequest,
  authController.refreshToken
);

// Logout
router.post('/logout',
  authMiddleware,
  authController.logout
);

// Verify email
router.post('/verify',
  [
    body('token').notEmpty()
  ],
  validateRequest,
  authController.verifyEmail
);

// Forgot password
router.post('/forgot-password',
  [
    body('email').isEmail().normalizeEmail()
  ],
  validateRequest,
  authController.forgotPassword
);

// Reset password
router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 6 })
  ],
  validateRequest,
  authController.resetPassword
);

// Get current user
router.get('/me',
  authMiddleware,
  authController.getCurrentUser
);

// Update profile
router.put('/profile',
  authMiddleware,
  [
    body('username').optional().isLength({ min: 3 }).trim(),
    body('email').optional().isEmail().normalizeEmail()
  ],
  validateRequest,
  authController.updateProfile
);

// Change password
router.put('/change-password',
  authMiddleware,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  validateRequest,
  authController.changePassword
);

export default router;