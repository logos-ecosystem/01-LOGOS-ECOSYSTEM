import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { sendEmail } from '../services/email.service';
import { uploadFile } from '../services/storage.service';

const prisma = new PrismaClient();

export class SupportController {
  // Get tickets
  async getTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { status, category, priority, limit = 20, offset = 0 } = req.query;

      const where: any = { userId };
      if (status) where.status = status;
      if (category) where.category = category;
      if (priority) where.priority = priority;

      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          include: {
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' }
            },
            attachments: true,
            tags: true
          },
          take: Number(limit),
          skip: Number(offset),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.supportTicket.count({ where })
      ]);

      res.json({ tickets, total });
    } catch (error) {
      logger.error('Error fetching tickets:', error);
      next(error);
    }
  }

  // Get ticket details
  async getTicketDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const ticket = await prisma.supportTicket.findFirst({
        where: { id, userId },
        include: {
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

      res.json(ticket);
    } catch (error) {
      logger.error('Error fetching ticket details:', error);
      next(error);
    }
  }

  // Create new ticket
  async createTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { subject, description, category, priority } = req.body;
      const files = req.files as Express.Multer.File[];

      // Create ticket
      const ticket = await prisma.supportTicket.create({
        data: {
          userId,
          subject,
          description,
          category,
          priority,
          status: 'open'
        }
      });

      // Handle file attachments
      if (files && files.length > 0) {
        const attachments = await Promise.all(
          files.map(async (file) => {
            const url = await uploadFile(file, `tickets/${ticket.id}`);
            return {
              ticketId: ticket.id,
              filename: file.originalname,
              size: file.size,
              mimeType: file.mimetype,
              url
            };
          })
        );

        await prisma.ticketAttachment.createMany({
          data: attachments
        });
      }

      // Create initial message
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          userId,
          message: description,
          isInternal: false
        }
      });

      // Send email notification to support team
      await sendEmail({
        to: process.env.SUPPORT_EMAIL || 'support@logos-ecosystem.com',
        subject: `New Support Ticket: ${subject}`,
        template: 'new-ticket',
        data: {
          ticketId: ticket.id,
          subject,
          category,
          priority,
          userEmail: req.user.email
        }
      });

      res.status(201).json(ticket);
    } catch (error) {
      logger.error('Error creating ticket:', error);
      next(error);
    }
  }

  // Update ticket
  async updateTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const ticket = await prisma.supportTicket.update({
        where: { id },
        data: updates
      });

      res.json(ticket);
    } catch (error) {
      logger.error('Error updating ticket:', error);
      next(error);
    }
  }

  // Close ticket
  async closeTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { satisfaction } = req.body;

      const ticket = await prisma.supportTicket.update({
        where: { id },
        data: {
          status: 'closed',
          resolvedAt: new Date(),
          satisfaction
        }
      });

      res.json(ticket);
    } catch (error) {
      logger.error('Error closing ticket:', error);
      next(error);
    }
  }

  // Add message to ticket
  async addMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: ticketId } = req.params;
      const { message } = req.body;
      const userId = req.user.id;
      const files = req.files as Express.Multer.File[];

      // Verify ticket exists and user has access
      const ticket = await prisma.supportTicket.findFirst({
        where: { 
          id: ticketId,
          OR: [
            { userId },
            { assignedTo: userId }
          ]
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Create message
      const ticketMessage = await prisma.ticketMessage.create({
        data: {
          ticketId,
          userId,
          message,
          isInternal: req.user.role === 'SUPPORT' || req.user.role === 'ADMIN'
        }
      });

      // Handle attachments
      if (files && files.length > 0) {
        const attachments = await Promise.all(
          files.map(async (file) => {
            const url = await uploadFile(file, `tickets/${ticketId}/messages`);
            return {
              messageId: ticketMessage.id,
              filename: file.originalname,
              size: file.size,
              mimeType: file.mimetype,
              url
            };
          })
        );

        await prisma.ticketAttachment.createMany({
          data: attachments
        });
      }

      // Update ticket status if needed
      if (ticket.status === 'waiting_customer' && userId === ticket.userId) {
        await prisma.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'waiting_support' }
        });
      } else if (ticket.status === 'waiting_support' && userId !== ticket.userId) {
        await prisma.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'waiting_customer' }
        });
      }

      res.json(ticketMessage);
    } catch (error) {
      logger.error('Error adding message:', error);
      next(error);
    }
  }

  // Get ticket messages
  async getTicketMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: ticketId } = req.params;

      const messages = await prisma.ticketMessage.findMany({
        where: { ticketId },
        include: {
          attachments: true
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json(messages);
    } catch (error) {
      logger.error('Error fetching messages:', error);
      next(error);
    }
  }

  // Get ticket statistics
  async getTicketStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;

      const [open, inProgress, resolved, tickets] = await Promise.all([
        prisma.supportTicket.count({
          where: { userId, status: 'open' }
        }),
        prisma.supportTicket.count({
          where: { userId, status: 'in_progress' }
        }),
        prisma.supportTicket.count({
          where: { userId, status: 'resolved' }
        }),
        prisma.supportTicket.findMany({
          where: { userId },
          select: {
            createdAt: true,
            resolvedAt: true,
            satisfaction: true,
            messages: {
              select: {
                createdAt: true,
                userId: true
              }
            }
          }
        })
      ]);

      // Calculate average response time
      let totalResponseTime = 0;
      let responseCount = 0;

      tickets.forEach(ticket => {
        const supportMessages = ticket.messages.filter(m => m.userId !== userId);
        if (supportMessages.length > 0) {
          const firstResponse = supportMessages[0];
          const responseTime = firstResponse.createdAt.getTime() - ticket.createdAt.getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      });

      const avgResponseTime = responseCount > 0 
        ? Math.round(totalResponseTime / responseCount / (1000 * 60 * 60)) // Convert to hours
        : 0;

      // Calculate average resolution time
      const resolvedTickets = tickets.filter(t => t.resolvedAt);
      const avgResolutionTime = resolvedTickets.length > 0
        ? Math.round(
            resolvedTickets.reduce((acc, t) => 
              acc + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0
            ) / resolvedTickets.length / (1000 * 60 * 60 * 24) // Convert to days
          )
        : 0;

      // Calculate satisfaction score
      const ratedTickets = tickets.filter(t => t.satisfaction !== null);
      const satisfactionScore = ratedTickets.length > 0
        ? Math.round(
            ratedTickets.reduce((acc, t) => acc + t.satisfaction!, 0) / ratedTickets.length
          )
        : 0;

      res.json({
        open,
        inProgress,
        resolved,
        avgResponseTime,
        avgResolutionTime,
        satisfactionScore
      });
    } catch (error) {
      logger.error('Error fetching ticket stats:', error);
      next(error);
    }
  }

  // Knowledge base search
  async searchKnowledgeBase(req: Request, res: Response, next: NextFunction) {
    try {
      const { q: query } = req.query;

      if (!query) {
        return res.json([]);
      }

      // In a real implementation, this would search a proper knowledge base
      // For now, return mock data
      const articles = [
        {
          id: '1',
          title: 'Cómo configurar tu primer bot',
          slug: 'configurar-primer-bot',
          category: 'getting-started',
          content: 'Esta guía te ayudará a configurar tu primer bot en LOGOS AI...',
          tags: ['configuración', 'bot', 'inicio'],
          author: 'Support Team',
          views: 1234,
          helpful: 456,
          lastUpdated: new Date()
        },
        {
          id: '2',
          title: 'Integración con APIs externas',
          slug: 'integracion-apis',
          category: 'integrations',
          content: 'Aprende cómo integrar tu bot con APIs externas...',
          tags: ['api', 'integración', 'webhooks'],
          author: 'Dev Team',
          views: 789,
          helpful: 234,
          lastUpdated: new Date()
        }
      ];

      // Simple search implementation
      const results = articles.filter(article =>
        article.title.toLowerCase().includes(query.toString().toLowerCase()) ||
        article.content.toLowerCase().includes(query.toString().toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(query.toString().toLowerCase()))
      );

      res.json(results);
    } catch (error) {
      logger.error('Error searching knowledge base:', error);
      next(error);
    }
  }

  // Get FAQs
  async getFAQs(req: Request, res: Response, next: NextFunction) {
    try {
      const { category } = req.query;

      // Mock FAQ data - in production this would come from database
      const faqs = [
        {
          id: '1',
          category: 'general',
          question: '¿Qué es LOGOS AI?',
          answer: 'LOGOS AI es una plataforma de inteligencia artificial que te permite crear y gestionar bots personalizados para tu negocio.',
          helpful: 123,
          notHelpful: 5,
          relatedArticles: ['configurar-primer-bot']
        },
        {
          id: '2',
          category: 'billing',
          question: '¿Cómo funcionan los planes de suscripción?',
          answer: 'Ofrecemos varios planes de suscripción adaptados a diferentes necesidades. Puedes cambiar o cancelar tu plan en cualquier momento.',
          helpful: 89,
          notHelpful: 2,
          relatedArticles: ['planes-suscripcion']
        },
        {
          id: '3',
          category: 'technical',
          question: '¿Cuáles son los límites de API?',
          answer: 'Los límites de API dependen de tu plan de suscripción. El plan gratuito incluye 1,000 llamadas/mes.',
          helpful: 67,
          notHelpful: 8,
          relatedArticles: ['limites-api', 'planes-suscripcion']
        }
      ];

      const filtered = category 
        ? faqs.filter(faq => faq.category === category)
        : faqs;

      res.json(filtered);
    } catch (error) {
      logger.error('Error fetching FAQs:', error);
      next(error);
    }
  }

  // Rate FAQ
  async rateFAQ(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { helpful } = req.body;

      // In production, this would update the database
      // For now, just return success
      res.json({ success: true });
    } catch (error) {
      logger.error('Error rating FAQ:', error);
      next(error);
    }
  }

  // Export tickets
  async exportTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { format = 'csv' } = req.query;

      const tickets = await prisma.supportTicket.findMany({
        where: { userId },
        include: {
          messages: true,
          tags: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (format === 'csv') {
        // Generate CSV
        const csv = [
          'ID,Subject,Category,Priority,Status,Created,Resolved,Messages',
          ...tickets.map(t => 
            `${t.id},"${t.subject}",${t.category},${t.priority},${t.status},${t.createdAt.toISOString()},${t.resolvedAt?.toISOString() || ''},${t.messages.length}`
          )
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=tickets.csv');
        res.send(csv);
      } else {
        // Generate PDF would be implemented here
        res.status(501).json({ error: 'PDF export not implemented' });
      }
    } catch (error) {
      logger.error('Error exporting tickets:', error);
      next(error);
    }
  }
}

export default new SupportController();