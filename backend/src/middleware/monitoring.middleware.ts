import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { logApiCall, startTimer, endTimer, logError } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Request timing middleware
export const requestTiming = (req: Request, res: Response, next: NextFunction) => {
  const start = startTimer();
  const originalSend = res.send;
  
  res.send = function(data: any) {
    const duration = endTimer(start);
    
    // Log API call
    logApiCall(
      req.method,
      req.path,
      res.statusCode,
      duration,
      req.user?.id
    );
    
    // Add performance headers
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Create request log in database for production
    if (process.env.NODE_ENV === 'production') {
      prisma.requestLog.create({
        data: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          ip: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          userId: req.user?.id
        }
      }).catch(err => logError(err, { context: 'requestLog' }));
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Sentry request handler
export const sentryRequestHandler = Sentry.Handlers.requestHandler();

// Sentry tracing handler
export const sentryTracingHandler = Sentry.Handlers.tracingHandler();

// Sentry error handler (should be one of the last middleware)
export const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture all errors in production, 4xx and 5xx in other environments
    if (process.env.NODE_ENV === 'production') {
      return true;
    }
    const statusCode = error.status || error.statusCode || 500;
    return statusCode >= 400;
  }
});

// Performance monitoring for database queries
export const databaseMonitoring = () => {
  prisma.$use(async (params, next) => {
    const start = startTimer();
    const result = await next(params);
    const duration = endTimer(start);
    
    // Log slow queries
    if (duration > 1000) {
      logApiCall(
        'DB_QUERY',
        `${params.model}.${params.action}`,
        200,
        duration
      );
    }
    
    return result;
  });
};

// Health check endpoint
export const healthCheck = async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connection (if available)
    let redisStatus = 'not configured';
    if (process.env.REDIS_URL) {
      try {
        const Redis = await import('ioredis');
        const redis = new Redis.default(process.env.REDIS_URL);
        await redis.ping();
        redisStatus = 'healthy';
        redis.disconnect();
      } catch (error) {
        redisStatus = 'unhealthy';
      }
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'healthy',
        redis: redisStatus
      },
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Metrics endpoint
export const metricsEndpoint = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get request metrics
    const requestMetrics = await prisma.requestLog.groupBy({
      by: ['statusCode'],
      _count: true,
      where: {
        timestamp: {
          gte: oneDayAgo
        }
      }
    });
    
    // Get API usage metrics
    const apiUsageMetrics = await prisma.apiUsage.groupBy({
      by: ['endpoint'],
      _sum: {
        requestCount: true
      },
      where: {
        timestamp: {
          gte: oneDayAgo
        }
      },
      orderBy: {
        _sum: {
          requestCount: 'desc'
        }
      },
      take: 10
    });
    
    // Get error count
    const errorCount = await prisma.requestLog.count({
      where: {
        statusCode: {
          gte: 500
        },
        timestamp: {
          gte: oneDayAgo
        }
      }
    });
    
    // Get average response time
    const avgResponseTime = await prisma.requestLog.aggregate({
      _avg: {
        duration: true
      },
      where: {
        timestamp: {
          gte: oneDayAgo
        }
      }
    });
    
    res.json({
      timestamp: now.toISOString(),
      period: '24h',
      requests: {
        byStatus: requestMetrics,
        errorCount,
        avgResponseTime: avgResponseTime._avg.duration || 0
      },
      apiUsage: {
        topEndpoints: apiUsageMetrics
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    });
  } catch (error) {
    logError(error as Error, { context: 'metricsEndpoint' });
    res.status(500).json({
      error: 'Failed to generate metrics'
    });
  }
};

// Custom error handler
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log error
  logError(err, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.id
  });
  
  // Sentry capture
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      contexts: {
        request: {
          method: req.method,
          url: req.url,
          headers: req.headers,
          query: req.query,
          body: req.body
        }
      },
      user: req.user ? {
        id: req.user.id,
        email: req.user.email
      } : undefined
    });
  }
  
  // Send error response
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : err.message || 'Something went wrong';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  });
};