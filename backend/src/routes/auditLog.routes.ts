import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLog.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { query, param } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get audit logs (filtered based on user role)
router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('action').optional().isString(),
    query('entity').optional().isString(),
    query('entityId').optional().isString(),
    query('userId').optional().isUUID(),
    query('success').optional().isBoolean(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  AuditLogController.getLogs
);

// Get user activity summary
router.get(
  '/activity/:userId?',
  [
    param('userId').optional().isUUID(),
    query('days').optional().isInt({ min: 1, max: 365 })
  ],
  validateRequest,
  AuditLogController.getUserActivity
);

// Admin-only routes
router.use(requireRole(['ADMIN']));

// Get security events
router.get(
  '/security-events',
  [
    query('hours').optional().isInt({ min: 1, max: 168 }) // Max 1 week
  ],
  validateRequest,
  AuditLogController.getSecurityEvents
);

// Get audit log statistics
router.get(
  '/statistics',
  [
    query('days').optional().isInt({ min: 1, max: 90 })
  ],
  validateRequest,
  AuditLogController.getStatistics
);

// Export audit logs as CSV
router.get(
  '/export',
  [
    query('userId').optional().isUUID(),
    query('action').optional().isString(),
    query('entity').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  AuditLogController.exportLogs
);

export default router;