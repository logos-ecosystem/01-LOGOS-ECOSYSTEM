// Simplified agent routes for the EXECUTIVE AI ASSISTANT integration
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

// Agent categories data
const agentCategories = [
  { id: 'business', name: 'Business & Finance', count: 15, icon: '💼' },
  { id: 'technology', name: 'Technology & IT', count: 18, icon: '💻' },
  { id: 'health', name: 'Health & Wellness', count: 12, icon: '🏥' },
  { id: 'education', name: 'Education & Learning', count: 14, icon: '🎓' },
  { id: 'creative', name: 'Creative & Arts', count: 10, icon: '🎨' },
  { id: 'legal', name: 'Legal & Compliance', count: 11, icon: '⚖️' },
  { id: 'marketing', name: 'Marketing & Sales', count: 13, icon: '📈' },
  { id: 'hr', name: 'Human Resources', count: 9, icon: '👥' },
  { id: 'operations', name: 'Operations & Logistics', count: 16, icon: '🏭' },
  { id: 'customer', name: 'Customer Service', count: 8, icon: '🤝' },
  { id: 'analytics', name: 'Data & Analytics', count: 14, icon: '📊' },
  { id: 'security', name: 'Security & Risk', count: 18, icon: '🔒' }
];

// Mock agents data
const mockAgents = [
  {
    id: 'finance-advisor-001',
    name: 'Financial Advisor AI',
    category: 'business',
    description: 'Expert in financial planning, investment strategies, and portfolio management',
    capabilities: ['Financial Analysis', 'Investment Planning', 'Risk Assessment', 'Tax Optimization'],
    price: 99.99,
    rating: 4.8,
    reviews: 324
  },
  {
    id: 'code-reviewer-001',
    name: 'Code Review Assistant',
    category: 'technology',
    description: 'Automated code review, security analysis, and best practices enforcement',
    capabilities: ['Code Analysis', 'Security Scanning', 'Performance Optimization', 'Documentation'],
    price: 79.99,
    rating: 4.9,
    reviews: 567
  },
  {
    id: 'health-coach-001',
    name: 'Personal Health Coach',
    category: 'health',
    description: 'Personalized health guidance, fitness planning, and wellness tracking',
    capabilities: ['Health Monitoring', 'Fitness Planning', 'Nutrition Advice', 'Sleep Optimization'],
    price: 59.99,
    rating: 4.7,
    reviews: 892
  }
];

export function createAgentRoutes(): Router {
  const router = Router();

  // Apply authentication to all agent routes
  router.use(authMiddleware);

  // Get all agent categories
  router.get('/agents/categories', async (req: Request, res: Response) => {
    try {
      logger.info('Fetching agent categories');
      res.json({
        success: true,
        categories: agentCategories,
        total: agentCategories.length
      });
    } catch (error) {
      logger.error('Error fetching agent categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch agent categories'
      });
    }
  });

  // List all agents with filtering
  router.get('/agents', async (req: Request, res: Response) => {
    try {
      const { category, search, page = 1, limit = 20 } = req.query;
      
      let filteredAgents = [...mockAgents];
      
      // Filter by category if provided
      if (category && typeof category === 'string') {
        filteredAgents = filteredAgents.filter(agent => agent.category === category);
      }
      
      // Filter by search term if provided
      if (search && typeof search === 'string') {
        const searchTerm = search.toLowerCase();
        filteredAgents = filteredAgents.filter(agent => 
          agent.name.toLowerCase().includes(searchTerm) ||
          agent.description.toLowerCase().includes(searchTerm) ||
          agent.capabilities.some(cap => cap.toLowerCase().includes(searchTerm))
        );
      }
      
      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      
      const paginatedAgents = filteredAgents.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        agents: paginatedAgents,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredAgents.length,
          totalPages: Math.ceil(filteredAgents.length / limitNum)
        }
      });
    } catch (error) {
      logger.error('Error listing agents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list agents'
      });
    }
  });

  // Get a specific agent by ID
  router.get('/agents/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      
      const agent = mockAgents.find(a => a.id === agentId);
      
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }
      
      res.json({
        success: true,
        agent
      });
    } catch (error) {
      logger.error('Error fetching agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch agent'
      });
    }
  });

  // Get agent capabilities
  router.get('/agents/:agentId/capabilities', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      
      const agent = mockAgents.find(a => a.id === agentId);
      
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }
      
      res.json({
        success: true,
        agentId: agent.id,
        capabilities: agent.capabilities,
        description: agent.description
      });
    } catch (error) {
      logger.error('Error fetching agent capabilities:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch agent capabilities'
      });
    }
  });

  // Chat with an agent
  router.post('/agents/:agentId/chat', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { message } = req.body;
      
      const agent = mockAgents.find(a => a.id === agentId);
      
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }
      
      // Mock response for now
      const response = {
        success: true,
        agentId: agent.id,
        response: `Hello! I'm ${agent.name}. I received your message: "${message}". As a specialized AI assistant in ${agent.category}, I'm here to help you with ${agent.capabilities.join(', ')}.`,
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
    } catch (error) {
      logger.error('Error in agent chat:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process chat message'
      });
    }
  });

  logger.info(`🤖 Loaded ${mockAgents.length} specialized AI agents across ${agentCategories.length} categories`);

  return router;
}