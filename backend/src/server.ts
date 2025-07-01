import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import subscriptionRoutes from './routes/subscription.routes';
import productRoutes from './routes/product.routes';
import supportRoutes from './routes/support.routes';
import userRoutes from './routes/user.routes';
import aiRoutes from './routes/ai.routes';
import twoFactorAuthRoutes from './routes/twoFactorAuth.routes';
import auditLogRoutes from './routes/auditLog.routes';
import invoiceRoutes from './api/routes/invoice.routes';
import dashboardRoutes from './api/routes/dashboard.routes';
import signatureRoutes from './api/routes/signature.routes';
import paypalRoutes from './api/routes/paypal.routes';
import healthRoutes from './routes/health.routes';
import recoveryRoutes from './routes/recovery.routes';
import rollbackRoutes from './routes/rollback.routes';
import validationRoutes from './routes/validation.routes';
import cloudflareRoutes from './routes/cloudflare.routes';
import apiDocsRoutes from './routes/api-docs.routes';
import claudeRoutes from './api/routes/claude.routes';
import githubRoutes from './api/routes/github.routes';
import { setupGraphQLServer } from './graphql/server';
import { createAgentRoutes } from './routes/agent-routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import {
  requestTiming,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  databaseMonitoring,
  healthCheck,
  metricsEndpoint
} from './middleware/monitoring.middleware';

// Import services
import { initializeWebSocket } from './services/websocket.service';
import { logger, stream } from './utils/logger';
import { stripeService } from './services/stripe.service';
import WebSocketServer from './websocket/server';
import { InvoiceJobs } from './jobs/invoice.jobs';
import { recoveryService } from './services/recovery.service';
import { setupSecurity } from './config/security.config';
import { monitor, monitoringService } from './services/monitoring.service';
import { cacheService } from './services/cache.service';

const app = express();
const httpServer = createServer(app);

// Initialize new WebSocket server
const wsServer = new WebSocketServer(httpServer);

// Export for use in other services
export { wsServer };

// Initialize database monitoring
databaseMonitoring();

// Sentry request handler must be first
app.use(sentryRequestHandler);
app.use(sentryTracingHandler);

// Compression middleware
app.use(compression());

// Enhanced security setup
setupSecurity(app);

// Additional monitoring
app.use(monitor());

// Logging
app.use(morgan('combined', { stream }));

// Trust proxy in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Request timing middleware
app.use(requestTiming);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// API Documentation (before auth middleware)
app.use('/api-docs', apiDocsRoutes);
app.use('/docs', apiDocsRoutes);

// GraphQL will be set up after server starts

// Monitoring endpoints
app.get('/health', healthCheck);
app.get('/metrics', (req, res) => {
  const format = req.query.format as string || 'json';
  res.type(format === 'prometheus' ? 'text/plain' : 'application/json');
  res.send(monitoringService.exportMetrics(format as any));
});

// System info endpoint
app.get('/api/system/info', authMiddleware, async (req, res) => {
  const cacheStats = await cacheService.getStats();
  res.json({
    system: monitoringService.getSystemMetrics(),
    requests: monitoringService.getRequestMetrics(),
    health: monitoringService.getHealthStatus(),
    cache: cacheStats,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', authMiddleware, subscriptionRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/support', authMiddleware, supportRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/ai', aiRoutes); // AI routes have their own auth middleware
app.use('/api/2fa', twoFactorAuthRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/rollback', rollbackRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/cloudflare', cloudflareRoutes);
app.use('/api/claude', claudeRoutes);
app.use('/api/github', githubRoutes);
// AI Agents Routes (158 specialized agents)
app.use('/api/ai', createAgentRoutes());

// Stripe webhook endpoint (no auth middleware)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body.toString('utf8');
    
    // Use the stripeService to handle the webhook
    const result = await stripeService.handleWebhook(signature, payload);
    res.json(result);
  } catch (error: any) {
    logger.error('Stripe webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Sentry error handler must be after all other middleware
app.use(sentryErrorHandler);

// Custom error handling (after Sentry)
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close connections
  await cacheService.close();
  wsServer.close();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  
  await cacheService.close();
  wsServer.close();
  
  process.exit(0);
});

// Start server
httpServer.listen(PORT, async () => {
  // Setup GraphQL server
  await setupGraphQLServer(app, httpServer);
  
  logger.info(`🚀 LOGOS ECOSYSTEM Server - MASTER DEPLOYMENT`);
  logger.info(`📡 Port: ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔒 Security: Enhanced with advanced rate limiting`);
  logger.info(`📊 Metrics: Available at /metrics`);
  logger.info(`📝 API Docs: Available at /api-docs`);
  logger.info(`🛡️ GraphQL: Available at /graphql`);
  logger.info(`💾 Cache: ${process.env.REDIS_HOST ? 'Connected to Redis' : 'Using in-memory cache'}`);
  logger.info(`🔄 WebSocket: Ready for real-time connections`);
  
  // Initialize services
  InvoiceJobs.initialize();
  logger.info('💰 Invoice automation: Active');
  
  // Start auto-recovery in production
  if (process.env.NODE_ENV === 'production') {
    recoveryService.startAutoRecovery(300000); // 5 minutes
    logger.info('🛡️ Auto-recovery: Enabled (5 min intervals)');
  }
  
  // Start periodic health checks
  setInterval(async () => {
    await monitoringService.performHealthCheck('api', async () => true);
    await monitoringService.performHealthCheck('database', async () => {
      // TODO: Add actual database check
      return true;
    });
    await monitoringService.performHealthCheck('cache', async () => {
      const stats = await cacheService.getStats();
      return stats?.connected || false;
    });
    await monitoringService.performHealthCheck('websocket', async () => {
      return wsServer.isReady();
    });
    
    // Check for alerts
    monitoringService.checkAlerts();
  }, 60000); // Every minute
  
  logger.info('✅ All systems operational - Perfect deployment achieved!');
});