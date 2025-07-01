import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import {
  rateLimiter,
  detectSQLInjection,
  detectXSS,
  securityHeaders,
  corsOptions,
  createAuditLog
} from '../../middleware/security.middleware';

// Mock dependencies
jest.mock('ioredis');
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    auditLog: {
      create: jest.fn()
    },
    requestLog: {
      create: jest.fn()
    }
  }))
}));

describe('Security Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockRedis: any;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      headers: {},
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      path: '/api/test',
      method: 'GET',
      get: jest.fn((header: string) => mockReq.headers?.[header.toLowerCase()])
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      locals: {}
    };
    
    mockNext = jest.fn();
    
    // Mock Redis instance
    mockRedis = {
      incr: jest.fn(),
      expire: jest.fn(),
      get: jest.fn()
    };
    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedis);
    
    mockPrisma = new PrismaClient();
  });

  describe('rateLimiter', () => {
    it('should allow request within rate limit', async () => {
      mockRedis.incr.mockResolvedValue(5);
      mockRedis.expire.mockResolvedValue(1);

      const limiter = rateLimiter({ windowMs: 60000, max: 10 });
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRedis.incr).toHaveBeenCalledWith('rate_limit:127.0.0.1');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 5);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should block request exceeding rate limit', async () => {
      mockRedis.incr.mockResolvedValue(11);

      const limiter = rateLimiter({ windowMs: 60000, max: 10 });
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too many requests, please try again later.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use custom key generator', async () => {
      mockReq.user = { id: 'user123' };
      mockRedis.incr.mockResolvedValue(1);

      const limiter = rateLimiter({
        windowMs: 60000,
        max: 10,
        keyGenerator: (req) => `user:${req.user?.id}`
      });
      
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRedis.incr).toHaveBeenCalledWith('rate_limit:user:user123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip whitelisted IPs', async () => {
      mockReq.ip = '192.168.1.1';

      const limiter = rateLimiter({
        windowMs: 60000,
        max: 10,
        skipList: ['192.168.1.1']
      });
      
      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRedis.incr).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('detectSQLInjection', () => {
    it('should allow clean requests', () => {
      mockReq.body = { name: 'John Doe', email: 'john@example.com' };
      mockReq.query = { page: '1', limit: '10' };
      mockReq.params = { id: '123' };

      detectSQLInjection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block SQL injection in body', () => {
      mockReq.body = { 
        name: "'; DROP TABLE users; --",
        email: 'john@example.com' 
      };

      detectSQLInjection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid input detected'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block SQL injection in query params', () => {
      mockReq.query = { 
        search: 'normal search',
        id: '1 UNION SELECT * FROM users'
      };

      detectSQLInjection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block SQL injection in URL params', () => {
      mockReq.params = { 
        id: '1; DELETE FROM orders WHERE 1=1'
      };

      detectSQLInjection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('detectXSS', () => {
    it('should allow clean requests', () => {
      mockReq.body = { 
        content: 'This is a normal message',
        description: 'Normal description with <allowed> formatting'
      };

      detectXSS(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block XSS in body', () => {
      mockReq.body = { 
        content: '<script>alert("XSS")</script>',
        name: 'Normal Name'
      };

      detectXSS(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid input detected'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block various XSS patterns', () => {
      const xssPatterns = [
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)">',
        '<svg onload=alert(1)>',
        '<<SCRIPT>alert("XSS");//<</SCRIPT>'
      ];

      xssPatterns.forEach(pattern => {
        mockReq.body = { input: pattern };
        detectXSS(mockReq as Request, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    it('should check nested objects', () => {
      mockReq.body = {
        user: {
          profile: {
            bio: '<script>alert("nested XSS")</script>'
          }
        }
      };

      detectXSS(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('securityHeaders', () => {
    it('should set all security headers', () => {
      securityHeaders(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Frame-Options',
        'DENY'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.any(String)
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('corsOptions', () => {
    it('should allow whitelisted origins', () => {
      const callback = jest.fn();
      
      corsOptions.origin('https://app.logos-ecosystem.com', callback);
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should block non-whitelisted origins in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const callback = jest.fn();
      corsOptions.origin('https://malicious.com', callback);
      
      expect(callback).toHaveBeenCalledWith(
        new Error('Not allowed by CORS'),
        false
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should allow any origin in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const callback = jest.fn();
      corsOptions.origin('http://localhost:3000', callback);
      
      expect(callback).toHaveBeenCalledWith(null, true);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should have correct CORS configuration', () => {
      expect(corsOptions.credentials).toBe(true);
      expect(corsOptions.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
      expect(corsOptions.allowedHeaders).toContain('Content-Type');
      expect(corsOptions.allowedHeaders).toContain('Authorization');
      expect(corsOptions.exposedHeaders).toContain('X-RateLimit-Limit');
    });
  });

  describe('createAuditLog', () => {
    it('should create audit log entry', async () => {
      mockReq.user = { id: 'user123' };
      mockReq.headers = { 'user-agent': 'Test Browser' };
      
      await createAuditLog({
        action: 'UPDATE_PROFILE',
        resource: 'user',
        resourceId: 'user123',
        details: { field: 'email', oldValue: 'old@test.com', newValue: 'new@test.com' },
        result: 'SUCCESS',
        req: mockReq as Request
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'UPDATE_PROFILE',
          resource: 'user',
          resourceId: 'user123',
          details: { field: 'email', oldValue: 'old@test.com', newValue: 'new@test.com' },
          result: 'SUCCESS',
          ip: '127.0.0.1',
          userAgent: 'Test Browser',
          userId: 'user123'
        }
      });
    });

    it('should handle audit log creation without user', async () => {
      mockReq.headers = { 'user-agent': 'Test Browser' };
      
      await createAuditLog({
        action: 'LOGIN_ATTEMPT',
        resource: 'auth',
        result: 'FAILED',
        details: { email: 'test@example.com' },
        req: mockReq as Request
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'LOGIN_ATTEMPT',
          resource: 'auth',
          resourceId: undefined,
          details: { email: 'test@example.com' },
          result: 'FAILED',
          ip: '127.0.0.1',
          userAgent: 'Test Browser',
          userId: undefined
        }
      });
    });
  });
});