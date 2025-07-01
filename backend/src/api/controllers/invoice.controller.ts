import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { stripeService } from '../../services/stripe.service';
import { emailService } from '../../services/email.service';
import { pdfService } from '../../services/pdf.service';
import { logger } from '../../utils/logger';
import { format } from 'date-fns';

const prisma = new PrismaClient();

export class InvoiceController {
  // Get all invoices for a user
  async getInvoices(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

      const where: any = { userId };
      
      if (status) {
        where.status = status;
      }
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            payments: true
          }
        }),
        prisma.invoice.count({ where })
      ]);

      res.json({
        invoices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  }

  // Get single invoice
  async getInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const invoice = await prisma.invoice.findFirst({
        where: { id, userId },
        include: {
          items: true,
          payments: true,
          user: {
            select: {
              email: true,
              username: true
            }
          }
        }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      res.json(invoice);
    } catch (error) {
      logger.error('Error fetching invoice:', error);
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  }

  // Create invoice
  async createInvoice(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        customerId,
        items,
        dueDate,
        paymentTerms = 'Net 30',
        notes,
        discount = 0,
        taxRate = 0,
        recurring
      } = req.body;

      // Calculate totals
      const subtotal = items.reduce((sum: number, item: any) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);

      const discountAmount = subtotal * (discount / 100);
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = taxableAmount * (taxRate / 100);
      const total = taxableAmount + taxAmount;

      // Generate invoice number
      const count = await prisma.invoice.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          userId: customerId || userId,
          issueDate: new Date(),
          dueDate: new Date(dueDate),
          status: 'pending',
          currency: 'USD',
          subtotal,
          tax: taxAmount,
          discount: discountAmount,
          total,
          paymentTerms,
          notes,
          items: {
            create: items.map((item: any) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate || taxRate,
              discountRate: item.discountRate || 0,
              total: item.quantity * item.unitPrice,
              productId: item.productId,
              serviceId: item.serviceId
            }))
          },
          recurring: recurring ? {
            create: recurring
          } : undefined
        },
        include: {
          items: true,
          recurring: true
        }
      });

      // Send invoice email if requested
      if (req.body.sendEmail) {
        await this.sendInvoiceEmail(invoice.id);
      }

      res.status(201).json(invoice);
    } catch (error) {
      logger.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  }

  // Update invoice
  async updateInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const updates = req.body;

      // Check if invoice exists and belongs to user
      const existing = await prisma.invoice.findFirst({
        where: { id, userId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (existing.status === 'paid') {
        return res.status(400).json({ error: 'Cannot update paid invoice' });
      }

      // Update invoice
      const invoice = await prisma.invoice.update({
        where: { id },
        data: updates,
        include: {
          items: true,
          payments: true
        }
      });

      res.json(invoice);
    } catch (error) {
      logger.error('Error updating invoice:', error);
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  }

  // Delete invoice
  async deleteInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Check if invoice exists and belongs to user
      const invoice = await prisma.invoice.findFirst({
        where: { id, userId }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Cannot delete paid invoice' });
      }

      // Delete invoice and related items
      await prisma.invoice.delete({
        where: { id }
      });

      res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      logger.error('Error deleting invoice:', error);
      res.status(500).json({ error: 'Failed to delete invoice' });
    }
  }

  // Send invoice by email
  async sendInvoiceEmail(invoiceId: string) {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          user: true,
          items: true
        }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Generate PDF
      const pdfPath = await pdfService.generateInvoicePDF(invoice);

      // Prepare invoice data for email
      const invoiceData = {
        ...invoice,
        customer: {
          name: invoice.user.username || invoice.user.email,
          email: invoice.user.email,
          address: invoice.user.address || {}
        },
        pdfPath
      };

      // Send email
      await emailService.sendInvoice(invoiceData);

      // Update invoice sent status
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { sentAt: new Date() }
      });

      logger.info(`Invoice ${invoice.invoiceNumber} sent to ${invoice.user.email}`);
    } catch (error) {
      logger.error('Error sending invoice email:', error);
      throw error;
    }
  }

  // Send invoice endpoint
  async sendInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { recipients = [] } = req.body;
      const userId = req.user?.id;

      // Verify ownership
      const invoice = await prisma.invoice.findFirst({
        where: { id, userId }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Send invoice
      await this.sendInvoiceEmail(id);

      // Send to additional recipients
      if (recipients && recipients.length > 0) {
        const invoiceWithData = await prisma.invoice.findUnique({
          where: { id },
          include: {
            user: true,
            items: true
          }
        });
        
        for (const email of recipients) {
          const invoiceData = {
            ...invoiceWithData,
            customer: {
              name: email,
              email: email,
              address: {}
            }
          };
          await emailService.sendInvoice(invoiceData);
        }
      }

      res.json({ message: 'Invoice sent successfully' });
    } catch (error) {
      logger.error('Error sending invoice:', error);
      res.status(500).json({ error: 'Failed to send invoice' });
    }
  }

  // Generate PDF
  async generatePDF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const invoice = await prisma.invoice.findFirst({
        where: { id, userId },
        include: {
          user: true,
          items: true
        }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Generate PDF
      const pdfBuffer = await pdfService.generateInvoicePDF(invoice);

      // Send PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error generating PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }

  // Generate recurring invoices
  async generateRecurringInvoices(req: Request, res: Response) {
    try {
      const today = new Date();
      
      // Find all active recurring configs due today
      const recurringConfigs = await prisma.recurringInvoice.findMany({
        where: {
          nextInvoiceDate: {
            lte: today
          },
          status: 'active'
        },
        include: {
          invoice: {
            include: {
              items: true,
              user: true
            }
          }
        }
      });

      const generatedInvoices = [];

      for (const config of recurringConfigs) {
        try {
          // Create new invoice based on template
          const newInvoice = await prisma.invoice.create({
            data: {
              invoiceNumber: await this.generateInvoiceNumber(),
              userId: config.invoice.userId,
              issueDate: new Date(),
              dueDate: this.calculateDueDate(new Date(), config.invoice.paymentTerms),
              status: 'pending',
              currency: config.invoice.currency,
              subtotal: config.invoice.subtotal,
              tax: config.invoice.tax,
              discount: config.invoice.discount,
              total: config.invoice.total,
              paymentTerms: config.invoice.paymentTerms,
              notes: config.invoice.notes,
              recurringId: config.id,
              items: {
                create: config.invoice.items.map(item => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  taxRate: item.taxRate,
                  discountRate: item.discountRate,
                  total: item.total,
                  productId: item.productId,
                  serviceId: item.serviceId
                }))
              }
            },
            include: {
              items: true,
              user: true
            }
          });

          generatedInvoices.push(newInvoice);

          // Update next invoice date
          const nextDate = this.calculateNextInvoiceDate(config.nextInvoiceDate, config.frequency);
          await prisma.recurringInvoice.update({
            where: { id: config.id },
            data: { 
              nextInvoiceDate: nextDate,
              occurrencesGenerated: {
                increment: 1
              }
            }
          });

          // Auto-send if configured
          if (config.autoSend) {
            await this.sendInvoiceEmail(newInvoice.id);
          }

          // Auto-charge if configured
          if (config.autoCharge && config.invoice.user.defaultPaymentMethodId) {
            await stripeService.chargeInvoice(newInvoice.id);
          }

        } catch (error) {
          logger.error(`Error generating recurring invoice ${config.id}:`, error);
        }
      }

      res.json({
        message: `Generated ${generatedInvoices.length} recurring invoices`,
        invoices: generatedInvoices
      });
    } catch (error) {
      logger.error('Error generating recurring invoices:', error);
      res.status(500).json({ error: 'Failed to generate recurring invoices' });
    }
  }

  // Apply payment
  async applyPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { amount, method, reference, date } = req.body;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { payments: true }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Calculate total paid
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + amount;

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          invoiceId: id,
          amount,
          method,
          reference,
          date: new Date(date)
        }
      });

      // Update invoice status
      const status = totalPaid >= invoice.total ? 'paid' : 'partial';
      await prisma.invoice.update({
        where: { id },
        data: { 
          status,
          paidAt: status === 'paid' ? new Date() : null
        }
      });

      res.json({ payment, invoice: { ...invoice, status } });
    } catch (error) {
      logger.error('Error applying payment:', error);
      res.status(500).json({ error: 'Failed to apply payment' });
    }
  }

  // Get analytics
  async getAnalytics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { period = 'month' } = req.query;

      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        default: // month
          startDate = startOfMonth(now);
      }

      const [
        totalRevenue,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        avgPaymentTime,
        topCustomers,
        revenueByMonth
      ] = await Promise.all([
        // Total revenue
        prisma.invoice.aggregate({
          where: {
            userId,
            status: 'paid',
            paidAt: { gte: startDate }
          },
          _sum: { total: true }
        }),
        
        // Paid invoices count
        prisma.invoice.count({
          where: {
            userId,
            status: 'paid',
            paidAt: { gte: startDate }
          }
        }),
        
        // Pending invoices count
        prisma.invoice.count({
          where: {
            userId,
            status: 'pending'
          }
        }),
        
        // Overdue invoices count
        prisma.invoice.count({
          where: {
            userId,
            status: 'pending',
            dueDate: { lt: now }
          }
        }),
        
        // Average payment time
        this.calculateAveragePaymentTime(userId, startDate),
        
        // Top customers
        this.getTopCustomers(userId, startDate),
        
        // Revenue by month
        this.getRevenueByMonth(userId, startDate)
      ]);

      res.json({
        totalRevenue: totalRevenue._sum.total || 0,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        averagePaymentTime: avgPaymentTime,
        topCustomers,
        revenueByMonth
      });
    } catch (error) {
      logger.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

  // Helper methods
  private async generateInvoiceNumber(): Promise<string> {
    const count = await prisma.invoice.count();
    return `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }

  private calculateDueDate(issueDate: Date, terms: string): Date {
    const days = parseInt(terms.replace(/\D/g, '')) || 30;
    return new Date(issueDate.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private calculateNextInvoiceDate(currentDate: Date, frequency: string): Date {
    const date = new Date(currentDate);
    
    switch (frequency) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    
    return date;
  }

  private async calculateAveragePaymentTime(userId: string, startDate: Date): Promise<number> {
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        userId,
        status: 'paid',
        paidAt: { gte: startDate }
      },
      select: {
        issueDate: true,
        paidAt: true
      }
    });

    if (paidInvoices.length === 0) return 0;

    const totalDays = paidInvoices.reduce((sum, invoice) => {
      const days = Math.floor((invoice.paidAt!.getTime() - invoice.issueDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    return totalDays / paidInvoices.length;
  }

  private async getTopCustomers(userId: string, startDate: Date): Promise<any[]> {
    // This would need to be adjusted based on your actual schema
    return [];
  }

  private async getRevenueByMonth(userId: string, startDate: Date): Promise<any[]> {
    // This would need custom SQL or multiple queries to group by month
    return [];
  }
}

export const invoiceController = new InvoiceController();