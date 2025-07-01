import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
}

export class ClaudeService {
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor(config: ClaudeConfig) {
    if (!config.apiKey) {
      throw new Error('Claude API key is required');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
    });

    this.defaultModel = config.model || 'claude-3-opus-20240229';
    this.defaultMaxTokens = config.maxTokens || 4096;
    this.defaultTemperature = config.temperature || 0.7;

    logger.info('Claude service initialized', {
      model: this.defaultModel,
      maxTokens: this.defaultMaxTokens,
    });
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(
    messages: ClaudeMessage[],
    systemPrompt?: string,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<ClaudeResponse> {
    try {
      const response = await this.client.messages.create({
        model: options?.model || this.defaultModel,
        max_tokens: options?.maxTokens || this.defaultMaxTokens,
        temperature: options?.temperature || this.defaultTemperature,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      logger.info('Claude API response received', {
        model: response.model,
        usage: response.usage,
      });

      return {
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        model: response.model,
      };
    } catch (error) {
      logger.error('Claude API error:', error);
      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  /**
   * Stream a response from Claude
   */
  async streamMessage(
    messages: ClaudeMessage[],
    systemPrompt?: string,
    onChunk?: (chunk: string) => void,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<ClaudeResponse> {
    try {
      const stream = await this.client.messages.create({
        model: options?.model || this.defaultModel,
        max_tokens: options?.maxTokens || this.defaultMaxTokens,
        temperature: options?.temperature || this.defaultTemperature,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      });

      let fullContent = '';
      let usage = { inputTokens: 0, outputTokens: 0 };

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text;
          fullContent += text;
          if (onChunk) {
            onChunk(text);
          }
        } else if (chunk.type === 'message_delta') {
          if (chunk.usage) {
            usage.outputTokens = chunk.usage.output_tokens;
          }
        } else if (chunk.type === 'message_start') {
          if (chunk.message.usage) {
            usage.inputTokens = chunk.message.usage.input_tokens;
          }
        }
      }

      logger.info('Claude streaming completed', {
        contentLength: fullContent.length,
        usage,
      });

      return {
        content: fullContent,
        usage,
        model: options?.model || this.defaultModel,
      };
    } catch (error) {
      logger.error('Claude streaming error:', error);
      throw new Error(`Claude streaming error: ${error.message}`);
    }
  }

  /**
   * Generate a completion for a single prompt
   */
  async complete(
    prompt: string,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<string> {
    const response = await this.sendMessage(
      [{ role: 'user', content: prompt }],
      options?.systemPrompt,
      options
    );
    return response.content;
  }

  /**
   * Analyze text and return insights
   */
  async analyzeText(
    text: string,
    analysisType: 'summary' | 'sentiment' | 'keywords' | 'custom',
    customPrompt?: string
  ): Promise<string> {
    const prompts = {
      summary: 'Please provide a concise summary of the following text:',
      sentiment: 'Analyze the sentiment of the following text and provide a detailed sentiment analysis:',
      keywords: 'Extract the main keywords and key phrases from the following text:',
      custom: customPrompt || 'Analyze the following text:',
    };

    const systemPrompt = 'You are a helpful AI assistant specialized in text analysis.';
    const prompt = `${prompts[analysisType]}\n\n${text}`;

    return this.complete(prompt, { systemPrompt });
  }

  /**
   * Translate text to a target language
   */
  async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    const systemPrompt = 'You are a professional translator. Provide only the translation without any explanations.';
    const prompt = sourceLanguage
      ? `Translate the following text from ${sourceLanguage} to ${targetLanguage}:\n\n${text}`
      : `Translate the following text to ${targetLanguage}:\n\n${text}`;

    return this.complete(prompt, { systemPrompt });
  }

  /**
   * Generate code based on requirements
   */
  async generateCode(
    requirements: string,
    language: string,
    options?: {
      framework?: string;
      style?: string;
    }
  ): Promise<string> {
    const systemPrompt = `You are an expert ${language} developer. Generate clean, efficient, and well-commented code.`;
    let prompt = `Generate ${language} code for the following requirements:\n\n${requirements}`;

    if (options?.framework) {
      prompt += `\n\nUse the ${options.framework} framework.`;
    }
    if (options?.style) {
      prompt += `\n\nFollow ${options.style} coding style.`;
    }

    return this.complete(prompt, { systemPrompt, temperature: 0.3 });
  }

  /**
   * Answer questions based on context
   */
  async answerQuestion(
    question: string,
    context?: string,
    options?: {
      format?: 'detailed' | 'concise' | 'bullet-points';
    }
  ): Promise<string> {
    let systemPrompt = 'You are a knowledgeable AI assistant. ';
    
    switch (options?.format) {
      case 'concise':
        systemPrompt += 'Provide concise, direct answers.';
        break;
      case 'bullet-points':
        systemPrompt += 'Structure your answers using bullet points.';
        break;
      default:
        systemPrompt += 'Provide detailed, comprehensive answers.';
    }

    let prompt = question;
    if (context) {
      prompt = `Context: ${context}\n\nQuestion: ${question}`;
    }

    return this.complete(prompt, { systemPrompt });
  }
}

// Factory function to create Claude service instance
export function createClaudeService(): ClaudeService {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY or CLAUDE_API_KEY environment variable is required');
  }

  return new ClaudeService({
    apiKey,
    model: process.env.CLAUDE_MODEL,
    maxTokens: process.env.CLAUDE_MAX_TOKENS ? parseInt(process.env.CLAUDE_MAX_TOKENS) : undefined,
    temperature: process.env.CLAUDE_TEMPERATURE ? parseFloat(process.env.CLAUDE_TEMPERATURE) : undefined,
  });
}