import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AnthropicService {
  private client: Anthropic;
  private defaultModel: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey || apiKey.includes('XXX')) {
      logger.warn('Anthropic API key not configured - AI features will be limited');
      // Don't throw error to allow app to start without Anthropic
      this.client = null as any;
      return;
    }
    
    this.client = new Anthropic({
      apiKey: apiKey,
    });

    this.defaultModel = process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229';
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS || '2048');
    this.temperature = parseFloat(process.env.AI_TEMPERATURE || '0.7');
  }

  private ensureConfigured(): void {
    if (!this.client) {
      throw new Error('Anthropic service not configured. Please add ANTHROPIC_API_KEY to environment variables.');
    }
  }

  async generateResponse(
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number
  ): Promise<string> {
    this.ensureConfigured();
    
    try {
      const message = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: maxTokens || this.maxTokens,
        temperature: this.temperature,
        system: systemPrompt || 'You are a helpful AI assistant for LOGOS Ecosystem, a platform for AI-powered solutions.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      if (message.content[0].type === 'text') {
        return message.content[0].text;
      }
      
      return 'Unable to generate response';
    } catch (error: any) {
      logger.error('Anthropic API error:', error);
      
      if (error.status === 401) {
        throw new Error('Invalid Anthropic API key');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.status === 500) {
        throw new Error('Anthropic service temporarily unavailable');
      }
      
      throw new Error('Failed to generate AI response');
    }
  }

  async analyzeCode(code: string, language: string): Promise<string> {
    this.ensureConfigured();
    
    const systemPrompt = `You are an expert ${language} developer and code reviewer. 
Analyze the following code and provide insights on:
1. Code quality and adherence to ${language} best practices
2. Potential bugs, errors, or edge cases
3. Performance optimizations
4. Security vulnerabilities or concerns
5. Suggestions for improvement

Be specific and provide code examples where applicable.`;
    
    return this.generateResponse(
      `Please analyze this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      systemPrompt,
      4096
    );
  }

  async generateDocumentation(code: string, language: string): Promise<string> {
    this.ensureConfigured();
    
    const systemPrompt = `You are a technical documentation expert. 
Generate comprehensive documentation for the following ${language} code.
Include:
- Brief description of what the code does
- Parameters/Arguments (with types and descriptions)
- Return values (with types)
- Usage examples
- Potential exceptions or error cases
- Any important notes or caveats

Format the documentation in Markdown.`;
    
    return this.generateResponse(
      `Generate documentation for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      systemPrompt,
      2048
    );
  }

  async sendMessage(message: string): Promise<string> {
    return this.generateResponse(message);
  }

  async chatCompletion(
    messages: ChatMessage[],
    systemPrompt?: string,
    maxTokens?: number
  ): Promise<string> {
    this.ensureConfigured();
    
    try {
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: maxTokens || this.maxTokens,
        temperature: this.temperature,
        system: systemPrompt || 'You are LOGOS AI Assistant, helping users with the LOGOS Ecosystem platform.',
        messages: messages
      });

      if (response.content[0].type === 'text') {
        return response.content[0].text;
      }
      
      return 'Unable to generate response';
    } catch (error: any) {
      logger.error('Anthropic chat error:', error);
      throw this.handleError(error);
    }
  }

  async generateProductDescription(productInfo: {
    name: string;
    type: string;
    features: string[];
    targetAudience?: string;
  }): Promise<string> {
    this.ensureConfigured();
    
    const prompt = `Create a compelling product description for:
Product Name: ${productInfo.name}
Type: ${productInfo.type}
Key Features: ${productInfo.features.join(', ')}
Target Audience: ${productInfo.targetAudience || 'General users'}

The description should be engaging, highlight benefits, and be suitable for a marketplace listing.`;

    const systemPrompt = 'You are a marketing copywriter specializing in AI products and technology solutions.';
    
    return this.generateResponse(prompt, systemPrompt, 1024);
  }

  async suggestImprovements(
    productType: string,
    currentFeatures: string[],
    userFeedback?: string
  ): Promise<string> {
    this.ensureConfigured();
    
    const prompt = `Based on a ${productType} with current features: ${currentFeatures.join(', ')}
${userFeedback ? `User feedback: ${userFeedback}` : ''}

Suggest 5 improvements or new features that would enhance this product. 
Consider market trends, user needs, and technical feasibility.`;

    const systemPrompt = 'You are a product manager and AI expert with deep knowledge of market trends.';
    
    return this.generateResponse(prompt, systemPrompt, 1536);
  }

  async moderateContent(content: string): Promise<{
    isAppropriate: boolean;
    reason?: string;
  }> {
    this.ensureConfigured();
    
    try {
      const systemPrompt = `You are a content moderator. Analyze if the content is appropriate for a professional platform.
Check for: inappropriate language, spam, harmful content, or violations of professional standards.
Respond with JSON: {"isAppropriate": boolean, "reason": "explanation if not appropriate"}`;

      const response = await this.generateResponse(
        `Moderate this content: "${content}"`,
        systemPrompt,
        256
      );

      return JSON.parse(response);
    } catch (error) {
      logger.error('Content moderation error:', error);
      // Default to allowing content if moderation fails
      return { isAppropriate: true };
    }
  }

  private handleError(error: any): Error {
    if (error.status === 401) {
      return new Error('Invalid Anthropic API key');
    } else if (error.status === 429) {
      return new Error('Rate limit exceeded. Please try again later.');
    } else if (error.status === 500) {
      return new Error('AI service temporarily unavailable');
    }
    return new Error('AI service error');
  }

  // Get estimated tokens for text (rough approximation)
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  // Calculate cost for tokens
  calculateCost(inputTokens: number, outputTokens: number): number {
    const model = this.defaultModel;
    let inputCost = 0;
    let outputCost = 0;

    // Costs per million tokens
    if (model.includes('opus')) {
      inputCost = (inputTokens / 1_000_000) * 15;
      outputCost = (outputTokens / 1_000_000) * 75;
    } else if (model.includes('sonnet')) {
      inputCost = (inputTokens / 1_000_000) * 3;
      outputCost = (outputTokens / 1_000_000) * 15;
    } else if (model.includes('haiku')) {
      inputCost = (inputTokens / 1_000_000) * 0.25;
      outputCost = (outputTokens / 1_000_000) * 1.25;
    }

    return inputCost + outputCost;
  }
}

// Export singleton instance
export const anthropicService = new AnthropicService();