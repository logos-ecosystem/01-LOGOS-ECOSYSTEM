import cron from 'node-cron';
import { prisma } from '../config/database';
import { invoiceController } from '../api/controllers/invoice.controller';
import { emailService } from '../services/email.service';
import { logger } from '../utils/logger';
import { addDays, differenceInDays } from 'date-fns';

export class InvoiceJobs {
  // Generate recurring invoices daily at 2 AM
  static generateRecurringInvoices() {
    cron.schedule('0 2 * * *', async () => {
      logger.info('Starting recurring invoice generation job');
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Find all active recurring configs due today or overdue
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

        logger.info(`Found ${recurringConfigs.length} recurring invoices to generate`);

        for (const config of recurringConfigs) {
          try {
            // Create new invoice
            const invoiceNumber = await this.generateInvoiceNumber();
            const dueDate = addDays(today, parseInt(config.invoice.paymentTerms.replace(/\D/g, '')) || 30);
            
            const newInvoice = await prisma.invoice.create({
              data: {
                invoiceNumber,
                userId: config.invoice.userId,
                issueDate: today,
                dueDate,
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
                    productId: item.productId
                  }))
                }
              }
            });

            // Update next invoice date
            const nextDate = this.calculateNextDate(config.nextInvoiceDate, config.frequency);
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
              await invoiceController.sendInvoiceEmail(newInvoice.id);
            }

            logger.info(`Generated recurring invoice ${newInvoice.invoiceNumber}`);
          } catch (error) {
            logger.error(`Error generating recurring invoice ${config.id}:`, error);
          }
        }
      } catch (error) {
        logger.error('Error in recurring invoice job:', error);
      }
    });
  }

  // Send payment reminders daily at 9 AM
  static sendPaymentReminders() {
    cron.schedule('0 9 * * *', async () => {
      logger.info('Starting payment reminder job');
      
      try {
        const today = new Date();
        
        // Find overdue invoices
        const overdueInvoices = await prisma.invoice.findMany({
          where: {
            status: 'pending',
            dueDate: {
              lt: today
            }
          },
          include: {
            user: true,
            items: true
          }
        });

        logger.info(`Found ${overdueInvoices.length} overdue invoices`);

        for (const invoice of overdueInvoices) {
          try {
            const daysOverdue = differenceInDays(today, invoice.dueDate);
            
            // Send reminders at specific intervals: 1, 7, 14, 30 days
            if ([1, 7, 14, 30].includes(daysOverdue)) {
              const invoiceData = {
                ...invoice,
                customer: {
                  name: invoice.user.username || invoice.user.email,
                  email: invoice.user.email,
                  address: invoice.user.address || {}
                }
              };
              
              await emailService.sendInvoiceReminder(invoiceData);
              
              // Log reminder sent
              await prisma.auditLog.create({
                data: {
                  userId: invoice.userId,
                  action: 'invoice_reminder_sent',
                  entity: 'invoice',
                  entityId: invoice.id,
                  metadata: {
                    daysOverdue,
                    invoiceNumber: invoice.invoiceNumber
                  }
                }
              });
              
              logger.info(`Sent payment reminder for invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`);
            }
          } catch (error) {
            logger.error(`Error sending reminder for invoice ${invoice.id}:`, error);
          }
        }
      } catch (error) {
        logger.error('Error in payment reminder job:', error);
      }
    });
  }

  // Send subscription renewal reminders at 10 AM
  static sendSubscriptionRenewalReminders() {
    cron.schedule('0 10 * * *', async () => {
      logger.info('Starting subscription renewal reminder job');
      
      try {
        const today = new Date();
        
        // Find subscriptions expiring in 7, 3, and 1 days
        const reminderDays = [7, 3, 1];
        
        for (const days of reminderDays) {
          const targetDate = addDays(today, days);
          targetDate.setHours(0, 0, 0, 0);
          const nextDay = addDays(targetDate, 1);
          
          const expiringSubscriptions = await prisma.subscription.findMany({
            where: {
              status: 'active',
              currentPeriodEnd: {
                gte: targetDate,
                lt: nextDay
              }
            },
            include: {
              user: true,
              plan: true
            }
          });

          logger.info(`Found ${expiringSubscriptions.length} subscriptions expiring in ${days} days`);

          for (const subscription of expiringSubscriptions) {
            try {
              const subscriptionData = {
                userEmail: subscription.user.email,
                productName: subscription.plan.name,
                nextBillingDate: subscription.currentPeriodEnd,
                amount: subscription.plan.price
              };
              
              await emailService.sendSubscriptionRenewalReminder(subscriptionData, days);
              
              logger.info(`Sent renewal reminder for subscription ${subscription.id} (${days} days until renewal)`);
            } catch (error) {
              logger.error(`Error sending renewal reminder for subscription ${subscription.id}:`, error);
            }
          }
        }
      } catch (error) {
        logger.error('Error in subscription renewal reminder job:', error);
      }
    });
  }

  // Clean up old invoices (archive after 2 years)
  static archiveOldInvoices() {
    cron.schedule('0 3 1 * *', async () => { // Monthly on the 1st at 3 AM
      logger.info('Starting invoice archival job');
      
      try {
        const twoYearsAgo = addDays(new Date(), -730);
        
        const oldInvoices = await prisma.invoice.findMany({
          where: {
            createdAt: {
              lt: twoYearsAgo
            },
            status: 'paid'
          }
        });

        logger.info(`Found ${oldInvoices.length} invoices to archive`);

        // In a real implementation, you would move these to an archive table
        // or export to long-term storage
        
      } catch (error) {
        logger.error('Error in invoice archival job:', error);
      }
    });
  }

  // Helper methods
  private static async generateInvoiceNumber(): Promise<string> {
    const count = await prisma.invoice.count();
    return `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }

  private static calculateNextDate(currentDate: Date, frequency: string): Date {
    const date = new Date(currentDate);
    
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
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

  // Initialize all jobs
  static initialize() {
    this.generateRecurringInvoices();
    this.sendPaymentReminders();
    this.sendSubscriptionRenewalReminders();
    this.archiveOldInvoices();
    
    logger.info('Invoice jobs initialized');
  }
}

// Start jobs
InvoiceJobs.initialize();