import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { healthService } from './health.service';
import { emailService } from './email.service';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import AWS from 'aws-sdk';

interface RecoveryAction {
  service: string;
  action: () => Promise<boolean>;
  retryCount?: number;
  retryDelay?: number;
}

interface RecoveryResult {
  service: string;
  recovered: boolean;
  attempts: number;
  error?: string;
  timestamp: Date;
}

export class RecoveryService {
  private prisma: PrismaClient;
  private redis: Redis | null = null;
  private recoveryInProgress: Map<string, boolean> = new Map();
  private lastNotification: Map<string, Date> = new Map();
  private readonly NOTIFICATION_COOLDOWN = 3600000; // 1 hour

  constructor() {
    this.prisma = new PrismaClient();
    
    // Initialize Redis if configured
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          logger.error('Redis connection error:', err);
          return true;
        }
      });
    }
  }

  // Main recovery orchestrator
  async recoverFailedServices(): Promise<RecoveryResult[]> {
    const health = await healthService.checkHealth();
    const failedServices = health.services.filter(s => s.status === 'unhealthy');
    
    const recoveryResults: RecoveryResult[] = [];

    for (const service of failedServices) {
      if (this.recoveryInProgress.get(service.service)) {
        logger.info(`Recovery already in progress for ${service.service}`);
        continue;
      }

      this.recoveryInProgress.set(service.service, true);
      
      try {
        const result = await this.recoverService(service.service);
        recoveryResults.push(result);
        
        if (result.recovered) {
          logger.info(`Successfully recovered ${service.service}`);
          await this.notifyRecovery(service.service, true);
        } else {
          logger.error(`Failed to recover ${service.service} after ${result.attempts} attempts`);
          await this.notifyRecovery(service.service, false, result.error);
        }
      } finally {
        this.recoveryInProgress.set(service.service, false);
      }
    }

    return recoveryResults;
  }

  // Service-specific recovery logic
  private async recoverService(serviceName: string): Promise<RecoveryResult> {
    const recoveryActions: { [key: string]: RecoveryAction } = {
      database: {
        service: 'database',
        action: () => this.recoverDatabase(),
        retryCount: 3,
        retryDelay: 5000
      },
      redis: {
        service: 'redis',
        action: () => this.recoverRedis(),
        retryCount: 5,
        retryDelay: 2000
      },
      stripe: {
        service: 'stripe',
        action: () => this.recoverStripe(),
        retryCount: 3,
        retryDelay: 10000
      },
      paypal: {
        service: 'paypal',
        action: () => this.recoverPayPal(),
        retryCount: 3,
        retryDelay: 10000
      },
      aws: {
        service: 'aws',
        action: () => this.recoverAWS(),
        retryCount: 3,
        retryDelay: 5000
      },
      email: {
        service: 'email',
        action: () => this.recoverEmail(),
        retryCount: 3,
        retryDelay: 5000
      },
      anthropic: {
        service: 'anthropic',
        action: () => this.recoverAnthropic(),
        retryCount: 2,
        retryDelay: 30000
      },
      storage: {
        service: 'storage',
        action: () => this.recoverStorage(),
        retryCount: 3,
        retryDelay: 5000
      }
    };

    const recovery = recoveryActions[serviceName];
    if (!recovery) {
      return {
        service: serviceName,
        recovered: false,
        attempts: 0,
        error: 'No recovery action defined for this service',
        timestamp: new Date()
      };
    }

    return this.executeRecovery(recovery);
  }

  // Execute recovery with retries
  private async executeRecovery(recovery: RecoveryAction): Promise<RecoveryResult> {
    const maxRetries = recovery.retryCount || 3;
    const retryDelay = recovery.retryDelay || 5000;
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Recovery attempt ${attempt}/${maxRetries} for ${recovery.service}`);
        
        const success = await recovery.action();
        if (success) {
          return {
            service: recovery.service,
            recovered: true,
            attempts: attempt,
            timestamp: new Date()
          };
        }
        
        lastError = 'Recovery action returned false';
      } catch (error: any) {
        lastError = error.message || 'Unknown error';
        logger.error(`Recovery attempt ${attempt} failed for ${recovery.service}:`, error);
      }

      if (attempt < maxRetries) {
        await this.delay(retryDelay);
      }
    }

    return {
      service: recovery.service,
      recovered: false,
      attempts: maxRetries,
      error: lastError,
      timestamp: new Date()
    };
  }

  // Database recovery
  private async recoverDatabase(): Promise<boolean> {
    try {
      // Try to disconnect and reconnect
      await this.prisma.$disconnect();
      await this.delay(1000);
      
      this.prisma = new PrismaClient();
      
      // Test the connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      return true;
    } catch (error) {
      logger.error('Database recovery failed:', error);
      return false;
    }
  }

  // Redis recovery
  private async recoverRedis(): Promise<boolean> {
    try {
      if (!this.redis) {
        // Try to initialize Redis
        if (process.env.REDIS_URL) {
          this.redis = new Redis(process.env.REDIS_URL);
          await this.redis.ping();
          return true;
        }
        return false;
      }

      // Try to reconnect
      if (this.redis.status !== 'ready') {
        this.redis.connect();
        await this.delay(2000);
      }

      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('Redis recovery failed:', error);
      
      // Try creating a new connection
      try {
        if (this.redis) {
          this.redis.disconnect();
        }
        
        this.redis = new Redis(process.env.REDIS_URL!);
        await this.redis.ping();
        return true;
      } catch {
        return false;
      }
    }
  }

  // Stripe recovery
  private async recoverStripe(): Promise<boolean> {
    try {
      // Stripe doesn't maintain a persistent connection
      // Just verify the API key is valid
      if (!process.env.STRIPE_SECRET_KEY) {
        logger.error('Stripe API key not configured');
        return false;
      }

      // The health check will verify if Stripe is accessible
      const health = await healthService.checkServiceHealth('stripe');
      return health.status === 'healthy';
    } catch (error) {
      logger.error('Stripe recovery failed:', error);
      return false;
    }
  }

  // PayPal recovery
  private async recoverPayPal(): Promise<boolean> {
    try {
      // PayPal uses OAuth, so we might need to refresh the token
      // The service will handle token refresh automatically
      
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        logger.error('PayPal credentials not configured');
        return false;
      }

      const health = await healthService.checkServiceHealth('paypal');
      return health.status === 'healthy';
    } catch (error) {
      logger.error('PayPal recovery failed:', error);
      return false;
    }
  }

  // AWS recovery
  private async recoverAWS(): Promise<boolean> {
    try {
      // Update AWS config with current credentials
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });

      // Test S3 access
      const s3 = new AWS.S3();
      await s3.listBuckets().promise();
      
      return true;
    } catch (error) {
      logger.error('AWS recovery failed:', error);
      return false;
    }
  }

  // Email service recovery
  private async recoverEmail(): Promise<boolean> {
    try {
      // Email service creates a new transporter on each send
      // Just verify configuration exists
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.error('Email configuration incomplete');
        return false;
      }

      const health = await healthService.checkServiceHealth('email');
      return health.status === 'healthy';
    } catch (error) {
      logger.error('Email recovery failed:', error);
      return false;
    }
  }

  // Anthropic recovery
  private async recoverAnthropic(): Promise<boolean> {
    try {
      // Anthropic client is stateless, just verify API key
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('XXX')) {
        logger.error('Anthropic API key not configured');
        return false;
      }

      // Rate limit might be the issue, wait before retry
      await this.delay(30000);
      
      const health = await healthService.checkServiceHealth('anthropic');
      return health.status === 'healthy';
    } catch (error) {
      logger.error('Anthropic recovery failed:', error);
      return false;
    }
  }

  // Storage recovery
  private async recoverStorage(): Promise<boolean> {
    try {
      // Similar to AWS recovery
      return this.recoverAWS();
    } catch (error) {
      logger.error('Storage recovery failed:', error);
      return false;
    }
  }

  // Notification logic
  private async notifyRecovery(service: string, success: boolean, error?: string): Promise<void> {
    try {
      const lastNotified = this.lastNotification.get(service);
      const now = new Date();
      
      // Check cooldown period
      if (lastNotified && (now.getTime() - lastNotified.getTime()) < this.NOTIFICATION_COOLDOWN) {
        return;
      }

      const admins = await this.prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          isActive: true
        },
        select: { email: true }
      });

      if (admins.length === 0) {
        logger.warn('No admin users found for recovery notification');
        return;
      }

      const subject = success 
        ? `Service Recovered: ${service}` 
        : `Service Recovery Failed: ${service}`;

      const message = success
        ? `The ${service} service has been successfully recovered and is now operational.`
        : `Failed to recover the ${service} service. Error: ${error || 'Unknown error'}. Manual intervention may be required.`;

      for (const admin of admins) {
        await emailService.sendEmail({
          to: admin.email,
          subject,
          html: `
            <h2>${subject}</h2>
            <p>${message}</p>
            <p>Timestamp: ${now.toISOString()}</p>
            <p>Environment: ${process.env.NODE_ENV}</p>
            <hr>
            <p><a href="${process.env.APP_URL}/admin/health">View System Health</a></p>
          `
        }).catch(err => {
          logger.error(`Failed to send recovery notification to ${admin.email}:`, err);
        });
      }

      this.lastNotification.set(service, now);
    } catch (error) {
      logger.error('Failed to send recovery notification:', error);
    }
  }

  // Auto-recovery scheduler
  startAutoRecovery(intervalMs: number = 300000): void { // 5 minutes default
    logger.info(`Starting auto-recovery service with ${intervalMs}ms interval`);
    
    setInterval(async () => {
      try {
        const results = await this.recoverFailedServices();
        if (results.length > 0) {
          logger.info(`Auto-recovery completed:`, results);
        }
      } catch (error) {
        logger.error('Auto-recovery error:', error);
      }
    }, intervalMs);
  }

  // Utility function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Manual recovery trigger
  async recoverSpecificService(serviceName: string): Promise<RecoveryResult> {
    if (this.recoveryInProgress.get(serviceName)) {
      return {
        service: serviceName,
        recovered: false,
        attempts: 0,
        error: 'Recovery already in progress',
        timestamp: new Date()
      };
    }

    this.recoveryInProgress.set(serviceName, true);
    
    try {
      const result = await this.recoverService(serviceName);
      
      if (result.recovered) {
        await this.notifyRecovery(serviceName, true);
      } else {
        await this.notifyRecovery(serviceName, false, result.error);
      }
      
      return result;
    } finally {
      this.recoveryInProgress.set(serviceName, false);
    }
  }

  // Get recovery status
  getRecoveryStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    
    for (const [service, inProgress] of this.recoveryInProgress) {
      status[service] = inProgress;
    }
    
    return status;
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
export const recoveryService = new RecoveryService();