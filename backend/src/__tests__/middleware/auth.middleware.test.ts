import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import {
  authenticateToken,
  authenticateApiKey,
  requirePermission,
  requireRole
} from '../../middleware/auth.middleware';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn()
    },
    apiKey: {
      findUnique: jest.fn()
    },
    apiUsage: {
      create: jest.fn()
    }
  }))
}));

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      headers: {},
      body: {},
      ip: '127.0.0.1',
      path: '/api/test',
      method: 'GET'
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    mockPrisma = new PrismaClient();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid JWT token', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: {
          name: 'USER',
          permissions: [
            { name: 'products:read', resource: 'products', action: 'read' }
          ]
        }
      };

      mockReq.headers = { authorization: 'Bearer valid_token' };
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user123' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith('valid_token', process.env.JWT_SECRET);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        include: {
          role: {
            include: { permissions: true }
          }
        }
      });
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockReq.headers = { authorization: 'Bearer invalid_token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject if user not found', async () => {
      mockReq.headers = { authorization: 'Bearer valid_token' };
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user123' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authenticateApiKey', () => {
    it('should authenticate valid API key', async () => {
      const mockApiKey = {
        id: 'key123',
        userId: 'user123',
        isActive: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          role: {
            name: 'USER',
            permissions: [
              { name: 'api:read', resource: 'api', action: 'read' }
            ]
          }
        }
      };

      mockReq.headers = { 'x-api-key': 'test_api_key' };
      mockPrisma.apiKey.findUnique.mockResolvedValue(mockApiKey);
      mockPrisma.apiUsage.create.mockResolvedValue({});

      await authenticateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { hashedKey: expect.any(String) },
        include: {
          user: {
            include: {
              role: {
                include: { permissions: true }
              }
            }
          }
        }
      });
      expect(mockPrisma.apiUsage.create).toHaveBeenCalled();
      expect(mockReq.user).toEqual(mockApiKey.user);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without API key', async () => {
      await authenticateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'API key required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid API key', async () => {
      mockReq.headers = { 'x-api-key': 'invalid_key' };
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      await authenticateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid API key' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject inactive API key', async () => {
      const mockApiKey = {
        id: 'key123',
        isActive: false,
        user: { id: 'user123' }
      };

      mockReq.headers = { 'x-api-key': 'test_api_key' };
      mockPrisma.apiKey.findUnique.mockResolvedValue(mockApiKey);

      await authenticateApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'API key is inactive' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should allow user with required permission', async () => {
      mockReq.user = {
        id: 'user123',
        role: {
          permissions: [
            { name: 'products:read', resource: 'products', action: 'read' },
            { name: 'products:create', resource: 'products', action: 'create' }
          ]
        }
      };

      const middleware = requirePermission('products:read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny user without required permission', async () => {
      mockReq.user = {
        id: 'user123',
        role: {
          permissions: [
            { name: 'products:read', resource: 'products', action: 'read' }
          ]
        }
      };

      const middleware = requirePermission('products:delete');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny request without authenticated user', async () => {
      const middleware = requirePermission('products:read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow user with required role', async () => {
      mockReq.user = {
        id: 'user123',
        role: { name: 'ADMIN' }
      };

      const middleware = requireRole(['ADMIN', 'SUPER_ADMIN']);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny user without required role', async () => {
      mockReq.user = {
        id: 'user123',
        role: { name: 'USER' }
      };

      const middleware = requireRole(['ADMIN', 'SUPER_ADMIN']);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient role privileges' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny request without authenticated user', async () => {
      const middleware = requireRole(['ADMIN']);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle string role parameter', async () => {
      mockReq.user = {
        id: 'user123',
        role: { name: 'ADMIN' }
      };

      const middleware = requireRole('ADMIN');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});