import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import AWS from 'aws-sdk';
import nodemailer from 'nodemailer';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { logger } from '../utils/logger';
import { createHash } from 'crypto';
import Redis from 'ioredis';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  details?: any;
  error?: string;
  lastChecked: Date;
}

interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthCheckResult[];
  timestamp: Date;
  version: string;
  environment: string;
}

export class HealthService {
  private prisma: PrismaClient;
  private redis: Redis | null = null;
  private healthCache: Map<string, HealthCheckResult> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.prisma = new PrismaClient();
    
    // Initialize Redis if configured
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    }
  }

  // Main health check endpoint
  async checkHealth(): Promise<SystemHealth> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStripe(),
      this.checkPayPal(),
      this.checkAWS(),
      this.checkEmail(),
      this.checkAnthropic(),
      this.checkStorage()
    ]);

    const services = checks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const serviceNames = ['database', 'redis', 'stripe', 'paypal', 'aws', 'email', 'anthropic', 'storage'];
        return {
          service: serviceNames[index],
          status: 'unhealthy' as const,
          error: result.reason?.message || 'Unknown error',
          lastChecked: new Date()
        };
      }
    });

    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      services,
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  // Database health check
  private async checkDatabase(): Promise<HealthCheckResult> {
    const cached = this.getCachedResult('database');
    if (cached) return cached;

    const start = Date.now();
    try {
      // Test database connection with a simple query
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Check if we can read from a table
      const userCount = await this.prisma.user.count();
      
      const responseTime = Date.now() - start;
      const result: HealthCheckResult = {
        service: 'database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          connected: true,
          userCount,
          database: process.env.DATABASE_URL ? 'PostgreSQL' : 'Unknown'
        },
        lastChecked: new Date()
      };

      this.cacheResult('database', result);
      return result;
    } catch (error: any) {
      logger.error('Database health check failed:', error);
      
      const result: HealthCheckResult = {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message,
        lastChecked: new Date()
      };

      this.cacheResult('database', result);
      return result;
    }
  }

  // Redis health check
  private async checkRedis(): Promise<HealthCheckResult> {
    const cached = this.getCachedResult('redis');
    if (cached) return cached;

    if (!this.redis) {
      return {
        service: 'redis',
        status: 'unhealthy',
        error: 'Redis not configured',
        lastChecked: new Date()
      };
    }

    const start = Date.now();
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Test basic operations
      const testKey = `health_check_${Date.now()}`;
      await this.redis.set(testKey, 'test', 'EX', 10);
      const value = await this.redis.get(testKey);
      await this.redis.del(testKey);

      const responseTime = Date.now() - start;
      const result: HealthCheckResult = {
        service: 'redis',
        status: responseTime < 100 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          connected: true,
          testPassed: value === 'test'
        },
        lastChecked: new Date()
      };

      this.cacheResult('redis', result);
      return result;
    } catch (error: any) {
      logger.error('Redis health check failed:', error);
      
      const result: HealthCheckResult = {
        service: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message,
        lastChecked: new Date()
      };

      this.cacheResult('redis', result);
      return result;
    }
  }

  // Stripe health check
  private async checkStripe(): Promise<HealthCheckResult> {
    const cached = this.getCachedResult('stripe');
    if (cached) return cached;

    const start = Date.now();
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2023-10-16'
      });

      // Test Stripe connection by fetching balance
      const balance = await stripe.balance.retrieve();
      
      const responseTime = Date.now() - start;
      const result: HealthCheckResult = {
        service: 'stripe',
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          connected: true,
          mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? 'test' : 'live',
          currency: balance.available?.[0]?.currency
        },
        lastChecked: new Date()
      };

      this.cacheResult('stripe', result);
      return result;
    } catch (error: any) {
      logger.error('Stripe health check failed:', error);
      
      const result: HealthCheckResult = {
        service: 'stripe',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message,
        details: {
          type: error.type,
          code: error.code
        },
        lastChecked: new Date()
      };

      this.cacheResult('stripe', result);
      return result;
    }
  }

  // PayPal health check
  private async checkPayPal(): Promise<HealthCheckResult> {
    const cached = this.getCachedResult('paypal');
    if (cached) return cached;

    const start = Date.now();
    try {
      const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
      ).toString('base64');

      const baseUrl = process.env.PAYPAL_MODE === 'live' 
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      // Get access token
      const tokenResponse = await axios.post(
        `${baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 5000
        }
      );

      const responseTime = Date.now() - start;
      const result: HealthCheckResult = {
        service: 'paypal',
        status: responseTime < 3000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          connected: true,
          mode: process.env.PAYPAL_MODE || 'sandbox',
          tokenValid: !!tokenResponse.data.access_token
        },
        lastChecked: new Date()
      };

      this.cacheResult('paypal', result);
      return result;
    } catch (error: any) {
      logger.error('PayPal health check failed:', error);
      
      const result: HealthCheckResult = {
        service: 'paypal',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message,
        lastChecked: new Date()
      };

      this.cacheResult('paypal', result);
      return result;
    }
  }

  // AWS health check
  private async checkAWS(): Promise<HealthCheckResult> {
    const cached = this.getCachedResult('aws');
    if (cached) return cached;

    const start = Date.now();
    try {
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });

      // Test S3 access by listing buckets
      const buckets = await s3.listBuckets().promise();
      
      const responseTime = Date.now() - start;
      const result: HealthCheckResult = {
        service: 'aws',
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          connected: true,
          region: process.env.AWS_REGION || 'us-east-1',
          bucketCount: buckets.Buckets?.length || 0,
          services: ['S3', 'SES']
        },
        lastChecked: new Date()
      };

      this.cacheResult('aws', result);
      return result;
    } catch (error: any) {
      logger.error('AWS health check failed:', error);
      
      const result: HealthCheckResult = {
        service: 'aws',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message,
        details: {
          code: error.code,
          region: process.env.AWS_REGION
        },
        lastChecked: new Date()
      };

      this.cacheResult('aws', result);
      return result;
    }
  }

  // Email service health check
  private async checkEmail(): Promise<HealthCheckResult> {
    const cached = this.getCachedResult('email');
    if (cached) return cached;

    const start = Date.now();
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Verify email configuration
      await transporter.verify();
      
      const responseTime = Date.now() - start;
      const result: HealthCheckResult = {
        service: 'email',
        status: responseTime < 3000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          connected: true,
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          provider: process.env.SMTP_HOST?.includes('amazonaws') ? 'AWS SES' : 'SMTP'
        },
        lastChecked: new Date()
      };

      this.cacheResult('email', result);
      return result;
    } catch (error: any) {
      logger.error('Email health check failed:', error);
      
      const result: HealthCheckResult = {
        service: 'email',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message,
        lastChecked: new Date()
      };

      this.cacheResult('email', result);
      return result;
    }
  }

  // Anthropic AI health check
  private async checkAnthropic(): Promise<HealthCheckResult> {
    const cached = this.getCachedResult('anthropic');
    if (cached) return cached;

    const start = Date.now();
    try {
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('XXX')) {
        return {
          service: 'anthropic',
          status: 'unhealthy',
          error: 'API key not configured',
          lastChecked: new Date()
        };
      }

      const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });

      // Test with a minimal request
      const response = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });

      const responseTime = Date.now() - start;
      const result: HealthCheckResult = {
        service: 'anthropic',
        status: responseTime < 5000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          connected: true,
          model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
          testPassed: !!response.content
        },
        lastChecked: new Date()
      };

      this.cacheResult('anthropic', result);
      return result;
    } catch (error: any) {
      logger.error('Anthropic health check failed:', error);
      
      const result: HealthCheckResult = {
        service: 'anthropic',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message,
        details: {
          status: error.status,
          type: error.type
        },
        lastChecked: new Date()
      };

      this.cacheResult('anthropic', result);
      return result;
    }
  }

  // Storage (S3) health check
  private async checkStorage(): Promise<HealthCheckResult> {
    const cached = this.getCachedResult('storage');
    if (cached) return cached;

    const start = Date.now();
    try {
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });

      const bucketName = process.env.AWS_S3_BUCKET || 'logos-ecosystem-storage';

      // Test bucket access
      await s3.headBucket({ Bucket: bucketName }).promise();

      // Test write/read/delete operations
      const testKey = `health-check/test-${Date.now()}.txt`;
      await s3.putObject({
        Bucket: bucketName,
        Key: testKey,
        Body: 'health check test',
        ContentType: 'text/plain'
      }).promise();

      await s3.getObject({
        Bucket: bucketName,
        Key: testKey
      }).promise();

      await s3.deleteObject({
        Bucket: bucketName,
        Key: testKey
      }).promise();

      const responseTime = Date.now() - start;
      const result: HealthCheckResult = {
        service: 'storage',
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          connected: true,
          bucket: bucketName,
          operations: ['read', 'write', 'delete']
        },
        lastChecked: new Date()
      };

      this.cacheResult('storage', result);
      return result;
    } catch (error: any) {
      logger.error('Storage health check failed:', error);
      
      const result: HealthCheckResult = {
        service: 'storage',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message,
        details: {
          code: error.code,
          bucket: process.env.AWS_S3_BUCKET
        },
        lastChecked: new Date()
      };

      this.cacheResult('storage', result);
      return result;
    }
  }

  // Quick health check (database only)
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  // Get specific service health
  async checkServiceHealth(serviceName: string): Promise<HealthCheckResult> {
    switch (serviceName.toLowerCase()) {
      case 'database':
        return this.checkDatabase();
      case 'redis':
        return this.checkRedis();
      case 'stripe':
        return this.checkStripe();
      case 'paypal':
        return this.checkPayPal();
      case 'aws':
        return this.checkAWS();
      case 'email':
        return this.checkEmail();
      case 'anthropic':
        return this.checkAnthropic();
      case 'storage':
        return this.checkStorage();
      default:
        return {
          service: serviceName,
          status: 'unhealthy',
          error: 'Unknown service',
          lastChecked: new Date()
        };
    }
  }

  // Cache management
  private getCachedResult(service: string): HealthCheckResult | null {
    const cached = this.healthCache.get(service);
    if (cached && (Date.now() - cached.lastChecked.getTime()) < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  private cacheResult(service: string, result: HealthCheckResult): void {
    this.healthCache.set(service, result);
  }

  // Clear health cache
  clearCache(): void {
    this.healthCache.clear();
  }

  // Cleanup
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}

// Export singleton instance
export const healthService = new HealthService();