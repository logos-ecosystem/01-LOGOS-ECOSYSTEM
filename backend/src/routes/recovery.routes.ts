import { Router, Request, Response } from 'express';
import { recoveryService } from '../services/recovery.service';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// All recovery routes require admin authentication
router.use(authenticateToken);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

/**
 * @route POST /api/recovery/auto
 * @desc Start automatic recovery for all failed services
 * @access Private (Admin)
 */
router.post('/auto', async (req: Request, res: Response) => {
  try {
    logger.info(`Auto recovery triggered by admin: ${req.user?.email}`);
    
    const results = await recoveryService.recoverFailedServices();
    
    const successCount = results.filter(r => r.recovered).length;
    const failureCount = results.filter(r => !r.recovered).length;
    
    res.status(200).json({
      success: true,
      message: `Recovery completed: ${successCount} recovered, ${failureCount} failed`,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Auto recovery error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute recovery',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/recovery/service/:serviceName
 * @desc Recover a specific service
 * @access Private (Admin)
 */
router.post('/service/:serviceName', async (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    
    logger.info(`Manual recovery for ${serviceName} triggered by admin: ${req.user?.email}`);
    
    const result = await recoveryService.recoverSpecificService(serviceName);
    
    res.status(result.recovered ? 200 : 500).json({
      success: result.recovered,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Recovery error for service ${req.params.serviceName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to recover service',
      service: req.params.serviceName,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/recovery/status
 * @desc Get current recovery status for all services
 * @access Private (Admin)
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = recoveryService.getRecoveryStatus();
    
    res.status(200).json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting recovery status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recovery status'
    });
  }
});

/**
 * @route POST /api/recovery/scheduler/start
 * @desc Start the auto-recovery scheduler
 * @access Private (Admin)
 */
router.post('/scheduler/start', (req: Request, res: Response) => {
  try {
    const { intervalMinutes = 5 } = req.body;
    const intervalMs = intervalMinutes * 60 * 1000;
    
    recoveryService.startAutoRecovery(intervalMs);
    
    logger.info(`Auto-recovery scheduler started with ${intervalMinutes} minute interval by admin: ${req.user?.email}`);
    
    res.status(200).json({
      success: true,
      message: `Auto-recovery scheduler started with ${intervalMinutes} minute interval`,
      intervalMinutes,
      nextCheck: new Date(Date.now() + intervalMs).toISOString()
    });
  } catch (error) {
    logger.error('Error starting recovery scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start recovery scheduler'
    });
  }
});

export default router;