import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Extend Express Request type to include user and API key
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        role: string;
        isActive: boolean;
        stripeCustomerId?: string;
        subscriptionId?: string;
        permissions?: string[];
      };
      apiKey?: {
        id: string;
        name: string;
        permissions: string[];
        userId: string;
      };
      session?: {
        csrfToken?: string;
      };
    }
  }
}

// JWT Authentication Middleware
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
      include: {
        subscription: {
          include: {
            plan: true
          }
        },
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role?.name || user.role,
      isActive: user.isActive,
      stripeCustomerId: user.stripeCustomerId,
      subscriptionId: user.subscription?.id,
      permissions: user.role?.permissions?.map(p => p.name) || []
    };

    next();
  } catch (error: any) {
    logger.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired'
      });
    }
    
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

// Backward compatibility
export const authMiddleware = authenticateToken;

// Role-based access control middleware
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

// API Key Authentication Middleware
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide an API key in the x-api-key header'
      });
    }

    // Hash the API key to compare with stored hash
    const hashedKey = createHash('sha256').update(apiKey).digest('hex');

    const keyRecord = await prisma.apiKey.findUnique({
      where: { hashedKey },
      include: {
        user: {
          include: {
            subscription: {
              include: {
                plan: true
              }
            }
          }
        }
      }
    });

    if (!keyRecord || !keyRecord.isActive) {
      return res.status(403).json({
        error: 'Invalid API key',
        message: 'The provided API key is invalid or inactive'
      });
    }

    // Check if key has expired
    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return res.status(403).json({
        error: 'API key expired',
        message: 'Your API key has expired. Please generate a new one.'
      });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() }
    });

    // Check rate limits
    const usage = await prisma.apiUsage.findFirst({
      where: {
        apiKeyId: keyRecord.id,
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    const subscription = keyRecord.user.subscription;
    const rateLimit = subscription?.plan?.apiRateLimit || 1000;

    if (usage && usage.requestCount >= rateLimit) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: `You have exceeded your rate limit of ${rateLimit} requests per hour`,
        limit: rateLimit,
        reset: new Date(usage.timestamp.getTime() + 60 * 60 * 1000)
      });
    }

    // Log API usage
    await prisma.apiUsage.create({
      data: {
        apiKeyId: keyRecord.id,
        endpoint: req.path,
        method: req.method,
        requestCount: 1,
        timestamp: new Date()
      }
    });

    // Add API key info to request
    req.apiKey = {
      id: keyRecord.id,
      name: keyRecord.name,
      permissions: keyRecord.permissions,
      userId: keyRecord.userId
    };

    req.user = {
      id: keyRecord.user.id,
      email: keyRecord.user.email,
      username: keyRecord.user.username,
      role: keyRecord.user.role,
      isActive: keyRecord.user.isActive,
      stripeCustomerId: keyRecord.user.stripeCustomerId,
      subscriptionId: keyRecord.user.subscription?.id
    };

    next();
  } catch (error) {
    logger.error('API key auth error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during API key authentication'
    });
  }
};

// Combined auth middleware (accepts either JWT or API key)
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const hasJWT = req.headers['authorization'];
  const hasApiKey = req.headers['x-api-key'];

  if (hasApiKey) {
    return authenticateApiKey(req, res, next);
  } else if (hasJWT) {
    return authenticateToken(req, res, next);
  } else {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide either a JWT token or API key'
    });
  }
};

// Permission check middleware
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to access this resource'
      });
    }

    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return next(); // Admins have all permissions
    }

    if (!req.user.permissions?.includes(permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `You need the '${permission}' permission to access this resource`,
        required: permission 
      });
    }

    next();
  };
};

// Subscription check middleware
export const requireSubscription = (minPlan?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to access this resource'
      });
    }

    if (!req.user.subscriptionId) {
      return res.status(403).json({ 
        error: 'Subscription required',
        message: 'Please subscribe to a plan to access this feature'
      });
    }

    if (minPlan) {
      const subscription = await prisma.subscription.findUnique({
        where: { id: req.user.subscriptionId },
        include: { plan: true }
      });

      const planHierarchy = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
      const requiredIndex = planHierarchy.indexOf(minPlan.toUpperCase());
      const currentIndex = planHierarchy.indexOf(subscription?.plan?.name?.toUpperCase() || 'FREE');

      if (currentIndex < requiredIndex) {
        return res.status(403).json({ 
          error: 'Insufficient subscription',
          message: `This feature requires ${minPlan} plan or higher`,
          required: minPlan,
          current: subscription?.plan?.name
        });
      }
    }

    next();
  };
};

// Rate limiting middleware factory
export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimit({
    windowMs: options?.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options?.max || 100, // 100 requests default
    message: options?.message || 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options?.keyGenerator || ((req) => {
      // Use user ID or IP address as key
      return req.user?.id || req.ip || 'anonymous';
    }),
    handler: (req, res) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options?.message || 'Too many requests, please try again later',
        retryAfter: res.getHeader('Retry-After')
      });
    }
  });
};

// Specific rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many authentication attempts. Please try again later.'
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'API rate limit exceeded. Please slow down your requests.'
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: 'Upload limit exceeded. Please try again later.'
});

// CSRF Protection middleware
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || token !== sessionToken) {
    return res.status(403).json({
      error: 'CSRF token invalid',
      message: 'Invalid or missing CSRF token'
    });
  }

  next();
};

// IP Whitelist middleware
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.socket.remoteAddress || '';
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      logger.warn(`Access denied for IP: ${clientIP}`);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this resource'
      });
    }

    next();
  };
};

// Request logging middleware
export const requestLogger = async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log response after it's sent
  res.on('finish', async () => {
    const duration = Date.now() - start;
    
    try {
      await prisma.requestLog.create({
        data: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          ip: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || '',
          userId: req.user?.id,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to log request:', error);
    }
  });

  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

// Optional auth middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
      include: {
        subscription: true,
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role?.name || user.role,
        isActive: user.isActive,
        stripeCustomerId: user.stripeCustomerId,
        subscriptionId: user.subscription?.id,
        permissions: user.role?.permissions?.map(p => p.name) || []
      };
    }

    next();
  } catch (error) {
    // Ignore errors and continue without user
    next();
  }
};