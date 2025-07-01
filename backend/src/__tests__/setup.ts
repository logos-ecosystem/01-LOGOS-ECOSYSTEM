import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/logos_test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    plan: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    apiKey: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    requestLog: {
      create: jest.fn(),
    },
    apiUsage: {
      create: jest.fn(),
    },
    passwordReset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  })),
}));

// Global test utilities
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  password: '$2a$10$hashedpassword',
  isActive: true,
  isVerified: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  role: {
    id: 'role-id',
    name: 'USER',
    permissions: [
      { id: 'perm1', name: 'products:read', resource: 'products', action: 'read' },
      { id: 'perm2', name: 'products:create', resource: 'products', action: 'create' },
    ],
  },
};

export const mockAdmin = {
  ...mockUser,
  id: 'admin-user-id',
  email: 'admin@example.com',
  username: 'admin',
  role: {
    id: 'admin-role-id',
    name: 'ADMIN',
    permissions: [
      { id: 'perm1', name: 'products:read', resource: 'products', action: 'read' },
      { id: 'perm2', name: 'products:create', resource: 'products', action: 'create' },
      { id: 'perm3', name: 'products:update', resource: 'products', action: 'update' },
      { id: 'perm4', name: 'products:delete', resource: 'products', action: 'delete' },
      { id: 'perm5', name: 'users:read', resource: 'users', action: 'read' },
      { id: 'perm6', name: 'users:manage', resource: 'users', action: 'manage' },
    ],
  },
};

export const mockPlan = {
  id: 'plan-id',
  name: 'Professional',
  price: 99,
  currency: 'usd',
  interval: 'monthly',
  stripePriceId: 'price_professional',
  stripeProductId: 'prod_professional',
  features: ['Feature 1', 'Feature 2'],
  limits: {
    maxBots: 20,
    maxApiCalls: 100000,
    maxStorageGB: 100,
  },
  apiRateLimit: 2000,
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});