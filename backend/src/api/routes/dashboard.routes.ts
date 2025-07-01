import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { query } from 'express-validator';

const router = Router();

// All dashboard routes require authentication
router.use(authMiddleware);

// Get advanced dashboard data
router.get('/advanced',
  validateRequest([
    query('period').optional().isIn(['day', 'week', 'month', 'year']),
    query('timezone').optional().isString()
  ]),
  dashboardController.getAdvancedDashboard
);

// Get basic dashboard (legacy endpoint for backwards compatibility)
router.get('/', dashboardController.getDashboard);

// Get specific metrics
router.get('/metrics/revenue',
  validateRequest([
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('groupBy').optional().isIn(['day', 'week', 'month'])
  ]),
  async (req, res) => {
    // This would be implemented in the controller
    res.json({ message: 'Revenue metrics endpoint' });
  }
);

router.get('/metrics/ai-usage',
  validateRequest([
    query('period').optional().isIn(['hour', 'day', 'week', 'month']),
    query('productId').optional().isUUID()
  ]),
  async (req, res) => {
    // This would be implemented in the controller
    res.json({ message: 'AI usage metrics endpoint' });
  }
);

router.get('/metrics/performance',
  validateRequest([
    query('metric').optional().isIn(['response-time', 'success-rate', 'uptime']),
    query('interval').optional().isIn(['5m', '1h', '1d', '1w'])
  ]),
  async (req, res) => {
    // This would be implemented in the controller
    res.json({ message: 'Performance metrics endpoint' });
  }
);

// Export dashboard data
router.get('/export',
  validateRequest([
    query('format').isIn(['csv', 'xlsx', 'pdf']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('metrics').optional().isArray()
  ]),
  async (req, res) => {
    // This would be implemented in the controller
    res.json({ message: 'Export dashboard data endpoint' });
  }
);

// Real-time dashboard updates via SSE
router.get('/realtime',
  async (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Send initial data
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date() })}\n\n`);

    // Set up interval to send updates
    const interval = setInterval(() => {
      // This would fetch real data in production
      const update = {
        type: 'update',
        timestamp: new Date(),
        metrics: {
          activeUsers: Math.floor(Math.random() * 100),
          apiCalls: Math.floor(Math.random() * 1000),
          revenue: Math.random() * 10000
        }
      };
      res.write(`data: ${JSON.stringify(update)}\n\n`);
    }, 5000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(interval);
    });
  }
);

// Dashboard widgets configuration
router.get('/widgets',
  async (req, res) => {
    // Return user's widget configuration
    res.json({
      widgets: [
        { id: 'revenue', position: { x: 0, y: 0, w: 6, h: 4 }, enabled: true },
        { id: 'ai-usage', position: { x: 6, y: 0, w: 6, h: 4 }, enabled: true },
        { id: 'activity', position: { x: 0, y: 4, w: 12, h: 6 }, enabled: true }
      ]
    });
  }
);

router.put('/widgets',
  validateRequest([
    query('widgets').isArray(),
    query('widgets.*.id').isString(),
    query('widgets.*.position').isObject(),
    query('widgets.*.enabled').isBoolean()
  ]),
  async (req, res) => {
    // Save user's widget configuration
    res.json({ message: 'Widget configuration updated' });
  }
);

export default router;