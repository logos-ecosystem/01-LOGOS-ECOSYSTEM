import { Request, Response } from 'express';
import { agentRegistry } from '../services/agent-registry.service';
import { logger } from '../../../../../../../backend/src/utils/logger';
import { prisma } from '../../../../../../../backend/src/lib/prisma';
import { cacheService } from '../../../../../../../backend/src/services/cache.service';

export class AgentController {
  private cachePrefix = 'agent:';
  private cacheTTL = 300; // 5 minutes

  constructor() {
    // Initialize agent registry on controller creation
    this.initializeRegistry();
  }

  private async initializeRegistry() {
    try {
      await agentRegistry.initialize();
      logger.info('✅ Agent Registry initialized in controller');
    } catch (error) {
      logger.error('Failed to initialize agent registry:', error);
    }
  }

  /**
   * List all available agents with pagination and filtering
   */
  listAgents = async (req: Request, res: Response) => {
    try {
      const { category, search, page = 1, limit = 20 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      
      // Try to get from cache
      const cacheKey = `${this.cachePrefix}list:${category}:${search}:${pageNum}:${limitNum}`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }
      
      let agents = [];
      
      if (search) {
        agents = agentRegistry.searchAgents(search as string);
      } else if (category) {
        agents = agentRegistry.getAgentsByCategory(category as string);
      } else {
        agents = agentRegistry.getAllAgents();
      }
      
      // Apply pagination
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedAgents = agents.slice(startIndex, endIndex);
      
      // Transform for API response
      const response = {
        agents: paginatedAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          category: agent.category,
          capabilities: agent.capabilities.map(cap => ({
            name: cap.name,
            description: cap.description
          })),
          features: {
            audio: agent.isAudioEnabled,
            marketplace: agent.isMarketplaceEnabled,
            iot: agent.isIoTEnabled,
            automotive: agent.isAutomotiveEnabled
          },
          metadata: {
            rating: agent.metadata.rating,
            usage: agent.metadata.usage
          }
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: agents.length,
          totalPages: Math.ceil(agents.length / limitNum)
        }
      };
      
      // Cache the response
      await cacheService.set(cacheKey, response, this.cacheTTL);
      
      res.json(response);
    } catch (error) {
      logger.error('Error listing agents:', error);
      res.status(500).json({ error: 'Failed to list agents' });
    }
  };

  /**
   * Get all agent categories
   */
  getCategories = async (req: Request, res: Response) => {
    try {
      const cacheKey = `${this.cachePrefix}categories`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }
      
      const categories = agentRegistry.getAllCategories();
      
      const response = {
        categories: categories.map(cat => ({
          name: cat.name,
          displayName: cat.metadata.name,
          description: cat.metadata.description,
          agentCount: cat.metadata.agentCount,
          totalCapabilities: cat.metadata.totalCapabilities,
          features: cat.metadata.features
        }))
      };
      
      await cacheService.set(cacheKey, response, this.cacheTTL);
      
      res.json(response);
    } catch (error) {
      logger.error('Error getting categories:', error);
      res.status(500).json({ error: 'Failed to get categories' });
    }
  };

  /**
   * Get specific agent details
   */
  getAgent = async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      
      const agent = agentRegistry.getAgent(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        category: agent.category,
        capabilities: agent.capabilities,
        features: {
          audio: agent.isAudioEnabled,
          marketplace: agent.isMarketplaceEnabled,
          iot: agent.isIoTEnabled,
          automotive: agent.isAutomotiveEnabled
        },
        metadata: agent.metadata
      });
    } catch (error) {
      logger.error('Error getting agent:', error);
      res.status(500).json({ error: 'Failed to get agent' });
    }
  };

  /**
   * Get agent capabilities
   */
  getAgentCapabilities = async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      
      const agent = agentRegistry.getAgent(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json({
        agentId: agent.id,
        agentName: agent.name,
        capabilities: agent.capabilities
      });
    } catch (error) {
      logger.error('Error getting agent capabilities:', error);
      res.status(500).json({ error: 'Failed to get capabilities' });
    }
  };

  /**
   * Execute agent capability
   */
  executeCapability = async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { capability, parameters } = req.body;
      const userId = req.user!.id;
      
      // Check user limits
      const userPlan = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: { include: { plan: true } } }
      });
      
      const monthlyLimit = userPlan?.subscription?.plan?.limits?.maxApiCalls || 1000;
      
      // Count usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const monthlyUsage = await prisma.aIUsage.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth }
        }
      });
      
      if (monthlyUsage >= monthlyLimit) {
        return res.status(429).json({
          error: 'Monthly AI usage limit exceeded',
          limit: monthlyLimit,
          used: monthlyUsage
        });
      }
      
      // Execute capability
      const startTime = Date.now();
      const result = await agentRegistry.executeAgentCapability(
        agentId,
        capability,
        parameters || {},
        userId
      );
      const executionTime = Date.now() - startTime;
      
      // Track usage
      await prisma.aIUsage.create({
        data: {
          userId,
          model: `agent-${agentId}`,
          inputTokens: 100, // Estimated
          outputTokens: 200, // Estimated
          totalTokens: 300,
          cost: 0.01, // Estimated cost
          responseTime: executionTime,
          endpoint: `/agents/${agentId}/execute`,
          success: true
        }
      }).catch(error => {
        logger.error('Failed to track AI usage:', error);
      });
      
      res.json(result);
    } catch (error: any) {
      logger.error('Error executing capability:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to execute capability' 
      });
    }
  };

  /**
   * Chat with agent
   */
  chatWithAgent = async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { message, context } = req.body;
      const userId = req.user!.id;
      
      const result = await agentRegistry.chatWithAgent(
        agentId,
        message,
        userId,
        context
      );
      
      res.json(result);
    } catch (error: any) {
      logger.error('Error chatting with agent:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to chat with agent' 
      });
    }
  };

  /**
   * Get agent metrics
   */
  getAgentMetrics = async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { timeframe = 'day' } = req.query;
      
      const metrics = agentRegistry.getAgentMetrics(agentId);
      
      // Add usage statistics from database
      const usageStats = await this.getAgentUsageStats(agentId, timeframe as string);
      
      res.json({
        ...metrics,
        usage: usageStats
      });
    } catch (error: any) {
      logger.error('Error getting agent metrics:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to get metrics' 
      });
    }
  };

  /**
   * Submit feedback for agent
   */
  submitFeedback = async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { rating, feedback, executionId } = req.body;
      const userId = req.user!.id;
      
      await agentRegistry.submitFeedback(agentId, rating, feedback, userId);
      
      // Store feedback in database (optional)
      // await prisma.agentFeedback.create({...});
      
      res.status(201).json({ 
        success: true,
        message: 'Feedback submitted successfully' 
      });
    } catch (error: any) {
      logger.error('Error submitting feedback:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to submit feedback' 
      });
    }
  };

  /**
   * Refresh agent registry (Admin)
   */
  refreshRegistry = async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (!req.user?.role || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      await agentRegistry.refreshRegistry();
      
      // Clear all agent-related caches
      await cacheService.delete(`${this.cachePrefix}*`);
      
      res.json({ 
        success: true,
        message: 'Agent registry refreshed successfully' 
      });
    } catch (error) {
      logger.error('Error refreshing registry:', error);
      res.status(500).json({ error: 'Failed to refresh registry' });
    }
  };

  /**
   * Get system statistics (Admin)
   */
  getSystemStats = async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (!req.user?.role || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const stats = agentRegistry.getSystemStats();
      
      // Add database statistics
      const dbStats = await this.getDatabaseStats();
      
      res.json({
        registry: stats,
        database: dbStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting system stats:', error);
      res.status(500).json({ error: 'Failed to get system stats' });
    }
  };

  // Helper methods

  private async getAgentUsageStats(agentId: string, timeframe: string) {
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'hour':
        startDate.setHours(now.getHours() - 1);
        break;
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    const usage = await prisma.aIUsage.aggregate({
      where: {
        model: `agent-${agentId}`,
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      _sum: {
        totalTokens: true,
        cost: true
      },
      _avg: {
        responseTime: true
      }
    });
    
    return {
      timeframe,
      totalRequests: usage._count.id,
      totalTokens: usage._sum.totalTokens || 0,
      totalCost: usage._sum.cost || 0,
      averageResponseTime: usage._avg.responseTime || 0
    };
  }

  private async getDatabaseStats() {
    const totalUsers = await prisma.user.count();
    const totalUsage = await prisma.aIUsage.count();
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: 'active' }
    });
    
    return {
      totalUsers,
      totalUsage,
      activeSubscriptions
    };
  }
}