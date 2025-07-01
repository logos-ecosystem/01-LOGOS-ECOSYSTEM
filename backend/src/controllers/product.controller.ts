import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class ProductController {
  // Get all products for user
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { type, status, limit = 50, offset = 0 } = req.query;

      const where: any = { userId };
      if (type) where.type = type;
      if (status) where.status = status;

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            metrics: {
              take: 1,
              orderBy: { date: 'desc' }
            },
            integrations: true,
            webhooks: true,
            commands: true
          },
          take: Number(limit),
          skip: Number(offset),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.product.count({ where })
      ]);

      // Format products with latest metrics
      const formattedProducts = products.map(product => ({
        ...product,
        metrics: {
          usage: {
            totalRequests: product.metrics[0]?.requests || 0,
            successfulRequests: product.metrics[0]?.successfulRequests || 0,
            failedRequests: product.metrics[0]?.failedRequests || 0,
            averageResponseTime: product.metrics[0]?.averageResponseTime || 0,
            tokenUsage: product.metrics[0]?.tokenUsage || 0
          },
          performance: {
            cpu: 0, // Would come from monitoring service
            memory: 0,
            latency: product.metrics[0]?.averageResponseTime || 0,
            throughput: 0
          },
          costs: {
            currentMonth: product.metrics[0]?.cost || 0,
            lastMonth: 0, // Would calculate from previous month
            projected: 0,
            breakdown: {
              compute: 0,
              storage: 0,
              bandwidth: 0,
              api: product.metrics[0]?.cost || 0
            }
          }
        },
        deployment: {
          ...product.deployment,
          health: {
            status: 'healthy', // Would come from health checks
            uptime: 99.9,
            lastCheck: new Date()
          }
        }
      }));

      res.json({ products: formattedProducts, total });
    } catch (error) {
      logger.error('Error fetching products:', error);
      next(error);
    }
  }

  // Get product details
  async getProductDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const product = await prisma.product.findFirst({
        where: { id, userId },
        include: {
          metrics: {
            take: 30,
            orderBy: { date: 'desc' }
          },
          integrations: true,
          webhooks: true,
          commands: true,
          logs: {
            take: 100,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(product);
    } catch (error) {
      logger.error('Error fetching product details:', error);
      next(error);
    }
  }

  // Create new product
  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { name, type, description, templateId, configuration } = req.body;

      // Check user limits
      const activeProducts = await prisma.product.count({
        where: { userId, status: 'active' }
      });

      const subscription = await prisma.subscription.findFirst({
        where: { userId, status: 'active' },
        include: { plan: true }
      });

      const maxBots = subscription?.plan?.limits?.maxBots || 1;
      if (activeProducts >= maxBots) {
        return res.status(403).json({
          error: 'Limit exceeded',
          message: 'You have reached your product limit. Please upgrade your plan.'
        });
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          userId,
          name,
          type,
          description,
          configuration: configuration || {
            general: {
              displayName: name,
              description,
              language: 'es',
              timezone: 'America/Mexico_City'
            },
            behavior: {
              personality: '',
              responseStyle: 'friendly',
              creativity: 50,
              contextWindow: 4096,
              maxTokens: 2048
            },
            capabilities: {
              enabledFeatures: [],
              integrations: [],
              webhooks: [],
              customCommands: []
            },
            security: {
              allowedDomains: [],
              blockedKeywords: [],
              dataRetention: 30,
              encryptionEnabled: true,
              auditLogging: true
            }
          },
          deployment: {
            environment: 'development',
            endpoint: `https://api.logos-ecosystem.com/v1/products/${crypto.randomUUID()}`,
            apiKey: `sk-${crypto.randomBytes(32).toString('hex')}`,
            region: 'us-east-1',
            version: '1.0.0',
            lastDeployed: new Date(),
            health: {
              status: 'pending',
              uptime: 0,
              lastCheck: new Date()
            }
          }
        }
      });

      // Create initial metric entry
      await prisma.productMetric.create({
        data: {
          productId: product.id,
          date: new Date()
        }
      });

      res.status(201).json(product);
    } catch (error) {
      logger.error('Error creating product:', error);
      next(error);
    }
  }

  // Update product
  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const product = await prisma.product.findFirst({
        where: { id, userId }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: updates
      });

      res.json(updatedProduct);
    } catch (error) {
      logger.error('Error updating product:', error);
      next(error);
    }
  }

  // Update product configuration
  async updateConfiguration(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const configuration = req.body;

      const product = await prisma.product.findFirst({
        where: { id, userId }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          configuration: {
            ...product.configuration,
            ...configuration
          }
        }
      });

      res.json(updatedProduct);
    } catch (error) {
      logger.error('Error updating configuration:', error);
      next(error);
    }
  }

  // Test product configuration
  async testConfiguration(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { input } = req.body;

      // Simulate API call to AI service
      const startTime = Date.now();
      
      // Mock response - in production this would call actual AI service
      const response = {
        success: true,
        response: `Test response for input: "${input}". This is a simulated response from your AI bot.`,
        metrics: {
          responseTime: Date.now() - startTime,
          tokensUsed: Math.floor(input.length * 1.5),
          model: 'gpt-4'
        }
      };

      res.json(response);
    } catch (error) {
      logger.error('Error testing configuration:', error);
      next(error);
    }
  }

  // Delete product
  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const product = await prisma.product.findFirst({
        where: { id, userId }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Soft delete by updating status
      await prisma.product.update({
        where: { id },
        data: { status: 'inactive' }
      });

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      logger.error('Error deleting product:', error);
      next(error);
    }
  }

  // Duplicate product
  async duplicateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const userId = req.user.id;

      const originalProduct = await prisma.product.findFirst({
        where: { id, userId },
        include: {
          integrations: true,
          webhooks: true,
          commands: true
        }
      });

      if (!originalProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Create duplicate
      const newProduct = await prisma.product.create({
        data: {
          userId,
          name,
          type: originalProduct.type,
          description: `Copy of ${originalProduct.description}`,
          configuration: originalProduct.configuration,
          deployment: {
            ...originalProduct.deployment,
            endpoint: `https://api.logos-ecosystem.com/v1/products/${crypto.randomUUID()}`,
            apiKey: `sk-${crypto.randomBytes(32).toString('hex')}`,
            lastDeployed: new Date()
          },
          status: 'pending'
        }
      });

      // Duplicate integrations, webhooks, and commands if needed
      // ... implementation

      res.json(newProduct);
    } catch (error) {
      logger.error('Error duplicating product:', error);
      next(error);
    }
  }

  // Deploy product
  async deployProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { environment } = req.body;

      // Simulate deployment process
      const product = await prisma.product.update({
        where: { id },
        data: {
          deployment: {
            environment,
            lastDeployed: new Date()
          },
          status: 'active'
        }
      });

      res.json(product);
    } catch (error) {
      logger.error('Error deploying product:', error);
      next(error);
    }
  }

  // Regenerate API key
  async regenerateApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const product = await prisma.product.findFirst({
        where: { id, userId }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const newApiKey = `sk-${crypto.randomBytes(32).toString('hex')}`;

      await prisma.product.update({
        where: { id },
        data: {
          apiKey: newApiKey,
          deployment: {
            ...product.deployment,
            apiKey: newApiKey
          }
        }
      });

      res.json({ apiKey: newApiKey });
    } catch (error) {
      logger.error('Error regenerating API key:', error);
      next(error);
    }
  }

  // Get product metrics
  async getProductMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const metrics = await prisma.productMetric.findMany({
        where: {
          productId: id,
          date: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        },
        orderBy: { date: 'asc' }
      });

      res.json(metrics);
    } catch (error) {
      logger.error('Error fetching metrics:', error);
      next(error);
    }
  }

  // Get product logs
  async getProductLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { level, limit = 100, offset = 0 } = req.query;

      const where: any = { productId: id };
      if (level) where.level = level;

      const [logs, total] = await Promise.all([
        prisma.productLog.findMany({
          where,
          take: Number(limit),
          skip: Number(offset),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.productLog.count({ where })
      ]);

      res.json({ logs, total });
    } catch (error) {
      logger.error('Error fetching logs:', error);
      next(error);
    }
  }
}

export default new ProductController();