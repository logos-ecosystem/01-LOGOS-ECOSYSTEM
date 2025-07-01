import { Request, Response } from 'express';
import { createClaudeService, ClaudeMessage } from '../../services/claude.service';
import { logger } from '../../utils/logger';

const claudeService = createClaudeService();

export class ClaudeController {
  /**
   * Send a message to Claude
   */
  static async sendMessage(req: Request, res: Response) {
    try {
      const {
        messages,
        systemPrompt,
        model,
        maxTokens,
        temperature,
      } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          error: 'Messages array is required',
        });
      }

      // Validate message format
      const validMessages = messages.every(
        (msg: any) =>
          msg.role && ['user', 'assistant'].includes(msg.role) && msg.content
      );

      if (!validMessages) {
        return res.status(400).json({
          error: 'Invalid message format. Each message must have role (user/assistant) and content',
        });
      }

      const response = await claudeService.sendMessage(
        messages as ClaudeMessage[],
        systemPrompt,
        { model, maxTokens, temperature }
      );

      res.json({
        success: true,
        response: response.content,
        usage: response.usage,
        model: response.model,
      });
    } catch (error) {
      logger.error('Claude message error:', error);
      res.status(500).json({
        error: 'Failed to process Claude request',
        message: error.message,
      });
    }
  }

  /**
   * Stream a response from Claude
   */
  static async streamMessage(req: Request, res: Response) {
    try {
      const {
        messages,
        systemPrompt,
        model,
        maxTokens,
        temperature,
      } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          error: 'Messages array is required',
        });
      }

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let totalContent = '';

      await claudeService.streamMessage(
        messages as ClaudeMessage[],
        systemPrompt,
        (chunk) => {
          totalContent += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        },
        { model, maxTokens, temperature }
      );

      // Send final message with complete response
      res.write(`data: ${JSON.stringify({ done: true, totalContent })}\n\n`);
      res.end();
    } catch (error) {
      logger.error('Claude streaming error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  /**
   * Complete a prompt
   */
  static async complete(req: Request, res: Response) {
    try {
      const {
        prompt,
        systemPrompt,
        model,
        maxTokens,
        temperature,
      } = req.body;

      if (!prompt) {
        return res.status(400).json({
          error: 'Prompt is required',
        });
      }

      const response = await claudeService.complete(prompt, {
        systemPrompt,
        model,
        maxTokens,
        temperature,
      });

      res.json({
        success: true,
        completion: response,
      });
    } catch (error) {
      logger.error('Claude completion error:', error);
      res.status(500).json({
        error: 'Failed to generate completion',
        message: error.message,
      });
    }
  }

  /**
   * Analyze text
   */
  static async analyzeText(req: Request, res: Response) {
    try {
      const { text, analysisType, customPrompt } = req.body;

      if (!text) {
        return res.status(400).json({
          error: 'Text is required',
        });
      }

      if (!analysisType || !['summary', 'sentiment', 'keywords', 'custom'].includes(analysisType)) {
        return res.status(400).json({
          error: 'Valid analysisType is required (summary, sentiment, keywords, custom)',
        });
      }

      if (analysisType === 'custom' && !customPrompt) {
        return res.status(400).json({
          error: 'customPrompt is required for custom analysis',
        });
      }

      const analysis = await claudeService.analyzeText(
        text,
        analysisType,
        customPrompt
      );

      res.json({
        success: true,
        analysisType,
        analysis,
      });
    } catch (error) {
      logger.error('Claude analysis error:', error);
      res.status(500).json({
        error: 'Failed to analyze text',
        message: error.message,
      });
    }
  }

  /**
   * Translate text
   */
  static async translate(req: Request, res: Response) {
    try {
      const { text, targetLanguage, sourceLanguage } = req.body;

      if (!text || !targetLanguage) {
        return res.status(400).json({
          error: 'Text and targetLanguage are required',
        });
      }

      const translation = await claudeService.translate(
        text,
        targetLanguage,
        sourceLanguage
      );

      res.json({
        success: true,
        sourceLanguage: sourceLanguage || 'auto-detected',
        targetLanguage,
        translation,
      });
    } catch (error) {
      logger.error('Claude translation error:', error);
      res.status(500).json({
        error: 'Failed to translate text',
        message: error.message,
      });
    }
  }

  /**
   * Generate code
   */
  static async generateCode(req: Request, res: Response) {
    try {
      const { requirements, language, framework, style } = req.body;

      if (!requirements || !language) {
        return res.status(400).json({
          error: 'Requirements and language are required',
        });
      }

      const code = await claudeService.generateCode(
        requirements,
        language,
        { framework, style }
      );

      res.json({
        success: true,
        language,
        framework,
        code,
      });
    } catch (error) {
      logger.error('Claude code generation error:', error);
      res.status(500).json({
        error: 'Failed to generate code',
        message: error.message,
      });
    }
  }

  /**
   * Answer a question
   */
  static async answerQuestion(req: Request, res: Response) {
    try {
      const { question, context, format } = req.body;

      if (!question) {
        return res.status(400).json({
          error: 'Question is required',
        });
      }

      const answer = await claudeService.answerQuestion(
        question,
        context,
        { format }
      );

      res.json({
        success: true,
        question,
        answer,
      });
    } catch (error) {
      logger.error('Claude answer error:', error);
      res.status(500).json({
        error: 'Failed to answer question',
        message: error.message,
      });
    }
  }
}