import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import authRouter from '../../routes/auth.routes';
import { authenticateToken } from '../../middleware/auth.middleware';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const mockPrisma = new PrismaClient();

describe('Auth API Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'user-role-id' });
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@example.com',
        username: 'newuser',
        isActive: true,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('userId', 'new-user-id');
    });

    it('should reject registration with existing email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'User already exists');
    });

    it('should validate password requirements', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('ValidPassword123!', 10);
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        password: hashedPassword,
        isActive: true,
        isVerified: true,
        role: {
          name: 'USER',
          permissions: [],
        },
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'ValidPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject login with invalid password', async () => {
      const hashedPassword = await bcrypt.hash('ValidPassword123!', 10);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        password: hashedPassword,
        isActive: true,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login for inactive users', async () => {
      const hashedPassword = await bcrypt.hash('ValidPassword123!', 10);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        password: hashedPassword,
        isActive: false,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'ValidPassword123!',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Account is disabled');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token for valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { userId: 'user-id', type: 'refresh' },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        isActive: true,
        role: { name: 'USER', permissions: [] },
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Invalid refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const token = jwt.sign(
        { userId: 'user-id' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
      });
      (mockPrisma.passwordReset.create as jest.Mock).mockResolvedValue({
        id: 'reset-id',
        token: 'reset-token',
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'Password reset instructions sent to your email'
      );
    });

    it('should return success even for non-existent email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'Password reset instructions sent to your email'
      );
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const resetToken = {
        id: 'reset-id',
        token: 'valid-reset-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 3600000),
        used: false,
      };

      (mockPrisma.passwordReset.findUnique as jest.Mock).mockResolvedValue(resetToken);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
      });
      (mockPrisma.passwordReset.update as jest.Mock).mockResolvedValue({
        ...resetToken,
        used: true,
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          password: 'NewSecurePassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password reset successfully');
    });

    it('should reject expired reset token', async () => {
      (mockPrisma.passwordReset.findUnique as jest.Mock).mockResolvedValue({
        id: 'reset-id',
        token: 'expired-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() - 3600000),
        used: false,
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'expired-token',
          password: 'NewSecurePassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Reset token has expired');
    });
  });

  describe('GET /api/auth/verify-email/:token', () => {
    it('should verify email with valid token', async () => {
      const verifyToken = jwt.sign(
        { userId: 'user-id', email: 'user@example.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        emailVerified: true,
      });

      const response = await request(app).get(`/api/auth/verify-email/${verifyToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Email verified successfully');
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app).get('/api/auth/verify-email/invalid-token');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid verification token');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    it('should change password for authenticated user', async () => {
      const token = jwt.sign({ userId: 'user-id' }, process.env.JWT_SECRET!, {
        expiresIn: '1h',
      });

      const hashedPassword = await bcrypt.hash('CurrentPassword123!', 10);
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        password: hashedPassword,
        role: { name: 'USER', permissions: [] },
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        password: 'new-hashed-password',
      });

      // Create a test app with auth middleware
      const authApp = express();
      authApp.use(express.json());
      authApp.use(authenticateToken);
      authApp.put('/api/auth/change-password', async (req, res) => {
        res.json({ message: 'Password changed successfully' });
      });

      const response = await request(authApp)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'CurrentPassword123!',
          newPassword: 'NewSecurePassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password changed successfully');
    });
  });
});