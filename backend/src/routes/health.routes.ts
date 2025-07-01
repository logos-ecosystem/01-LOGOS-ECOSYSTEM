import { Router, Request, Response } from 'express';
import { healthService } from '../services/health.service';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route GET /api/health
 * @desc Basic health check endpoint (public)
 * @access Public
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const isHealthy = await healthService.checkDatabaseHealth();
    
    if (isHealthy) {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'LOGOS Ecosystem API',
        version: process.env.npm_package_version || '1.0.0'
      });
    } else {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Service temporarily unavailable'
      });
    }
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Service temporarily unavailable'
    });
  }
});

/**
 * @route GET /api/health/live
 * @desc Kubernetes liveness probe endpoint
 * @access Public
 */
router.get('/live', (req: Request, res: Response) => {
  // Simple liveness check - if the server can respond, it's alive
  res.status(200).json({ status: 'alive' });
});

/**
 * @route GET /api/health/ready
 * @desc Kubernetes readiness probe endpoint
 * @access Public
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if database is accessible
    const isReady = await healthService.checkDatabaseHealth();
    
    if (isReady) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

/**
 * @route GET /api/health/detailed
 * @desc Detailed health check with all services (admin only)
 * @access Private (Admin)
 */
router.get('/detailed', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const health = await healthService.checkHealth();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Detailed health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform health check',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/health/service/:serviceName
 * @desc Check health of a specific service (admin only)
 * @access Private (Admin)
 */
router.get('/service/:serviceName', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    const result = await healthService.checkServiceHealth(serviceName);
    
    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error(`Health check error for service ${req.params.serviceName}:`, error);
    res.status(500).json({
      status: 'error',
      service: req.params.serviceName,
      message: 'Failed to check service health',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/health/cache/clear
 * @desc Clear health check cache (admin only)
 * @access Private (Admin)
 */
router.post('/cache/clear', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), (req: Request, res: Response) => {
  try {
    healthService.clearCache();
    res.status(200).json({
      success: true,
      message: 'Health check cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing health cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear health cache'
    });
  }
});

/**
 * @route GET /api/health/status
 * @desc Simple status endpoint for monitoring tools
 * @access Public
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await healthService.checkDatabaseHealth();
    const services = {
      api: 'operational',
      database: dbHealthy ? 'operational' : 'down'
    };
    
    const allOperational = Object.values(services).every(status => status === 'operational');
    
    res.status(allOperational ? 200 : 503).json({
      status: allOperational ? 'operational' : 'partial_outage',
      services,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'major_outage',
      services: {
        api: 'down',
        database: 'unknown'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/health/metrics
 * @desc Get system metrics (admin only)
 * @access Private (Admin)
 */
router.get('/metrics', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const metrics = {
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json(metrics);
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics'
    });
  }
});

export default router;