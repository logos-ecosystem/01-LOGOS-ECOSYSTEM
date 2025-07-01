import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export class DashboardController {
  // Get advanced dashboard data
  async getAdvancedDashboard(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      const endOfCurrentMonth = endOfMonth(now);

      // Fetch all data in parallel for performance
      const [
        totalRevenue,
        monthlyRevenue,
        activeSubscriptions,
        invoiceStats,
        activeProducts,
        apiUsage,
        supportTickets,
        recentActivity,
        upcomingInvoices,
        activeIntegrations,
        aiMetrics,
        revenueData
      ] = await Promise.all([
        // Total revenue
        prisma.invoice.aggregate({
          where: {
            userId,
            status: 'paid'
          },
          _sum: {
            total: true
          }
        }),

        // Monthly revenue
        prisma.invoice.aggregate({
          where: {
            userId,
            status: 'paid',
            paidAt: {
              gte: startOfCurrentMonth,
              lte: endOfCurrentMonth
            }
          },
          _sum: {
            total: true
          }
        }),

        // Active subscriptions
        prisma.subscription.count({
          where: {
            userId,
            status: 'active'
          }
        }),

        // Invoice statistics
        prisma.invoice.groupBy({
          by: ['status'],
          where: { userId },
          _count: true
        }),

        // Active products
        prisma.product.count({
          where: {
            userId,
            status: 'active'
          }
        }),

        // API usage this month
        prisma.usage.findFirst({
          where: {
            userId,
            period: format(now, 'yyyy-MM')
          }
        }),

        // Open support tickets
        prisma.supportTicket.count({
          where: {
            userId,
            status: {
              in: ['open', 'in_progress']
            }
          }
        }),

        // Recent activity
        prisma.auditLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            action: true,
            entity: true,
            entityId: true,
            metadata: true,
            createdAt: true
          }
        }),

        // Upcoming invoices
        prisma.invoice.findMany({
          where: {
            userId,
            status: 'pending',
            dueDate: {
              gte: now
            }
          },
          orderBy: { dueDate: 'asc' },
          take: 5,
          select: {
            id: true,
            invoiceNumber: true,
            dueDate: true,
            total: true
          }
        }),

        // Active integrations
        prisma.integration.findMany({
          where: {
            userId,
            isActive: true
          },
          select: {
            id: true,
            type: true,
            name: true,
            status: true,
            lastSyncAt: true,
            metadata: true
          }
        }),

        // AI metrics
        this.getAIMetrics(userId),

        // Revenue chart data (last 6 months)
        this.getRevenueChartData(userId, 6)
      ]);

      // Process invoice stats
      const invoiceStatsMap = invoiceStats.reduce((acc: any, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {});

      // Format recent activity
      const formattedActivity = recentActivity.map(activity => ({
        id: activity.id,
        title: this.getActivityTitle(activity.action),
        description: this.getActivityDescription(activity),
        timestamp: activity.createdAt,
        icon: this.getActivityIcon(activity.action)
      }));

      // Format integrations
      const formattedIntegrations = activeIntegrations.map(integration => ({
        id: integration.id,
        name: integration.name,
        status: integration.status,
        logo: this.getIntegrationLogo(integration.type),
        description: this.getIntegrationDescription(integration.type),
        lastSync: integration.lastSyncAt
      }));

      // Calculate API usage percentage
      const apiUsageData = apiUsage ? JSON.parse(apiUsage.apiCalls as string) : { used: 0, limit: 1000 };
      const apiUsagePercentage = (apiUsageData.used / apiUsageData.limit) * 100;

      // Prepare response
      const dashboardData = {
        overview: {
          totalRevenue: totalRevenue._sum.total || 0,
          monthlyRevenue: monthlyRevenue._sum.total || 0,
          activeSubscriptions,
          totalInvoices: Object.values(invoiceStatsMap).reduce((a: number, b: any) => a + b, 0),
          pendingInvoices: invoiceStatsMap.pending || 0,
          overdueInvoices: await this.getOverdueInvoices(userId),
          activeProducts,
          apiUsage: apiUsagePercentage,
          supportTickets
        },
        revenueChart: revenueData,
        usageChart: {
          labels: ['API Calls', 'Storage', 'Bandwidth', 'AI Tokens'],
          data: await this.getUsageChartData(userId)
        },
        recentActivity: formattedActivity,
        upcomingInvoices: upcomingInvoices.map(inv => ({
          id: inv.id,
          number: inv.invoiceNumber,
          dueDate: inv.dueDate,
          amount: inv.total
        })),
        activeIntegrations: formattedIntegrations,
        aiMetrics
      };

      res.json(dashboardData);
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }

  // Get overdue invoices count
  private async getOverdueInvoices(userId: string): Promise<number> {
    return prisma.invoice.count({
      where: {
        userId,
        status: 'pending',
        dueDate: {
          lt: new Date()
        }
      }
    });
  }

  // Get AI metrics
  private async getAIMetrics(userId: string) {
    const thirtyDaysAgo = subMonths(new Date(), 1);
    
    const [totalRequests, successfulRequests, avgResponseTime] = await Promise.all([
      prisma.productMetric.aggregate({
        where: {
          product: { userId },
          date: { gte: thirtyDaysAgo }
        },
        _sum: { requests: true }
      }),
      prisma.productMetric.aggregate({
        where: {
          product: { userId },
          date: { gte: thirtyDaysAgo }
        },
        _sum: { successfulRequests: true }
      }),
      prisma.productMetric.aggregate({
        where: {
          product: { userId },
          date: { gte: thirtyDaysAgo }
        },
        _avg: { averageResponseTime: true }
      })
    ]);

    const total = totalRequests._sum.requests || 0;
    const successful = successfulRequests._sum.successfulRequests || 0;
    const successRate = total > 0 ? (successful / total) * 100 : 100;

    // Get current month token usage
    const currentMonth = format(new Date(), 'yyyy-MM');
    const tokenUsage = await prisma.usage.findFirst({
      where: {
        userId,
        period: currentMonth
      },
      select: { aiTokens: true }
    });

    const tokensData = tokenUsage ? JSON.parse(tokenUsage.aiTokens as string) : { used: 0 };

    return {
      totalRequests: total,
      successRate: Math.round(successRate),
      avgResponseTime: Math.round(avgResponseTime._avg.averageResponseTime || 0),
      tokensUsed: tokensData.used
    };
  }

  // Get revenue chart data
  private async getRevenueChartData(userId: string, months: number) {
    const labels: string[] = [];
    const data: number[] = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const revenue = await prisma.invoice.aggregate({
        where: {
          userId,
          status: 'paid',
          paidAt: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        _sum: { total: true }
      });
      
      labels.push(format(date, 'MMM'));
      data.push(revenue._sum.total || 0);
    }
    
    return { labels, data };
  }

  // Get usage chart data
  private async getUsageChartData(userId: string) {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const usage = await prisma.usage.findFirst({
      where: {
        userId,
        period: currentMonth
      }
    });

    if (!usage) {
      return [0, 0, 0, 0];
    }

    const apiCalls = JSON.parse(usage.apiCalls as string);
    const storage = JSON.parse(usage.storage as string);
    const bandwidth = JSON.parse(usage.bandwidth as string);
    const aiTokens = JSON.parse(usage.aiTokens as string);

    return [
      (apiCalls.used / apiCalls.limit) * 100,
      (storage.used / storage.limit) * 100,
      (bandwidth.used / bandwidth.limit) * 100,
      (aiTokens.used / aiTokens.limit) * 100
    ];
  }

  // Helper methods for activity formatting
  private getActivityTitle(action: string): string {
    const titles: any = {
      'user_login': 'User Login',
      'invoice_created': 'Invoice Created',
      'payment_received': 'Payment Received',
      'product_created': 'AI Bot Created',
      'product_updated': 'AI Bot Updated',
      'subscription_created': 'New Subscription',
      'subscription_cancelled': 'Subscription Cancelled',
      'api_key_created': 'API Key Created',
      'integration_connected': 'Integration Connected',
      'support_ticket_created': 'Support Ticket Created',
      'document_signed': 'Document Signed'
    };
    return titles[action] || action;
  }

  private getActivityDescription(activity: any): string {
    const metadata = activity.metadata as any;
    
    switch (activity.action) {
      case 'invoice_created':
        return `Invoice #${metadata?.invoiceNumber || 'N/A'} created`;
      case 'payment_received':
        return `Payment of ${metadata?.amount || 0} received`;
      case 'product_created':
        return `New AI bot "${metadata?.name || 'Unnamed'}" created`;
      default:
        return `${activity.entity} ${activity.action}`;
    }
  }

  private getActivityIcon(action: string): string {
    const icons: any = {
      'user_login': 'Login',
      'invoice_created': 'Receipt',
      'payment_received': 'Payment',
      'product_created': 'SmartToy',
      'product_updated': 'Edit',
      'subscription_created': 'Star',
      'subscription_cancelled': 'Cancel',
      'api_key_created': 'Key',
      'integration_connected': 'Link',
      'support_ticket_created': 'Support',
      'document_signed': 'VerifiedUser'
    };
    return icons[action] || 'Info';
  }

  private getIntegrationLogo(type: string): string {
    const logos: any = {
      'quickbooks': '/assets/integrations/quickbooks.png',
      'xero': '/assets/integrations/xero.png',
      'stripe': '/assets/integrations/stripe.png',
      'paypal': '/assets/integrations/paypal.png',
      'slack': '/assets/integrations/slack.png',
      'zapier': '/assets/integrations/zapier.png'
    };
    return logos[type] || '/assets/integrations/default.png';
  }

  private getIntegrationDescription(type: string): string {
    const descriptions: any = {
      'quickbooks': 'Sync invoices and payments with QuickBooks',
      'xero': 'Automatic accounting synchronization',
      'stripe': 'Payment processing and subscriptions',
      'paypal': 'Accept PayPal payments',
      'slack': 'Get notifications in Slack',
      'zapier': 'Connect with 3000+ apps'
    };
    return descriptions[type] || 'Integration service';
  }

  // Get basic dashboard (legacy endpoint)
  async getDashboard(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const [
        activeSubscription,
        recentInvoices,
        totalSpent,
        activeProducts
      ] = await Promise.all([
        prisma.subscription.findFirst({
          where: {
            userId,
            status: 'active'
          },
          include: {
            plan: true
          }
        }),
        prisma.invoice.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.invoice.aggregate({
          where: {
            userId,
            status: 'paid'
          },
          _sum: {
            total: true
          }
        }),
        prisma.product.count({
          where: {
            userId,
            status: 'active'
          }
        })
      ]);

      res.json({
        subscription: activeSubscription,
        recentInvoices,
        totalSpent: totalSpent._sum.total || 0,
        activeProducts
      });
    } catch (error) {
      logger.error('Error fetching dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }
}

export const dashboardController = new DashboardController();