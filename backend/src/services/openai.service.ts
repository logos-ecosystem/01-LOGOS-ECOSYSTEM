import { OpenAI } from 'openai';
import { logger } from '../utils/logger';

export class OpenAIService {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async generateResponse(prompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw error;
    }
  }

  async analyzeTicket(content: string): Promise<any> {
    if (!this.openai) {
      return {
        category: 'general',
        priority: 'medium',
        sentiment: 'neutral',
      };
    }

    const prompt = `Analyze this support ticket and provide:
    1. Category (technical, billing, general, feature_request)
    2. Priority (low, medium, high, urgent)
    3. Sentiment (positive, neutral, negative, urgent)
    
    Ticket: ${content}
    
    Respond in JSON format.`;

    try {
      const response = await this.generateResponse(prompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('Failed to analyze ticket:', error);
      return {
        category: 'general',
        priority: 'medium',
        sentiment: 'neutral',
      };
    }
  }
}

export const openAIService = new OpenAIService();