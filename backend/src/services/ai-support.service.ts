import { prisma } from '../config/database';
import { anthropicService } from './anthropic.service';
import { openaiService } from './openai.service';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import { emailService } from './email.service';
import { 
  TicketCategory, 
  TicketPriority, 
  TicketStatus 
} from '@prisma/client';

interface TicketAnalysis {
  category: TicketCategory;
  priority: TicketPriority;
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  suggestedResponse?: string;
  relatedTickets?: string[];
  keywords: string[];
  estimatedResolutionTime?: number; // in minutes
  autoResolvable: boolean;
  suggestedActions?: string[];
  knowledgeBaseArticles?: Array<{
    id: string;
    title: string;
    relevance: number;
  }>;
}

interface ResolutionSuggestion {
  solution: string;
  confidence: number;
  steps: string[];
  resources?: string[];
  estimatedTime: number;
}

interface TicketSummary {
  summary: string;
  keyPoints: string[];
  customerMood: string;
  nextSteps: string[];
}

class AISupportService {
  private knowledgeBase: Map<string, any> = new Map();
  private ticketPatterns: Map<string, any> = new Map();

  constructor() {
    this.loadKnowledgeBase();
    this.loadTicketPatterns();
  }

  // Load knowledge base from database or files
  private async loadKnowledgeBase() {
    // This would load from a database or knowledge base system
    this.knowledgeBase.set('payment-issues', {
      solutions: [
        'Verify payment method is valid',
        'Check for sufficient funds',
        'Try alternative payment method',
        'Clear browser cache and cookies'
      ],
      articles: ['how-to-update-payment', 'payment-troubleshooting']
    });

    this.knowledgeBase.set('api-errors', {
      solutions: [
        'Check API key validity',
        'Verify rate limits',
        'Review request format',
        'Check service status'
      ],
      articles: ['api-documentation', 'error-codes', 'rate-limiting']
    });

    // Add more knowledge base entries
  }

  // Load common ticket patterns
  private async loadTicketPatterns() {
    this.ticketPatterns.set('login-issue', {
      keywords: ['login', 'sign in', 'password', 'access', 'cant log in'],
      category: 'account',
      priority: 'medium'
    });

    this.ticketPatterns.set('billing-inquiry', {
      keywords: ['bill', 'invoice', 'charge', 'payment', 'subscription', 'refund'],
      category: 'billing',
      priority: 'high'
    });

    // Add more patterns
  }

  // Analyze ticket using AI
  async analyzeTicket(
    subject: string,
    description: string,
    userId: string,
    attachments?: any[]
  ): Promise<TicketAnalysis> {
    try {
      // Get user context
      const userContext = await this.getUserContext(userId);

      // Prepare prompt for AI analysis
      const prompt = `Analyze this support ticket and provide structured analysis:

Subject: ${subject}
Description: ${description}

User Context:
- Plan: ${userContext.plan}
- Account Age: ${userContext.accountAge} days
- Previous Tickets: ${userContext.previousTickets}
- Products Used: ${userContext.products.join(', ')}

Please analyze and return:
1. Category (technical, billing, account, feature_request, bug_report, integration, other)
2. Priority (low, medium, high, urgent)
3. Sentiment (positive, neutral, negative, urgent)
4. Keywords (relevant technical terms)
5. Whether this can be auto-resolved
6. Suggested initial response
7. Estimated resolution time in minutes`;

      const aiResponse = await anthropicService.sendMessage(prompt, {
        systemPrompt: 'You are an expert support ticket analyzer. Provide accurate categorization and helpful suggestions.',
        temperature: 0.3
      });

      // Parse AI response
      const analysis = this.parseAIAnalysis(aiResponse.content);

      // Find related tickets
      const relatedTickets = await this.findRelatedTickets(
        analysis.keywords,
        userId
      );

      // Get knowledge base articles
      const articles = await this.findRelevantArticles(
        analysis.keywords,
        analysis.category
      );

      return {
        ...analysis,
        relatedTickets: relatedTickets.map(t => t.id),
        knowledgeBaseArticles: articles
      };
    } catch (error) {
      logger.error('Error analyzing ticket:', error);
      
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(subject, description);
    }
  }

  // Generate AI response for ticket
  async generateResponse(
    ticketId: string,
    agentId?: string
  ): Promise<ResolutionSuggestion> {
    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          },
          user: true
        }
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Build conversation context
      const conversationContext = ticket.messages
        .map(m => `${m.isInternal ? '[Internal]' : '[Customer]'}: ${m.message}`)
        .join('\n');

      const prompt = `Generate a helpful response for this support ticket:

Subject: ${ticket.subject}
Category: ${ticket.category}
Priority: ${ticket.priority}

Original Issue:
${ticket.description}

Conversation History:
${conversationContext}

Please provide:
1. A professional and helpful response
2. Confidence level (0-100)
3. Step-by-step solution if applicable
4. Relevant resources or documentation
5. Estimated time to implement the solution`;

      const aiResponse = await openaiService.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful and knowledgeable support agent. Provide clear, accurate, and empathetic responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      });

      const suggestion = this.parseResolutionSuggestion(
        aiResponse.choices[0].message.content || ''
      );

      // Log AI assistance
      await this.logAIAssistance(ticketId, agentId, suggestion);

      return suggestion;
    } catch (error) {
      logger.error('Error generating response:', error);
      throw error;
    }
  }

  // Auto-resolve simple tickets
  async autoResolve(ticketId: string): Promise<boolean> {
    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { user: true }
      });

      if (!ticket) {
        return false;
      }

      // Check if ticket is eligible for auto-resolution
      const analysis = await this.analyzeTicket(
        ticket.subject,
        ticket.description,
        ticket.userId
      );

      if (!analysis.autoResolvable || !analysis.suggestedResponse) {
        return false;
      }

      // Create auto-response
      await prisma.ticketMessage.create({
        data: {
          ticketId,
          userId: 'system', // System user ID
          message: analysis.suggestedResponse,
          isInternal: false
        }
      });

      // Update ticket status
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'waiting_customer',
          updatedAt: new Date()
        }
      });

      // Send notification to user
      await notificationService.create({
        userId: ticket.userId,
        type: 'info',
        category: 'support',
        title: 'Ticket Update',
        message: `We've responded to your ticket: ${ticket.subject}`,
        action: {
          type: 'link',
          label: 'View Ticket',
          url: `/dashboard/support/tickets/${ticketId}`
        }
      });

      // Send email
      await emailService.sendEmail({
        to: ticket.user.email,
        subject: `Re: ${ticket.subject}`,
        template: 'ticket-response',
        data: {
          ticketId,
          subject: ticket.subject,
          response: analysis.suggestedResponse
        }
      });

      return true;
    } catch (error) {
      logger.error('Error auto-resolving ticket:', error);
      return false;
    }
  }

  // Suggest similar resolved tickets
  async suggestSimilarTickets(
    ticketId: string,
    limit: number = 5
  ): Promise<Array<{
    ticket: any;
    similarity: number;
    resolution: string;
  }>> {
    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        return [];
      }

      // Get ticket embeddings
      const embedding = await this.getTicketEmbedding(
        ticket.subject,
        ticket.description
      );

      // Find similar resolved tickets
      const resolvedTickets = await prisma.supportTicket.findMany({
        where: {
          status: 'resolved',
          id: { not: ticketId }
        },
        include: {
          messages: true
        },
        take: 100 // Get more to filter by similarity
      });

      // Calculate similarities
      const similarities = await Promise.all(
        resolvedTickets.map(async (resolved) => {
          const resolvedEmbedding = await this.getTicketEmbedding(
            resolved.subject,
            resolved.description
          );
          
          const similarity = this.cosineSimilarity(embedding, resolvedEmbedding);
          
          return {
            ticket: resolved,
            similarity,
            resolution: this.extractResolution(resolved.messages)
          };
        })
      );

      // Sort by similarity and return top matches
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .filter(s => s.similarity > 0.7); // Threshold for relevance
    } catch (error) {
      logger.error('Error finding similar tickets:', error);
      return [];
    }
  }

  // Generate ticket summary
  async generateTicketSummary(ticketId: string): Promise<TicketSummary> {
    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const conversation = ticket.messages
        .map(m => `${m.isInternal ? '[Internal]' : '[Customer]'}: ${m.message}`)
        .join('\n');

      const prompt = `Summarize this support ticket conversation:

Subject: ${ticket.subject}
Original Issue: ${ticket.description}

Conversation:
${conversation}

Provide:
1. Brief summary (2-3 sentences)
2. Key points discussed
3. Customer mood/sentiment
4. Recommended next steps`;

      const response = await anthropicService.sendMessage(prompt, {
        systemPrompt: 'You are an expert at summarizing support conversations concisely and accurately.'
      });

      return this.parseTicketSummary(response.content);
    } catch (error) {
      logger.error('Error generating ticket summary:', error);
      throw error;
    }
  }

  // Predict resolution time
  async predictResolutionTime(
    category: TicketCategory,
    priority: TicketPriority,
    complexity: number // 1-10
  ): Promise<number> {
    try {
      // Get historical data
      const historicalData = await prisma.supportTicket.findMany({
        where: {
          category,
          priority,
          status: 'resolved',
          resolvedAt: { not: null }
        },
        select: {
          createdAt: true,
          resolvedAt: true
        },
        take: 100
      });

      if (historicalData.length === 0) {
        // Default estimates based on priority
        const baseTime = {
          urgent: 60,    // 1 hour
          high: 240,     // 4 hours
          medium: 480,   // 8 hours
          low: 1440      // 24 hours
        };

        return baseTime[priority] * (complexity / 5);
      }

      // Calculate average resolution time
      const resolutionTimes = historicalData.map(ticket => {
        const created = new Date(ticket.createdAt).getTime();
        const resolved = new Date(ticket.resolvedAt!).getTime();
        return (resolved - created) / (1000 * 60); // Convert to minutes
      });

      const avgTime = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
      
      // Adjust based on complexity
      return Math.round(avgTime * (complexity / 5));
    } catch (error) {
      logger.error('Error predicting resolution time:', error);
      return 240; // Default 4 hours
    }
  }

  // Escalate ticket based on criteria
  async checkEscalation(ticketId: string): Promise<boolean> {
    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          messages: true,
          user: {
            include: {
              subscriptions: {
                where: { status: 'active' }
              }
            }
          }
        }
      });

      if (!ticket) {
        return false;
      }

      // Escalation criteria
      const criteria = {
        // Time-based
        urgentOverdue: ticket.priority === 'urgent' && 
          this.getHoursSinceCreated(ticket.createdAt) > 1,
        highOverdue: ticket.priority === 'high' && 
          this.getHoursSinceCreated(ticket.createdAt) > 4,
        
        // Customer-based
        premiumCustomer: ticket.user.subscriptions.some(s => 
          s.planId.includes('premium') || s.planId.includes('enterprise')
        ),
        
        // Sentiment-based
        negativeMessages: ticket.messages.filter(m => 
          this.detectNegativeSentiment(m.message)
        ).length >= 2,
        
        // Complexity-based
        longConversation: ticket.messages.length > 10,
        
        // Keywords
        escalationKeywords: this.containsEscalationKeywords(
          ticket.subject + ' ' + ticket.description
        )
      };

      // Check if any criteria is met
      const shouldEscalate = Object.values(criteria).some(c => c);

      if (shouldEscalate) {
        await this.escalateTicket(ticketId, criteria);
      }

      return shouldEscalate;
    } catch (error) {
      logger.error('Error checking escalation:', error);
      return false;
    }
  }

  // Private helper methods
  private async getUserContext(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true }
        },
        products: true,
        supportTickets: {
          select: { id: true }
        }
      }
    });

    const accountAge = user ? 
      Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      plan: user?.subscriptions[0]?.plan.name || 'Free',
      accountAge,
      previousTickets: user?.supportTickets.length || 0,
      products: user?.products.map(p => p.name) || []
    };
  }

  private parseAIAnalysis(content: string): Partial<TicketAnalysis> {
    // Parse AI response into structured format
    // This is a simplified version - in production, use more robust parsing
    
    const lines = content.split('\n');
    const analysis: Partial<TicketAnalysis> = {
      keywords: [],
      suggestedActions: []
    };

    lines.forEach(line => {
      if (line.includes('Category:')) {
        analysis.category = line.split(':')[1].trim().toLowerCase() as TicketCategory;
      } else if (line.includes('Priority:')) {
        analysis.priority = line.split(':')[1].trim().toLowerCase() as TicketPriority;
      } else if (line.includes('Sentiment:')) {
        analysis.sentiment = line.split(':')[1].trim().toLowerCase() as any;
      } else if (line.includes('Auto-resolvable:')) {
        analysis.autoResolvable = line.toLowerCase().includes('yes');
      } else if (line.includes('Keywords:')) {
        analysis.keywords = line.split(':')[1].split(',').map(k => k.trim());
      }
    });

    return analysis;
  }

  private fallbackAnalysis(subject: string, description: string): TicketAnalysis {
    const text = `${subject} ${description}`.toLowerCase();
    
    // Simple rule-based categorization
    let category: TicketCategory = 'other';
    let priority: TicketPriority = 'medium';
    
    if (text.includes('payment') || text.includes('billing') || text.includes('invoice')) {
      category = 'billing';
      priority = 'high';
    } else if (text.includes('bug') || text.includes('error') || text.includes('broken')) {
      category = 'bug_report';
      priority = 'high';
    } else if (text.includes('api') || text.includes('integration')) {
      category = 'integration';
    } else if (text.includes('feature') || text.includes('request')) {
      category = 'feature_request';
      priority = 'low';
    }

    return {
      category,
      priority,
      sentiment: 'neutral',
      keywords: text.split(' ').filter(w => w.length > 4),
      autoResolvable: false,
      estimatedResolutionTime: 240
    };
  }

  private async findRelatedTickets(
    keywords: string[],
    userId: string
  ): Promise<any[]> {
    return prisma.supportTicket.findMany({
      where: {
        OR: keywords.map(keyword => ({
          OR: [
            { subject: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } }
          ]
        })),
        userId
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
  }

  private async findRelevantArticles(
    keywords: string[],
    category: TicketCategory
  ): Promise<Array<{ id: string; title: string; relevance: number }>> {
    // In a real implementation, this would search a knowledge base
    const articles = [];
    
    const categoryArticles = this.knowledgeBase.get(category);
    if (categoryArticles?.articles) {
      articles.push(...categoryArticles.articles.map((article: string) => ({
        id: article,
        title: article.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        relevance: 0.8
      })));
    }

    return articles;
  }

  private parseResolutionSuggestion(content: string): ResolutionSuggestion {
    // Parse AI response into structured format
    return {
      solution: content,
      confidence: 85,
      steps: ['Step 1', 'Step 2'], // Parse from content
      resources: [],
      estimatedTime: 30
    };
  }

  private parseTicketSummary(content: string): TicketSummary {
    // Parse AI response into structured format
    return {
      summary: 'Ticket summary',
      keyPoints: ['Point 1', 'Point 2'],
      customerMood: 'neutral',
      nextSteps: ['Next step 1', 'Next step 2']
    };
  }

  private async getTicketEmbedding(subject: string, description: string): Promise<number[]> {
    // Use OpenAI embeddings API
    const response = await openaiService.embeddings.create({
      model: 'text-embedding-ada-002',
      input: `${subject}\n${description}`
    });

    return response.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private extractResolution(messages: any[]): string {
    // Find the resolution message (usually the last non-internal message before closing)
    const resolutionMessages = messages
      .filter(m => !m.isInternal)
      .slice(-3); // Last 3 customer-facing messages

    return resolutionMessages
      .map(m => m.message)
      .join('\n');
  }

  private getHoursSinceCreated(createdAt: Date): number {
    return (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  }

  private detectNegativeSentiment(text: string): boolean {
    const negativeWords = [
      'angry', 'frustrated', 'disappointed', 'unacceptable',
      'terrible', 'worst', 'hate', 'stupid', 'ridiculous',
      'pathetic', 'useless', 'waste', 'scam', 'fraud'
    ];

    const lowerText = text.toLowerCase();
    return negativeWords.some(word => lowerText.includes(word));
  }

  private containsEscalationKeywords(text: string): boolean {
    const keywords = [
      'manager', 'supervisor', 'escalate', 'complaint',
      'legal', 'lawyer', 'sue', 'refund', 'cancel',
      'unsubscribe', 'chargeback'
    ];

    const lowerText = text.toLowerCase();
    return keywords.some(word => lowerText.includes(word));
  }

  private async escalateTicket(ticketId: string, criteria: any) {
    // Update ticket priority
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        priority: 'urgent',
        tags: {
          push: 'escalated'
        }
      }
    });

    // Notify managers
    const managers = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    for (const manager of managers) {
      await notificationService.create({
        userId: manager.id,
        type: 'warning',
        category: 'support',
        title: 'Ticket Escalated',
        message: `Ticket #${ticketId} has been escalated based on: ${Object.entries(criteria)
          .filter(([_, value]) => value)
          .map(([key]) => key)
          .join(', ')}`,
        priority: 'urgent',
        action: {
          type: 'link',
          label: 'View Ticket',
          url: `/dashboard/support/tickets/${ticketId}`
        }
      });
    }
  }

  private async logAIAssistance(
    ticketId: string,
    agentId: string | undefined,
    suggestion: ResolutionSuggestion
  ) {
    await prisma.auditLog.create({
      data: {
        userId: agentId,
        action: 'ai_support_assistance',
        entity: 'ticket',
        entityId: ticketId,
        metadata: {
          confidence: suggestion.confidence,
          estimatedTime: suggestion.estimatedTime
        }
      }
    });
  }
}

// Export singleton instance
export const aiSupportService = new AISupportService();