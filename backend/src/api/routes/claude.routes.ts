import { Router } from 'express';
import { ClaudeController } from '../controllers/claude.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Apply authentication to all Claude routes
router.use(authenticateToken);

// Apply rate limiting (adjust limits as needed)
const claudeRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many Claude API requests, please try again later',
});

/**
 * @swagger
 * /api/claude/message:
 *   post:
 *     summary: Send a message to Claude
 *     tags: [Claude AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *               systemPrompt:
 *                 type: string
 *               model:
 *                 type: string
 *               maxTokens:
 *                 type: integer
 *               temperature:
 *                 type: number
 *     responses:
 *       200:
 *         description: Claude response
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/message', claudeRateLimiter, ClaudeController.sendMessage);

/**
 * @swagger
 * /api/claude/stream:
 *   post:
 *     summary: Stream a response from Claude
 *     tags: [Claude AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *               systemPrompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: SSE stream
 *       400:
 *         description: Invalid request
 */
router.post('/stream', claudeRateLimiter, ClaudeController.streamMessage);

/**
 * @swagger
 * /api/claude/complete:
 *   post:
 *     summary: Complete a prompt
 *     tags: [Claude AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Completion response
 */
router.post('/complete', claudeRateLimiter, ClaudeController.complete);

/**
 * @swagger
 * /api/claude/analyze:
 *   post:
 *     summary: Analyze text
 *     tags: [Claude AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - analysisType
 *             properties:
 *               text:
 *                 type: string
 *               analysisType:
 *                 type: string
 *                 enum: [summary, sentiment, keywords, custom]
 *               customPrompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Analysis result
 */
router.post('/analyze', claudeRateLimiter, ClaudeController.analyzeText);

/**
 * @swagger
 * /api/claude/translate:
 *   post:
 *     summary: Translate text
 *     tags: [Claude AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - targetLanguage
 *             properties:
 *               text:
 *                 type: string
 *               targetLanguage:
 *                 type: string
 *               sourceLanguage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Translation result
 */
router.post('/translate', claudeRateLimiter, ClaudeController.translate);

/**
 * @swagger
 * /api/claude/code:
 *   post:
 *     summary: Generate code
 *     tags: [Claude AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requirements
 *               - language
 *             properties:
 *               requirements:
 *                 type: string
 *               language:
 *                 type: string
 *               framework:
 *                 type: string
 *               style:
 *                 type: string
 *     responses:
 *       200:
 *         description: Generated code
 */
router.post('/code', claudeRateLimiter, ClaudeController.generateCode);

/**
 * @swagger
 * /api/claude/answer:
 *   post:
 *     summary: Answer a question
 *     tags: [Claude AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *               context:
 *                 type: string
 *               format:
 *                 type: string
 *                 enum: [detailed, concise, bullet-points]
 *     responses:
 *       200:
 *         description: Answer
 */
router.post('/answer', claudeRateLimiter, ClaudeController.answerQuestion);

export default router;