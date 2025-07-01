import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { aiSupportService } from '../../services/ai-support.service';
import { emailService } from '../../services/email.service';
import { notificationService } from '../../services/notification.service';
import { s3Service } from '../../services/s3.service';
import { logger } from '../../utils/logger';
import { TicketStatus, TicketPriority } from '@prisma/client';

export class SupportController {
  // Create new ticket with AI analysis
  async createTicket(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { subject, description, category: manualCategory, attachments } = req.body;

      // AI analysis of the ticket
      const analysis = await aiSupportService.analyzeTicket(
        subject,
        description,
        userId,
        attachments
      );

      // Create the ticket with AI-determined values
      const ticket = await prisma.supportTicket.create({
        data: {
          userId,
          subject,
          description,
          category: manualCategory || analysis.category,
          priority: analysis.priority,
          status: 'open',
          tags: analysis.keywords
        }
      });

      // Process attachments if any
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const fileUrl = await s3Service.uploadFile(
            file.buffer,
            `tickets/${ticket.id}/${file.originalname}`,
            file.mimetype
          );

          await prisma.ticketAttachment.create({
            data: {
              ticketId: ticket.id,
              filename: file.originalname,
              size: file.size,
              mimeType: file.mimetype,
              url: fileUrl
            }
          });
        }
      }

      // Check if ticket can be auto-resolved
      if (analysis.autoResolvable && analysis.suggestedResponse) {
        await aiSupportService.autoResolve(ticket.id);
      } else {
        // Create notification for support team
        const supportAgents = await prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPPORT'] } }
        });

        for (const agent of supportAgents) {
          await notificationService.create({
            userId: agent.id,
            type: 'info',
            category: 'support',
            title: 'New Support Ticket',
            message: `${analysis.priority.toUpperCase()} priority: ${subject}`,
            priority: analysis.priority === 'urgent' ? 'urgent' : 'medium',
            action: {
              type: 'link',
              label: 'View Ticket',
              url: `/dashboard/support/tickets/${ticket.id}`
            }
          });
        }

        // Send confirmation email to user
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          await emailService.sendEmail({
            to: user.email,
            subject: `Ticket #${ticket.id}: ${subject}`,
            template: 'ticket-created',
            data: {
              ticketId: ticket.id,
              subject,
              estimatedTime: analysis.estimatedResolutionTime
            }
          });
        }
      }

      res.json({
        ticket,
        analysis: {
          estimatedResolutionTime: analysis.estimatedResolutionTime,
          relatedArticles: analysis.knowledgeBaseArticles,
          autoResolved: analysis.autoResolvable
        }
      });
    } catch (error) {
      logger.error('Error creating ticket:', error);
      res.status(500).json({ error: 'Failed to create ticket' });
    }
  }

  // Get tickets with filters
  async getTickets(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const {
        status,
        priority,
        category,
        assignedTo,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const where: any = {};

      // Users can only see their own tickets, support/admin can see all
      if (userRole === 'USER') {
        where.userId = userId;
      } else if (assignedTo) {
        where.assignedTo = assignedTo === 'me' ? userId : assignedTo;
      }

      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (category) where.category = category;

      if (search) {
        where.OR = [
          { subject: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { id: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true
              }
            },
            messages: {
              select: { id: true },
              where: { isInternal: false }
            },
            _count: {
              select: { messages: true }
            }
          },
          orderBy: { [sortBy as string]: sortOrder },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit)
        }),
        prisma.supportTicket.count({ where })
      ]);

      // Add AI insights for support agents
      let ticketsWithInsights = tickets;
      if (userRole !== 'USER') {
        ticketsWithInsights = await Promise.all(
          tickets.map(async (ticket) => {
            const summary = await aiSupportService.generateTicketSummary(ticket.id);
            return {
              ...ticket,
              aiSummary: summary.summary,
              customerMood: summary.customerMood
            };
          })
        );
      }

      res.json({
        tickets: ticketsWithInsights,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error fetching tickets:', error);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  }

  // Get ticket details with AI insights
  async getTicket(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { ticketId } = req.params;

      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          user: true,
          messages: {
            include: {
              attachments: true
            },
            orderBy: { createdAt: 'asc' }
          },
          attachments: true,
          tags: true
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check access permission
      if (userRole === 'USER' && ticket.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get AI insights for support agents
      let aiInsights = null;
      if (userRole !== 'USER') {
        const [summary, similarTickets, suggestedResponse] = await Promise.all([
          aiSupportService.generateTicketSummary(ticketId),
          aiSupportService.suggestSimilarTickets(ticketId),
          aiSupportService.generateResponse(ticketId, userId)
        ]);

        aiInsights = {
          summary,
          similarTickets,
          suggestedResponse
        };
      }

      res.json({
        ticket,
        aiInsights
      });
    } catch (error) {
      logger.error('Error fetching ticket:', error);
      res.status(500).json({ error: 'Failed to fetch ticket' });
    }
  }

  // Reply to ticket with AI assistance
  async replyToTicket(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { ticketId } = req.params;
      const { message, isInternal = false, useAISuggestion = false } = req.body;

      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { user: true }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check permission
      if (userRole === 'USER' && ticket.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get AI suggestion if requested
      let finalMessage = message;
      if (useAISuggestion && userRole !== 'USER') {
        const suggestion = await aiSupportService.generateResponse(ticketId, userId);
        finalMessage = suggestion.solution;
      }

      // Create message
      const ticketMessage = await prisma.ticketMessage.create({
        data: {
          ticketId,
          userId,
          message: finalMessage,
          isInternal
        }
      });

      // Process attachments
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const fileUrl = await s3Service.uploadFile(
            file.buffer,
            `tickets/${ticketId}/messages/${ticketMessage.id}/${file.originalname}`,
            file.mimetype
          );

          await prisma.ticketAttachment.create({
            data: {
              messageId: ticketMessage.id,
              filename: file.originalname,
              size: file.size,
              mimeType: file.mimetype,
              url: fileUrl
            }
          });
        }
      }

      // Update ticket status
      let newStatus: TicketStatus = ticket.status;
      if (userRole === 'USER' && ticket.status === 'waiting_customer') {
        newStatus = 'open';
      } else if (userRole !== 'USER' && ticket.status === 'open') {
        newStatus = 'in_progress';
      }

      if (newStatus !== ticket.status) {
        await prisma.supportTicket.update({
          where: { id: ticketId },
          data: { status: newStatus }
        });
      }

      // Send notifications
      if (!isInternal) {
        if (userRole === 'USER') {
          // Notify support team
          const agents = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPPORT'] } }
          });

          for (const agent of agents) {
            await notificationService.create({
              userId: agent.id,
              type: 'info',
              category: 'support',
              title: 'Ticket Reply',
              message: `Customer replied to ticket: ${ticket.subject}`,
              action: {
                type: 'link',
                label: 'View Ticket',
                url: `/dashboard/support/tickets/${ticketId}`
              }
            });
          }
        } else {
          // Notify customer
          await notificationService.create({
            userId: ticket.userId,
            type: 'info',
            category: 'support',
            title: 'Support Reply',
            message: `Support team replied to your ticket: ${ticket.subject}`,
            action: {
              type: 'link',
              label: 'View Reply',
              url: `/dashboard/support/tickets/${ticketId}`
            }
          });

          // Send email
          await emailService.sendEmail({
            to: ticket.user.email,
            subject: `Re: ${ticket.subject}`,
            template: 'ticket-reply',
            data: {
              ticketId,
              subject: ticket.subject,
              message: finalMessage
            }
          });
        }
      }

      // Check for escalation
      await aiSupportService.checkEscalation(ticketId);

      res.json({
        message: ticketMessage,
        ticketStatus: newStatus
      });
    } catch (error) {
      logger.error('Error replying to ticket:', error);
      res.status(500).json({ error: 'Failed to reply to ticket' });
    }
  }

  // Update ticket status/assignment
  async updateTicket(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const { status, priority, assignedTo, tags } = req.body;

      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
      if (tags) updateData.tags = tags;

      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
      }

      const updatedTicket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: updateData
      });

      // Send notification if resolved
      if (status === 'resolved') {
        await notificationService.create({
          userId: ticket.userId,
          type: 'success',
          category: 'support',
          title: 'Ticket Resolved',
          message: `Your ticket "${ticket.subject}" has been resolved`,
          action: {
            type: 'link',
            label: 'Rate Support',
            url: `/dashboard/support/tickets/${ticketId}/feedback`
          }
        });
      }

      res.json(updatedTicket);
    } catch (error) {
      logger.error('Error updating ticket:', error);
      res.status(500).json({ error: 'Failed to update ticket' });
    }
  }

  // Get AI suggestions for a ticket
  async getAISuggestions(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;

      const [suggestedResponse, similarTickets, summary] = await Promise.all([
        aiSupportService.generateResponse(ticketId, req.user?.id),
        aiSupportService.suggestSimilarTickets(ticketId, 3),
        aiSupportService.generateTicketSummary(ticketId)
      ]);

      res.json({
        suggestedResponse,
        similarTickets,
        summary
      });
    } catch (error) {
      logger.error('Error getting AI suggestions:', error);
      res.status(500).json({ error: 'Failed to get AI suggestions' });
    }
  }

  // Get support metrics
  async getMetrics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);

      const [
        totalTickets,
        ticketsByStatus,
        ticketsByPriority,
        ticketsByCategory,
        avgResolutionTime,
        satisfactionStats
      ] = await Promise.all([
        // Total tickets
        prisma.supportTicket.count({
          where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : undefined
        }),

        // Tickets by status
        prisma.supportTicket.groupBy({
          by: ['status'],
          where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : undefined,
          _count: true
        }),

        // Tickets by priority
        prisma.supportTicket.groupBy({
          by: ['priority'],
          where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : undefined,
          _count: true
        }),

        // Tickets by category
        prisma.supportTicket.groupBy({
          by: ['category'],
          where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : undefined,
          _count: true
        }),

        // Average resolution time
        this.calculateAvgResolutionTime(dateFilter),

        // Satisfaction stats
        this.calculateSatisfactionStats(dateFilter)
      ]);

      res.json({
        overview: {
          totalTickets,
          avgResolutionTime,
          satisfactionRate: satisfactionStats.rate
        },
        distribution: {
          byStatus: ticketsByStatus,
          byPriority: ticketsByPriority,
          byCategory: ticketsByCategory
        },
        satisfaction: satisfactionStats
      });
    } catch (error) {
      logger.error('Error fetching support metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }

  // Get knowledge base articles
  async getKnowledgeBase(req: Request, res: Response) {
    try {
      const { search, category, limit = 10 } = req.query;

      // This would connect to a real knowledge base system
      // For now, return mock data
      const articles = [
        {
          id: 'kb-001',
          title: 'Getting Started with LOGOS AI',
          category: 'getting-started',
          content: 'Learn how to set up your first AI bot...',
          views: 1250,
          helpful: 89
        },
        {
          id: 'kb-002',
          title: 'API Documentation',
          category: 'technical',
          content: 'Complete API reference for LOGOS AI...',
          views: 3420,
          helpful: 95
        }
      ];

      res.json({ articles });
    } catch (error) {
      logger.error('Error fetching knowledge base:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base' });
    }
  }

  // Submit ticket feedback
  async submitFeedback(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { ticketId } = req.params;
      const { satisfaction, comment } = req.body;

      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket || ticket.userId !== userId) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { satisfaction }
      });

      // Create internal note if comment provided
      if (comment) {
        await prisma.ticketMessage.create({
          data: {
            ticketId,
            userId,
            message: `Customer feedback (${satisfaction}/5): ${comment}`,
            isInternal: true
          }
        });
      }

      res.json({ message: 'Feedback submitted successfully' });
    } catch (error) {
      logger.error('Error submitting feedback:', error);
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  }

  // Private helper methods
  private async calculateAvgResolutionTime(dateFilter: any): Promise<number> {
    const resolvedTickets = await prisma.supportTicket.findMany({
      where: {
        status: 'resolved',
        resolvedAt: { not: null },
        createdAt: dateFilter
      },
      select: {
        createdAt: true,
        resolvedAt: true
      }
    });

    if (resolvedTickets.length === 0) return 0;

    const totalTime = resolvedTickets.reduce((sum, ticket) => {
      const created = ticket.createdAt.getTime();
      const resolved = ticket.resolvedAt!.getTime();
      return sum + (resolved - created);
    }, 0);

    return Math.round(totalTime / resolvedTickets.length / (1000 * 60 * 60)); // Convert to hours
  }

  private async calculateSatisfactionStats(dateFilter: any) {
    const feedbacks = await prisma.supportTicket.findMany({
      where: {
        satisfaction: { not: null },
        createdAt: dateFilter
      },
      select: { satisfaction: true }
    });

    if (feedbacks.length === 0) {
      return { rate: 0, count: 0, average: 0 };
    }

    const total = feedbacks.reduce((sum, f) => sum + (f.satisfaction || 0), 0);
    const average = total / feedbacks.length;
    const rate = (feedbacks.filter(f => (f.satisfaction || 0) >= 4).length / feedbacks.length) * 100;

    return {
      rate: Math.round(rate),
      count: feedbacks.length,
      average: Math.round(average * 10) / 10
    };
  }
}

export const supportController = new SupportController();