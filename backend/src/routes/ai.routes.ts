import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';
import { anthropicService } from '../services/anthropic.service';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { body } from 'express-validator';

const router = Router();

// Rate limiter específico para AI (más restrictivo)
const aiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 requests por minuto
  message: 'Too many AI requests, please try again later'
});

// Validaciones
const chatValidation = [
  body('message').notEmpty().isString().isLength({ max: 4000 }),
  body('context').optional().isString().isLength({ max: 1000 })
];

const codeAnalysisValidation = [
  body('code').notEmpty().isString().isLength({ max: 10000 }),
  body('language').notEmpty().isString().isIn(['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'cpp', 'csharp'])
];

const chatHistoryValidation = [
  body('messages').isArray().isLength({ min: 1, max: 20 }),
  body('messages.*.role').isIn(['user', 'assistant']),
  body('messages.*.content').isString().isLength({ max: 4000 })
];

// Middleware para tracking de uso
const trackAIUsage = async (req: Request, res: Response, next: Function) => {
  const startTime = Date.now();
  const originalJson = res.json;

  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log usage asynchronously
    if (req.user && res.locals.tokensUsed) {
      prisma.aIUsage.create({
        data: {
          userId: req.user.id,
          model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet',
          inputTokens: res.locals.inputTokens || 0,
          outputTokens: res.locals.outputTokens || 0,
          totalTokens: res.locals.tokensUsed || 0,
          cost: res.locals.cost || 0,
          responseTime,
          endpoint: req.path,
          success: !data.error
        }
      }).catch(error => {
        logger.error('Failed to track AI usage:', error);
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

// Chat simple con IA
router.post('/chat',
  authenticateToken,
  aiRateLimiter,
  chatValidation,
  validateRequest,
  trackAIUsage,
  async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;
      const userId = req.user!.id;

      // Verificar límites del usuario
      const userPlan = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: { include: { plan: true } } }
      });

      const monthlyLimit = userPlan?.subscription?.plan?.limits?.maxApiCalls || 1000;
      
      // Contar uso del mes actual
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

      // Estimar tokens
      const inputTokens = anthropicService.estimateTokens(message + (context || ''));
      res.locals.inputTokens = inputTokens;

      // Generar respuesta
      const response = await anthropicService.generateResponse(
        message,
        `You are assisting user in LOGOS Ecosystem. 
         User context: ${context || 'General inquiry'}
         Be helpful, concise, and professional.`
      );

      // Calcular tokens y costo
      const outputTokens = anthropicService.estimateTokens(response);
      res.locals.outputTokens = outputTokens;
      res.locals.tokensUsed = inputTokens + outputTokens;
      res.locals.cost = anthropicService.calculateCost(inputTokens, outputTokens);

      res.json({
        response,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          remainingThisMonth: monthlyLimit - monthlyUsage - 1
        }
      });
    } catch (error: any) {
      logger.error('AI chat error:', error);
      res.status(500).json({ 
        error: error.message || 'AI service unavailable',
        fallback: 'Please try again later or contact support.'
      });
    }
  }
);

// Chat con historial
router.post('/chat/conversation',
  authenticateToken,
  aiRateLimiter,
  chatHistoryValidation,
  validateRequest,
  trackAIUsage,
  async (req: Request, res: Response) => {
    try {
      const { messages, systemPrompt } = req.body;

      // Calcular tokens de entrada
      const inputText = messages.map(m => m.content).join(' ');
      const inputTokens = anthropicService.estimateTokens(inputText);
      res.locals.inputTokens = inputTokens;

      const response = await anthropicService.chatCompletion(
        messages,
        systemPrompt || undefined
      );

      // Calcular tokens de salida
      const outputTokens = anthropicService.estimateTokens(response);
      res.locals.outputTokens = outputTokens;
      res.locals.tokensUsed = inputTokens + outputTokens;
      res.locals.cost = anthropicService.calculateCost(inputTokens, outputTokens);

      res.json({ response });
    } catch (error: any) {
      logger.error('AI conversation error:', error);
      res.status(500).json({ error: error.message || 'AI service unavailable' });
    }
  }
);

// Análisis de código
router.post('/analyze-code',
  authenticateToken,
  aiRateLimiter,
  codeAnalysisValidation,
  validateRequest,
  trackAIUsage,
  async (req: Request, res: Response) => {
    try {
      const { code, language } = req.body;

      const inputTokens = anthropicService.estimateTokens(code);
      res.locals.inputTokens = inputTokens;

      const analysis = await anthropicService.analyzeCode(code, language);

      const outputTokens = anthropicService.estimateTokens(analysis);
      res.locals.outputTokens = outputTokens;
      res.locals.tokensUsed = inputTokens + outputTokens;
      res.locals.cost = anthropicService.calculateCost(inputTokens, outputTokens);

      res.json({ 
        analysis,
        language,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Code analysis error:', error);
      res.status(500).json({ error: error.message || 'Code analysis failed' });
    }
  }
);

// Generar documentación
router.post('/generate-docs',
  authenticateToken,
  aiRateLimiter,
  codeAnalysisValidation,
  validateRequest,
  trackAIUsage,
  async (req: Request, res: Response) => {
    try {
      const { code, language } = req.body;

      const inputTokens = anthropicService.estimateTokens(code);
      res.locals.inputTokens = inputTokens;

      const documentation = await anthropicService.generateDocumentation(code, language);

      const outputTokens = anthropicService.estimateTokens(documentation);
      res.locals.outputTokens = outputTokens;
      res.locals.tokensUsed = inputTokens + outputTokens;
      res.locals.cost = anthropicService.calculateCost(inputTokens, outputTokens);

      res.json({ 
        documentation,
        format: 'markdown'
      });
    } catch (error: any) {
      logger.error('Documentation generation error:', error);
      res.status(500).json({ error: error.message || 'Documentation generation failed' });
    }
  }
);

// Generar descripción de producto
router.post('/generate-product-description',
  authenticateToken,
  aiRateLimiter,
  [
    body('name').notEmpty().isString(),
    body('type').notEmpty().isString(),
    body('features').isArray().notEmpty(),
    body('targetAudience').optional().isString()
  ],
  validateRequest,
  trackAIUsage,
  async (req: Request, res: Response) => {
    try {
      const productInfo = req.body;

      const description = await anthropicService.generateProductDescription(productInfo);

      res.json({ description });
    } catch (error: any) {
      logger.error('Product description generation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate description' });
    }
  }
);

// Sugerir mejoras
router.post('/suggest-improvements',
  authenticateToken,
  aiRateLimiter,
  [
    body('productType').notEmpty().isString(),
    body('currentFeatures').isArray().notEmpty(),
    body('userFeedback').optional().isString()
  ],
  validateRequest,
  trackAIUsage,
  async (req: Request, res: Response) => {
    try {
      const { productType, currentFeatures, userFeedback } = req.body;

      const suggestions = await anthropicService.suggestImprovements(
        productType,
        currentFeatures,
        userFeedback
      );

      res.json({ suggestions });
    } catch (error: any) {
      logger.error('Improvement suggestions error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate suggestions' });
    }
  }
);

// Moderar contenido
router.post('/moderate',
  authenticateToken,
  [body('content').notEmpty().isString().isLength({ max: 5000 })],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { content } = req.body;

      const moderation = await anthropicService.moderateContent(content);

      res.json(moderation);
    } catch (error: any) {
      logger.error('Content moderation error:', error);
      // En caso de error, permitir el contenido
      res.json({ isAppropriate: true });
    }
  }
);

// Obtener uso de AI del usuario
router.get('/usage',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Uso del mes actual
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usage = await prisma.aIUsage.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfMonth }
        },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          cost: true
        },
        _count: {
          id: true
        }
      });

      // Límites del plan
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: { include: { plan: true } } }
      });

      const limit = user?.subscription?.plan?.limits?.maxApiCalls || 1000;

      res.json({
        currentMonth: {
          requests: usage._count.id,
          inputTokens: usage._sum.inputTokens || 0,
          outputTokens: usage._sum.outputTokens || 0,
          totalTokens: usage._sum.totalTokens || 0,
          estimatedCost: usage._sum.cost || 0,
          limit,
          remaining: Math.max(0, limit - usage._count.id)
        }
      });
    } catch (error: any) {
      logger.error('Usage fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch usage data' });
    }
  }
);

export default router;