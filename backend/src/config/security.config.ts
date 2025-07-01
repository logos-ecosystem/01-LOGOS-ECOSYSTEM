import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { Express } from 'express';

// Advanced Security Configuration
export const securityConfig = {
  // Rate limiting configurations
  rateLimits: {
    // Global rate limit
    global: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    }),
    
    // Auth endpoints - more restrictive
    auth: rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5, // only 5 login attempts per 15 minutes
      message: 'Too many authentication attempts, please try again later.',
      skipSuccessfulRequests: true,
    }),
    
    // API endpoints
    api: rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 60, // 60 requests per minute
      message: 'API rate limit exceeded.',
    }),
    
    // Payment endpoints - very restrictive
    payment: rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // only 10 payment attempts per hour
      message: 'Payment rate limit exceeded.',
      skipSuccessfulRequests: true,
    }),
  },
  
  // Helmet configuration for security headers
  helmetConfig: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "https://js.stripe.com", "https://www.paypal.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.stripe.com", "https://api.paypal.com", "wss://api.logos-ecosystem.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["https://js.stripe.com", "https://www.paypal.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  },
  
  // CORS configuration
  corsConfig: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://logos-ecosystem.com', 'https://www.logos-ecosystem.com']
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  },
  
  // Session configuration
  sessionConfig: {
    secret: process.env.SESSION_SECRET || 'super-secret-session-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict' as const,
    },
  },
  
  // JWT configuration
  jwtConfig: {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: 'RS256' as const,
  },
  
  // Encryption configuration
  encryptionConfig: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    saltLength: 64,
    iterations: 100000,
  },
};

// Security middleware setup
export const setupSecurity = (app: Express) => {
  // Basic security headers
  app.use(helmet(securityConfig.helmetConfig));
  
  // CORS
  app.use(cors(securityConfig.corsConfig));
  
  // Global rate limiting
  app.use(securityConfig.rateLimits.global);
  
  // Specific rate limits for different routes
  app.use('/api/auth', securityConfig.rateLimits.auth);
  app.use('/api/payments', securityConfig.rateLimits.payment);
  app.use('/api', securityConfig.rateLimits.api);
  
  // Additional security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });
  
  // Remove sensitive headers
  app.disable('x-powered-by');
  
  // Request size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
};

export default securityConfig;