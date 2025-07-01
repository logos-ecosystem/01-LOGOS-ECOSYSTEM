import axios, { AxiosInstance } from 'axios';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  success: boolean;
  response?: string;
  completion?: string;
  analysis?: string;
  translation?: string;
  code?: string;
  answer?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model?: string;
}

interface StreamData {
  chunk?: string;
  done?: boolean;
  totalContent?: string;
  error?: string;
}

export class ClaudeService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    this.api = axios.create({
      baseURL: `${baseURL}/api/claude`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.api.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setAuthToken(token: string) {
    this.token = token;
  }

  async sendMessage(
    messages: ClaudeMessage[],
    options?: {
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<ClaudeResponse> {
    const response = await this.api.post('/message', {
      messages,
      ...options,
    });
    return response.data;
  }

  async streamMessage(
    messages: ClaudeMessage[],
    onChunk: (chunk: string) => void,
    onComplete?: (totalContent: string) => void,
    onError?: (error: string) => void,
    options?: {
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<void> {
    try {
      const response = await fetch(`${this.api.defaults.baseURL}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ messages, ...options }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamData = JSON.parse(line.slice(6));
              
              if (data.chunk) {
                onChunk(data.chunk);
              } else if (data.done && data.totalContent && onComplete) {
                onComplete(data.totalContent);
              } else if (data.error && onError) {
                onError(data.error);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (onError) {
        onError(error.message || 'Stream error occurred');
      }
      throw error;
    }
  }

  async complete(
    prompt: string,
    options?: {
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    const response = await this.api.post('/complete', {
      prompt,
      ...options,
    });
    return response.data.completion;
  }

  async analyzeText(
    text: string,
    analysisType: 'summary' | 'sentiment' | 'keywords' | 'custom',
    customPrompt?: string
  ): Promise<string> {
    const response = await this.api.post('/analyze', {
      text,
      analysisType,
      customPrompt,
    });
    return response.data.analysis;
  }

  async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    const response = await this.api.post('/translate', {
      text,
      targetLanguage,
      sourceLanguage,
    });
    return response.data.translation;
  }

  async generateCode(
    requirements: string,
    language: string,
    options?: {
      framework?: string;
      style?: string;
    }
  ): Promise<string> {
    const response = await this.api.post('/code', {
      requirements,
      language,
      ...options,
    });
    return response.data.code;
  }

  async answerQuestion(
    question: string,
    context?: string,
    format?: 'detailed' | 'concise' | 'bullet-points'
  ): Promise<string> {
    const response = await this.api.post('/answer', {
      question,
      context,
      format,
    });
    return response.data.answer;
  }
}

// Create singleton instance
let claudeServiceInstance: ClaudeService | null = null;

export function getClaudeService(): ClaudeService {
  if (!claudeServiceInstance) {
    claudeServiceInstance = new ClaudeService();
  }
  return claudeServiceInstance;
}

// Export default instance
export default getClaudeService();