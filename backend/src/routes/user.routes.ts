import { Router } from 'express';
import { body, param } from 'express-validator';
import userController from '../controllers/user.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { requireRole } from '../middleware/auth.middleware';

const router = Router();

// Get user profile
router.get('/profile', userController.getProfile);

// Update user settings
router.put('/settings',
  [
    body('theme').optional().isIn(['light', 'dark', 'auto']),
    body('language').optional().isIn(['es', 'en', 'pt', 'fr']),
    body('notifications').optional().isObject(),
    body('privacy').optional().isObject()
  ],
  validateRequest,
  userController.updateSettings
);

// Get user activity
router.get('/activity', userController.getActivity);

// Get user notifications
router.get('/notifications', userController.getNotifications);

// Mark notification as read
router.put('/notifications/:id/read',
  [
    param('id').isUUID()
  ],
  validateRequest,
  userController.markNotificationRead
);

// Mark all notifications as read
router.put('/notifications/read-all', userController.markAllNotificationsRead);

// Delete notification
router.delete('/notifications/:id',
  [
    param('id').isUUID()
  ],
  validateRequest,
  userController.deleteNotification
);

// Get API keys
router.get('/api-keys', userController.getApiKeys);

// Create API key
router.post('/api-keys',
  [
    body('name').notEmpty().trim(),
    body('permissions').isArray(),
    body('expiresAt').optional().isISO8601()
  ],
  validateRequest,
  userController.createApiKey
);

// Delete API key
router.delete('/api-keys/:id',
  [
    param('id').isUUID()
  ],
  validateRequest,
  userController.deleteApiKey
);

// Get user sessions
router.get('/sessions', userController.getSessions);

// Revoke session
router.delete('/sessions/:id',
  [
    param('id').isUUID()
  ],
  validateRequest,
  userController.revokeSession
);

// Revoke all sessions
router.delete('/sessions', userController.revokeAllSessions);

// Export user data (GDPR compliance)
router.get('/export', userController.exportUserData);

// Delete account
router.delete('/account',
  [
    body('password').notEmpty(),
    body('confirmation').equals('DELETE')
  ],
  validateRequest,
  userController.deleteAccount
);

// Admin routes
router.get('/',
  requireRole(['ADMIN']),
  userController.getAllUsers
);

router.get('/:id',
  requireRole(['ADMIN']),
  [
    param('id').isUUID()
  ],
  validateRequest,
  userController.getUserById
);

router.put('/:id/status',
  requireRole(['ADMIN']),
  [
    param('id').isUUID(),
    body('isActive').isBoolean()
  ],
  validateRequest,
  userController.updateUserStatus
);

router.put('/:id/role',
  requireRole(['ADMIN']),
  [
    param('id').isUUID(),
    body('role').isIn(['USER', 'ADMIN', 'SUPPORT'])
  ],
  validateRequest,
  userController.updateUserRole
);

export default router;