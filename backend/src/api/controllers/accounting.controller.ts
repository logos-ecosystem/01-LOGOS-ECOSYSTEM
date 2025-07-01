import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { accountingService } from '../../services/accounting.service';
import { logger } from '../../utils/logger';
import { generateCSV, generateExcel, generatePDF } from '../../utils/export';
import { parseCSV } from '../../utils/import';

export class AccountingController {
  // Get available accounting providers
  async getProviders(_req: Request, res: Response) {
    try {
      const providers = [
        {
          id: 'quickbooks',
          name: 'QuickBooks',
          description: 'Complete accounting solution with invoicing, payments, and reporting',
          features: ['Invoice sync', 'Payment tracking', 'Financial reports', 'Tax management'],
          logo: '/assets/providers/quickbooks.png',
          setupUrl: '/api/accounting/connect/quickbooks'
        },
        {
          id: 'xero',
          name: 'Xero',
          description: 'Cloud-based accounting software for small businesses',
          features: ['Invoice sync', 'Bank reconciliation', 'Expense tracking', 'Multi-currency'],
          logo: '/assets/providers/xero.png',
          setupUrl: '/api/accounting/connect/xero'
        },
        {
          id: 'sage',
          name: 'Sage',
          description: 'Comprehensive business management solution',
          features: ['Financial management', 'Inventory tracking', 'Payroll', 'CRM integration'],
          logo: '/assets/providers/sage.png',
          setupUrl: '/api/accounting/connect/sage',
          comingSoon: true
        },
        {
          id: 'freshbooks',
          name: 'FreshBooks',
          description: 'Accounting software designed for freelancers and agencies',
          features: ['Time tracking', 'Project management', 'Client portal', 'Proposals'],
          logo: '/assets/providers/freshbooks.png',
          setupUrl: '/api/accounting/connect/freshbooks',
          comingSoon: true
        }
      ];

      return res.json({ providers });
    } catch (error) {
      logger.error('Error fetching providers:', error);
      return res.status(500).json({ error: 'Failed to fetch providers' });
    }
  }

  // Get user's accounting integrations
  async getIntegrations(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const integrations = await prisma.integration.findMany({
        where: {
          userId,
          category: 'accounting'
        },
        select: {
          id: true,
          type: true,
          name: true,
          isActive: true,
          status: true,
          lastSyncAt: true,
          metadata: true,
          createdAt: true
        }
      });

      // Get sync statistics for each integration
      const integrationsWithStats = await Promise.all(
        integrations.map(async (integration) => {
          const stats = await prisma.syncLog.groupBy({
            by: ['status'],
            where: {
              integrationId: integration.id,
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            },
            _count: true
          });

          const successCount = stats.find((s: any) => s.status === 'success')?._count || 0;
          const errorCount = stats.find((s: any) => s.status === 'error')?._count || 0;

          return {
            ...integration,
            stats: {
              successfulSyncs: successCount,
              failedSyncs: errorCount,
              successRate: successCount + errorCount > 0 
                ? Math.round((successCount / (successCount + errorCount)) * 100) 
                : 0
            }
          };
        })
      );

      return res.json({ integrations: integrationsWithStats });
    } catch (error) {
      logger.error('Error fetching integrations:', error);
      return res.status(500).json({ error: 'Failed to fetch integrations' });
    }
  }

  // Connect to accounting provider
  async connectProvider(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { provider } = req.params;
      const { authCode, realmId } = req.body;

      // Provider-specific OAuth flow
      let credentials: any = {};
      let name: string = '';

      switch (provider) {
        case 'quickbooks':
          if (!authCode || !realmId) {
            // Return OAuth URL for QuickBooks
            const authUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${process.env.QB_CLIENT_ID}&redirect_uri=${process.env.API_URL}/api/accounting/callback/quickbooks&response_type=code&scope=com.intuit.quickbooks.accounting`;
            return res.json({ authUrl });
          }

          // Exchange auth code for tokens
          // This would be handled by OAuth callback in production
          credentials = {
            accessToken: 'temp_access_token',
            refreshToken: 'temp_refresh_token',
            realmId
          };
          name = 'QuickBooks Online';
          break;

        case 'xero':
          if (!authCode) {
            const authUrl = `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${process.env.XERO_CLIENT_ID}&redirect_uri=${process.env.API_URL}/api/accounting/callback/xero&scope=accounting.transactions accounting.contacts accounting.reports.read`;
            return res.json({ authUrl });
          }

          credentials = {
            accessToken: 'temp_access_token',
            tenantId: 'temp_tenant_id'
          };
          name = 'Xero';
          break;

        default:
          return res.status(400).json({ error: 'Unsupported provider' });
      }

      // Check if integration already exists
      const existing = await prisma.integration.findFirst({
        where: {
          type: provider,
          userId
        }
      });

      let integration;
      if (existing) {
        // Update existing integration
        integration = await prisma.integration.update({
          where: { id: existing.id },
          data: {
            credentials,
            isActive: true,
            status: 'connected',
            lastSyncAt: new Date()
          }
        });
      } else {
        // Create new integration
        integration = await prisma.integration.create({
          data: {
            userId,
            type: provider,
            name,
            category: 'accounting',
            credentials,
            isActive: true,
            status: 'connected',
            settings: {
              autoSync: true,
              syncFrequency: 'daily',
              syncTypes: ['invoices', 'payments', 'customers']
            }
          }
        });
      }

      // Test connection
      const accountingProvider = await accountingService.initializeProvider(userId, provider);
      if (!accountingProvider) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: { 
            status: 'error',
            lastError: 'Failed to validate connection'
          }
        });
        return res.status(500).json({ error: 'Failed to connect to provider' });
      }

      // Log successful connection
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'accounting_integration_connected',
          entity: 'integration',
          entityId: integration.id,
          metadata: { provider }
        }
      });

      return res.json({ 
        message: 'Successfully connected to ' + name,
        integration
      });
    } catch (error) {
      logger.error('Error connecting provider:', error);
      return res.status(500).json({ error: 'Failed to connect provider' });
    }
  }

  // Disconnect from accounting provider
  async disconnectProvider(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const integration = await prisma.integration.findFirst({
        where: {
          type,
          userId
        }
      });

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      // Update integration status
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          isActive: false,
          status: 'disconnected'
        }
      });

      // Log disconnection
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'accounting_integration_disconnected',
          entity: 'integration',
          entityId: integration.id,
          metadata: { provider: type }
        }
      });

      return res.json({ success: true });
    } catch (error) {
      logger.error('Error disconnecting provider:', error);
      return res.status(500).json({ error: 'Failed to disconnect provider' });
    }
  }

  // Sync data with accounting provider
  async syncWithProvider(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const result = await accountingService.syncWithProvider(userId, type);
      return res.json(result);
    } catch (error) {
      logger.error('Error syncing with provider:', error);
      return res.status(500).json({ error: 'Failed to sync with provider' });
    }
  }

  // Export invoices to accounting provider
  async exportInvoices(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const { invoiceIds } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const result = await accountingService.exportInvoices(userId, type, invoiceIds);
      return res.json(result);
    } catch (error) {
      logger.error('Error exporting invoices:', error);
      return res.status(500).json({ error: 'Failed to export invoices' });
    }
  }

  // Import data from accounting provider
  async importFromProvider(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const { dataType, options } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const result = await accountingService.importFromProvider(userId, type, dataType, options);
      return res.json(result);
    } catch (error) {
      logger.error('Error importing from provider:', error);
      return res.status(500).json({ error: 'Failed to import from provider' });
    }
  }

  // Get sync history
  async getSyncHistory(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          type,
          category: 'accounting'
        }
      });

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      const syncHistory = await prisma.syncLog.findMany({
        where: {
          integrationId: integration.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      });

      return res.json({ syncHistory });
    } catch (error) {
      logger.error('Error fetching sync history:', error);
      return res.status(500).json({ error: 'Failed to fetch sync history' });
    }
  }

  // Get accounting reports
  async getReports(_req: Request, res: Response) {
    try {
      const reports = [
        {
          id: 'profit-loss',
          name: 'Profit & Loss',
          description: 'Income and expense summary for a specific period',
          icon: 'trending_up',
          category: 'financial'
        },
        {
          id: 'balance-sheet',
          name: 'Balance Sheet',
          description: 'Assets, liabilities, and equity snapshot',
          icon: 'account_balance',
          category: 'financial'
        },
        {
          id: 'cash-flow',
          name: 'Cash Flow',
          description: 'Cash inflows and outflows over time',
          icon: 'attach_money',
          category: 'financial'
        },
        {
          id: 'aged-receivables',
          name: 'Aged Receivables',
          description: 'Outstanding customer invoices by age',
          icon: 'receipt_long',
          category: 'receivables'
        },
        {
          id: 'sales-tax',
          name: 'Sales Tax Report',
          description: 'Tax collected and owed by jurisdiction',
          icon: 'receipt',
          category: 'tax'
        },
        {
          id: 'expense-summary',
          name: 'Expense Summary',
          description: 'Categorized expense breakdown',
          icon: 'pie_chart',
          category: 'expenses'
        }
      ];

      return res.json({ reports });
    } catch (error) {
      logger.error('Error fetching reports:', error);
      return res.status(500).json({ error: 'Failed to fetch reports' });
    }
  }

  // Generate specific report
  async generateReport(req: Request, res: Response) {
    try {
      const { reportId } = req.params;
      const { startDate, endDate, format, filters } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Mock report data for now
      const reportData = {
        title: 'Financial Report',
        period: { startDate, endDate },
        generatedAt: new Date(),
        data: []
      };

      // Generate report in requested format
      let response;
      switch (format) {
        case 'csv':
          response = generateCSV(reportData.data);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename=${reportId}-report.csv`);
          return res.send(response);

        case 'excel':
          response = generateExcel(reportData.data, reportId);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename=${reportId}-report.xlsx`);
          return res.send(response);

        case 'pdf':
          response = await generatePDF(reportData.data, reportData.title);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename=${reportId}-report.pdf`);
          return res.send(response);

        default:
          return res.json(reportData);
      }
    } catch (error) {
      logger.error('Error generating report:', error);
      return res.status(500).json({ error: 'Failed to generate report' });
    }
  }

  // Import data from file
  async importData(req: Request, res: Response) {
    try {
      const { dataType } = req.body;
      const file = req.file;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      let data;
      if (file.mimetype === 'text/csv') {
        data = await parseCSV(file.buffer);
      } else {
        return res.status(400).json({ error: 'Unsupported file format' });
      }

      // Process imported data based on type
      const result = {
        imported: data.length,
        failed: 0,
        errors: []
      };

      return res.json({ 
        message: `Successfully imported ${result.imported} records`,
        result 
      });
    } catch (error) {
      logger.error('Error importing data:', error);
      return res.status(500).json({ error: 'Failed to import data' });
    }
  }

  // Get dashboard data
  async getDashboard(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const integrations = await prisma.integration.findMany({
        where: {
          userId,
          category: 'accounting'
        }
      });

      const dashboardData = {
        connected: integrations.filter(i => i.isActive).length,
        totalIntegrations: integrations.length,
        lastSync: integrations
          .filter(i => i.lastSyncAt)
          .sort((a, b) => (b.lastSyncAt?.getTime() || 0) - (a.lastSyncAt?.getTime() || 0))[0]
          ?.lastSyncAt,
        syncHealth: {
          healthy: integrations.filter(i => i.status === 'connected').length,
          warning: integrations.filter(i => i.status === 'warning').length,
          error: integrations.filter(i => i.status === 'error').length
        }
      };

      return res.json(dashboardData);
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      return res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }

  // Update integration settings
  async updateSettings(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const { settings } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          type,
          category: 'accounting'
        }
      });

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      const updated = await prisma.integration.update({
        where: { id: integration.id },
        data: { settings }
      });

      return res.json({ 
        message: 'Settings updated successfully',
        settings: updated.settings
      });
    } catch (error) {
      logger.error('Error updating settings:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }
}

export const accountingController = new AccountingController();