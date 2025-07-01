// Extension to add agent routes to the main AI routes
// This file should be imported and used in the main server.ts

import { Router } from 'express';
import { authMiddleware as authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';
import { body, param, query } from 'express-validator';
import { AgentController } from '../../EXECUTIVE_AI_ASSISTANT/LOGOS-ECOSYSTEM-VERSION-BETA.001/backend/src/controllers/agent.controller';

export function createAgentRoutes(): Router {
  const router = Router();
  const agentController = new AgentController();

  // Rate limiter for agent routes
  const agentRateLimiter = rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 requests per minute for agents
    message: 'Too many agent requests, please try again later'
  });

  // Apply authentication to all agent routes
  router.use(authenticateToken);
  router.use(agentRateLimiter);

  // Agent discovery and listing
  router.get('/agents',
    [
      query('category').optional().isString(),
      query('search').optional().isString(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validateRequest,
    agentController.listAgents
  );

  router.get('/agents/categories', agentController.getCategories);

  // Individual agent operations
  router.get('/agents/:agentId',
    [param('agentId').notEmpty().isString()],
    validateRequest,
    agentController.getAgent
  );

  router.get('/agents/:agentId/capabilities',
    [param('agentId').notEmpty().isString()],
    validateRequest,
    agentController.getAgentCapabilities
  );

  router.post('/agents/:agentId/execute',
    [
      param('agentId').notEmpty().isString(),
      body('capability').notEmpty().isString(),
      body('parameters').optional().isObject(),
    ],
    validateRequest,
    agentController.executeCapability
  );

  router.post('/agents/:agentId/chat',
    [
      param('agentId').notEmpty().isString(),
      body('message').notEmpty().isString().isLength({ max: 4000 }),
      body('context').optional().isObject(),
    ],
    validateRequest,
    agentController.chatWithAgent
  );

  router.get('/agents/:agentId/metrics',
    [
      param('agentId').notEmpty().isString(),
      query('timeframe').optional().isIn(['hour', 'day', 'week', 'month']),
    ],
    validateRequest,
    agentController.getAgentMetrics
  );

  router.post('/agents/:agentId/feedback',
    [
      param('agentId').notEmpty().isString(),
      body('rating').isInt({ min: 1, max: 5 }),
      body('feedback').optional().isString(),
      body('executionId').optional().isString(),
    ],
    validateRequest,
    agentController.submitFeedback
  );

  // Admin routes
  router.post('/agents/admin/refresh', agentController.refreshRegistry);
  router.get('/agents/admin/stats', agentController.getSystemStats);

  return router;
}

// Integration instructions:
// Add this to your server.ts file:
/*
import { createAgentRoutes } from './EXECUTIVE_AI_ASSISTANT/agent-routes-extension';

// After other routes, add:
app.use('/api/ai', createAgentRoutes());

// Or merge with existing AI routes:
const agentRoutes = createAgentRoutes();
app.use('/api/ai', existingAiRoutes);
app.use('/api/ai', agentRoutes);
*/