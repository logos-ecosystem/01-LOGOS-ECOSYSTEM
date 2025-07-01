import Redis from 'ioredis';
import { promisify } from 'util';
import crypto from 'crypto';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  compress?: boolean;
}

class CacheService {
  private redis: Redis;
  private defaultTTL = 3600; // 1 hour default
  private isConnected = false;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
      this.isConnected = false;
    });
  }

  // Generate cache key with optional prefix
  private generateKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || 'logos';
    return `${finalPrefix}:${key}`;
  }

  // Set cache with options
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    if (!this.isConnected) return;

    try {
      const { ttl = this.defaultTTL, prefix, compress = false } = options;
      const cacheKey = this.generateKey(key, prefix);
      
      let data = JSON.stringify(value);
      
      // Compress large data
      if (compress && data.length > 1024) {
        const zlib = require('zlib');
        data = zlib.gzipSync(data).toString('base64');
      }

      if (ttl > 0) {
        await this.redis.setex(cacheKey, ttl, data);
      } else {
        await this.redis.set(cacheKey, data);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Get from cache
  async get<T>(key: string, prefix?: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const cacheKey = this.generateKey(key, prefix);
      const data = await this.redis.get(cacheKey);
      
      if (!data) return null;

      // Try to decompress if it's compressed
      try {
        const zlib = require('zlib');
        const decompressed = zlib.gunzipSync(Buffer.from(data, 'base64')).toString();
        return JSON.parse(decompressed);
      } catch {
        // Not compressed, parse directly
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Delete from cache
  async delete(key: string, prefix?: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const cacheKey = this.generateKey(key, prefix);
      await this.redis.del(cacheKey);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Clear cache by pattern
  async clearPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache clear pattern error:', error);
    }
  }

  // Cache decorator for methods
  memoize(options: CacheOptions = {}) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cacheKey = `${target.constructor.name}:${propertyKey}:${crypto
          .createHash('md5')
          .update(JSON.stringify(args))
          .digest('hex')}`;

        // Try to get from cache
        const cached = await this.get(cacheKey, options.prefix);
        if (cached !== null) {
          return cached;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Cache the result
        await this.set(cacheKey, result, options);

        return result;
      };

      return descriptor;
    };
  }

  // Performance monitoring
  async getStats(): Promise<any> {
    if (!this.isConnected) return null;

    try {
      const info = await this.redis.info();
      const dbSize = await this.redis.dbsize();
      
      return {
        connected: this.isConnected,
        dbSize,
        info: info.split('\n').reduce((acc: any, line: string) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key.trim()] = value.trim();
          }
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }

  // Batch operations
  async mget(keys: string[], prefix?: string): Promise<any[]> {
    if (!this.isConnected) return [];

    try {
      const cacheKeys = keys.map(key => this.generateKey(key, prefix));
      const values = await this.redis.mget(...cacheKeys);
      
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return [];
    }
  }

  // Transaction support
  async transaction(operations: Array<{ action: string; key: string; value?: any; ttl?: number }>) {
    if (!this.isConnected) return;

    const multi = this.redis.multi();

    for (const op of operations) {
      switch (op.action) {
        case 'set':
          if (op.ttl) {
            multi.setex(op.key, op.ttl, JSON.stringify(op.value));
          } else {
            multi.set(op.key, JSON.stringify(op.value));
          }
          break;
        case 'del':
          multi.del(op.key);
          break;
        case 'incr':
          multi.incr(op.key);
          break;
        case 'decr':
          multi.decr(op.key);
          break;
      }
    }

    try {
      await multi.exec();
    } catch (error) {
      console.error('Cache transaction error:', error);
    }
  }

  // Close connection
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export cache decorator
export const cache = (options: CacheOptions = {}) => cacheService.memoize(options);

export default cacheService;