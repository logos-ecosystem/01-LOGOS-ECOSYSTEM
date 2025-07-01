import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'redis';
import { logger } from '../utils/logger';

// Initialize Redis client for rate limiting
const redisClient = process.env.REDIS_URL ? Redis.createClient({
  url: process.env.REDIS_URL
}) : null;

// Rate limiter configuration
const rateLimiter = redisClient
  ? new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'middleware',
      points: 100, // Number of requests
      duration: 900, // Per 15 minutes
    })
  : new RateLimiterMemory({
      points: 100,
      duration: 900,
    });

// Configure CORS
export const configureCors = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001'
  ];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-CSRF-Token',
      'X-Requested-With'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page',
      'X-Per-Page',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    maxAge: 86400 // 24 hours
  });
};

// Configure Helmet for security headers
export const configureHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.stripe.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'https://api.stripe.com', 'wss://*.pusher.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
        childSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false, // Disable for Stripe
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
};

// Input sanitization middleware
export const sanitizeInput = () => {
  return mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.warn(`Sanitized potentially malicious input in ${key}`);
    }
  });
};

// XSS Protection
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Set additional XSS protection headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Sanitize common input fields
  const sanitizeString = (str: string) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  };

  // Recursively sanitize object
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Rate limiting middleware
export const rateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const key = req.user?.id || req.ip || 'anonymous';
    await rateLimiter.consume(key);
    
    const rateLimiterRes = await rateLimiter.get(key);
    if (rateLimiterRes) {
      res.setHeader('X-RateLimit-Limit', rateLimiter.points.toString());
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints.toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
    }
    
    next();
  } catch (rejRes: any) {
    res.setHeader('X-RateLimit-Limit', rateLimiter.points.toString());
    res.setHeader('X-RateLimit-Remaining', rejRes.remainingPoints?.toString() || '0');
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
    res.setHeader('Retry-After', Math.round(rejRes.msBeforeNext / 1000).toString());
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000)
    });
  }
};

// SQL Injection Protection
export const sqlInjectionProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sqlPatterns = [
    /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)\b)/gi,
    /(\b(AND|OR)\b\s*\d+\s*=\s*\d+)/gi,
    /(\'|\")\s*(;|--|\/\*)/gi,
    /(\b(SLEEP|BENCHMARK|LOAD_FILE|OUTFILE)\b)/gi
  ];

  const checkForSQLInjection = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return sqlPatterns.some(pattern => pattern.test(value));
  };

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkForSQLInjection(obj);
    }
    if (Array.isArray(obj)) {
      return obj.some(checkObject);
    }
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(checkObject);
    }
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    logger.warn(`Potential SQL injection attempt from IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid input detected'
    });
  }

  next();
};

// File upload security
export const fileUploadSecurity = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Only apply to multipart/form-data requests
  if (!req.is('multipart/form-data')) {
    return next();
  }

  // Set file upload limits
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json'
  ];

  // Check Content-Length header
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > maxFileSize) {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'File size exceeds maximum allowed size'
    });
  }

  // Additional file validation will be done by multer middleware
  next();
};

// NoSQL Injection Protection (for MongoDB)
export const noSQLInjectionProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const checkForNoSQLInjection = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    
    const dangerousKeys = ['$where', '$regex', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin'];
    
    for (const key in obj) {
      if (dangerousKeys.includes(key)) {
        return true;
      }
      if (typeof obj[key] === 'object' && checkForNoSQLInjection(obj[key])) {
        return true;
      }
    }
    return false;
  };

  if (checkForNoSQLInjection(req.body) || checkForNoSQLInjection(req.query)) {
    logger.warn(`Potential NoSQL injection attempt from IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid query parameters'
    });
  }

  next();
};

// HTTP Parameter Pollution Protection
export const hppProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Convert arrays to last value for query parameters
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      req.query[key] = (req.query[key] as string[])[
        (req.query[key] as string[]).length - 1
      ] as any;
    }
  }

  next();
};

// Security middleware composer
export const securityMiddleware = [
  configureHelmet(),
  configureCors(),
  sanitizeInput(),
  xssProtection,
  sqlInjectionProtection,
  noSQLInjectionProtection,
  hppProtection,
  rateLimitMiddleware
];