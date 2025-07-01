import axios from 'axios';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Interfaces for accounting integrations
interface AccountingProvider {
  name: string;
  syncInvoice(invoice: any): Promise<any>;
  syncPayment(payment: any): Promise<any>;
  syncCustomer(customer: any): Promise<any>;
  getReports(params: any): Promise<any>;
  validateConnection(): Promise<boolean>;
}

// QuickBooks Integration
class QuickBooksProvider implements AccountingProvider {
  name = 'QuickBooks';
  private accessToken: string;
  private realmId: string;
  private baseUrl: string;
  private refreshToken: string;

  constructor(config: any) {
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.realmId = config.realmId;
    this.baseUrl = config.sandbox 
      ? 'https://sandbox-quickbooks.api.intuit.com/v3'
      : 'https://quickbooks.api.intuit.com/v3';
  }

  async refreshAccessToken() {
    try {
      const response = await axios.post('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      }, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;

      // Save new tokens to database
      await prisma.integration.update({
        where: { 
          type_userId: {
            type: 'quickbooks',
            userId: this.realmId
          }
        },
        data: {
          credentials: {
            accessToken: this.accessToken,
            refreshToken: this.refreshToken
          }
        }
      });

      return true;
    } catch (error) {
      logger.error('Error refreshing QuickBooks token:', error);
      return false;
    }
  }

  async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}/company/${this.realmId}${endpoint}`,
        data,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
        // Retry request
        return this.makeRequest(endpoint, method, data);
      }
      throw error;
    }
  }

  async syncInvoice(invoice: any): Promise<any> {
    try {
      const qbInvoice = {
        Line: invoice.items.map((item: any) => ({
          Amount: item.total,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            ItemRef: {
              value: item.productId || "1", // Default service item
              name: item.description
            },
            UnitPrice: item.unitPrice,
            Qty: item.quantity,
            TaxCodeRef: {
              value: item.taxRate > 0 ? "TAX" : "NON"
            }
          }
        })),
        CustomerRef: {
          value: invoice.customerId || await this.syncCustomer(invoice.customer)
        },
        DueDate: invoice.dueDate,
        DocNumber: invoice.invoiceNumber,
        BillEmail: {
          Address: invoice.customer.email
        },
        TotalAmt: invoice.total,
        ApplyTaxAfterDiscount: true,
        PrintStatus: "NeedToPrint",
        EmailStatus: invoice.sentAt ? "EmailSent" : "NotSet",
        Balance: invoice.status === 'paid' ? 0 : invoice.total
      };

      const result = await this.makeRequest('/invoice', 'POST', qbInvoice);
      
      // Update invoice with QB ID
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          externalId: result.Invoice.Id,
          metadata: {
            ...invoice.metadata,
            quickbooksId: result.Invoice.Id,
            syncedAt: new Date()
          }
        }
      });

      return result;
    } catch (error) {
      logger.error('Error syncing invoice to QuickBooks:', error);
      throw error;
    }
  }

  async syncPayment(payment: any): Promise<any> {
    try {
      const qbPayment = {
        TotalAmt: payment.amount,
        CustomerRef: {
          value: payment.customerId
        },
        PaymentMethodRef: {
          value: this.mapPaymentMethod(payment.method)
        },
        DepositToAccountRef: {
          value: "1" // Default deposit account
        },
        Line: [{
          Amount: payment.amount,
          LinkedTxn: [{
            TxnId: payment.invoice.externalId,
            TxnType: "Invoice"
          }]
        }],
        TxnDate: payment.date,
        PaymentRefNum: payment.reference
      };

      const result = await this.makeRequest('/payment', 'POST', qbPayment);
      
      return result;
    } catch (error) {
      logger.error('Error syncing payment to QuickBooks:', error);
      throw error;
    }
  }

  async syncCustomer(customer: any): Promise<any> {
    try {
      // Check if customer exists
      const existingCustomer = await this.makeRequest(
        `/query?query=select * from Customer where PrimaryEmailAddr='${customer.email}'`
      );

      if (existingCustomer.QueryResponse.Customer?.length > 0) {
        return existingCustomer.QueryResponse.Customer[0].Id;
      }

      // Create new customer
      const qbCustomer = {
        DisplayName: customer.name || customer.email,
        PrimaryEmailAddr: {
          Address: customer.email
        },
        CompanyName: customer.company,
        BillAddr: customer.address ? {
          Line1: customer.address.line1,
          Line2: customer.address.line2,
          City: customer.address.city,
          CountrySubDivisionCode: customer.address.state,
          PostalCode: customer.address.postalCode,
          Country: customer.address.country
        } : undefined
      };

      const result = await this.makeRequest('/customer', 'POST', qbCustomer);
      return result.Customer.Id;
    } catch (error) {
      logger.error('Error syncing customer to QuickBooks:', error);
      throw error;
    }
  }

  async getReports(params: any): Promise<any> {
    try {
      const reports = {
        profitAndLoss: await this.makeRequest('/reports/ProfitAndLoss'),
        balanceSheet: await this.makeRequest('/reports/BalanceSheet'),
        cashFlow: await this.makeRequest('/reports/CashFlow'),
        arAging: await this.makeRequest('/reports/AgedReceivables')
      };

      return reports;
    } catch (error) {
      logger.error('Error fetching QuickBooks reports:', error);
      throw error;
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/companyinfo/1');
      return true;
    } catch (error) {
      return false;
    }
  }

  private mapPaymentMethod(method: string): string {
    const mapping: any = {
      'card': '1', // Credit Card
      'bank': '2', // Bank Transfer
      'cash': '3', // Cash
      'check': '4', // Check
      'paypal': '5' // PayPal
    };
    return mapping[method] || '1';
  }
}

// Xero Integration
class XeroProvider implements AccountingProvider {
  name = 'Xero';
  private accessToken: string;
  private tenantId: string;
  private baseUrl = 'https://api.xero.com/api.xro/2.0';

  constructor(config: any) {
    this.accessToken = config.accessToken;
    this.tenantId = config.tenantId;
  }

  async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        data,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'xero-tenant-id': this.tenantId,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Xero API error:', error);
      throw error;
    }
  }

  async syncInvoice(invoice: any): Promise<any> {
    const xeroInvoice = {
      Type: 'ACCREC',
      Contact: {
        ContactID: invoice.customerId
      },
      LineItems: invoice.items.map((item: any) => ({
        Description: item.description,
        Quantity: item.quantity,
        UnitAmount: item.unitPrice,
        TaxType: item.taxRate > 0 ? 'OUTPUT' : 'NONE',
        AccountCode: '200' // Sales account
      })),
      Date: invoice.issueDate,
      DueDate: invoice.dueDate,
      Reference: invoice.invoiceNumber,
      Status: 'AUTHORISED'
    };

    return this.makeRequest('/Invoices', 'POST', { Invoices: [xeroInvoice] });
  }

  async syncPayment(payment: any): Promise<any> {
    const xeroPayment = {
      Invoice: {
        InvoiceID: payment.invoice.externalId
      },
      Account: {
        Code: '090' // Default bank account
      },
      Date: payment.date,
      Amount: payment.amount,
      Reference: payment.reference
    };

    return this.makeRequest('/Payments', 'POST', { Payments: [xeroPayment] });
  }

  async syncCustomer(customer: any): Promise<any> {
    const xeroContact = {
      Name: customer.name || customer.email,
      EmailAddress: customer.email,
      Addresses: customer.address ? [{
        AddressType: 'BILLING',
        AddressLine1: customer.address.line1,
        AddressLine2: customer.address.line2,
        City: customer.address.city,
        Region: customer.address.state,
        PostalCode: customer.address.postalCode,
        Country: customer.address.country
      }] : []
    };

    return this.makeRequest('/Contacts', 'POST', { Contacts: [xeroContact] });
  }

  async getReports(params: any): Promise<any> {
    const reports = {
      profitAndLoss: await this.makeRequest('/Reports/ProfitAndLoss'),
      balanceSheet: await this.makeRequest('/Reports/BalanceSheet'),
      trialBalance: await this.makeRequest('/Reports/TrialBalance')
    };

    return reports;
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/Organisation');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Main Accounting Service
export class AccountingService {
  private providers: Map<string, AccountingProvider> = new Map();

  async initializeProvider(userId: string, type: string): Promise<AccountingProvider | null> {
    try {
      const integration = await prisma.integration.findUnique({
        where: {
          type_userId: {
            type,
            userId
          }
        }
      });

      if (!integration || !integration.isActive) {
        return null;
      }

      let provider: AccountingProvider;

      switch (type) {
        case 'quickbooks':
          provider = new QuickBooksProvider(integration.credentials);
          break;
        case 'xero':
          provider = new XeroProvider(integration.credentials);
          break;
        default:
          throw new Error(`Unsupported accounting provider: ${type}`);
      }

      // Validate connection
      const isValid = await provider.validateConnection();
      if (!isValid) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: { 
            status: 'error',
            lastError: 'Connection validation failed'
          }
        });
        return null;
      }

      this.providers.set(`${userId}-${type}`, provider);
      return provider;
    } catch (error) {
      logger.error('Error initializing accounting provider:', error);
      return null;
    }
  }

  async syncInvoice(userId: string, invoiceId: string): Promise<void> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          user: true,
          items: true
        }
      });

      if (!invoice || invoice.userId !== userId) {
        throw new Error('Invoice not found');
      }

      // Get all active accounting integrations for user
      const integrations = await prisma.integration.findMany({
        where: {
          userId,
          category: 'accounting',
          isActive: true
        }
      });

      for (const integration of integrations) {
        try {
          const provider = await this.initializeProvider(userId, integration.type);
          if (provider) {
            await provider.syncInvoice(invoice);
            logger.info(`Invoice ${invoiceId} synced to ${integration.type}`);
          }
        } catch (error) {
          logger.error(`Error syncing invoice to ${integration.type}:`, error);
          await prisma.auditLog.create({
            data: {
              userId,
              action: 'accounting_sync_failed',
              entity: 'invoice',
              entityId: invoiceId,
              metadata: {
                provider: integration.type,
                error: (error as any).message
              }
            }
          });
        }
      }
    } catch (error) {
      logger.error('Error in syncInvoice:', error);
      throw error;
    }
  }

  async syncPayment(userId: string, paymentId: string): Promise<void> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          invoice: {
            include: {
              user: true
            }
          }
        }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const integrations = await prisma.integration.findMany({
        where: {
          userId,
          category: 'accounting',
          isActive: true
        }
      });

      for (const integration of integrations) {
        try {
          const provider = await this.initializeProvider(userId, integration.type);
          if (provider) {
            await provider.syncPayment(payment);
            logger.info(`Payment ${paymentId} synced to ${integration.type}`);
          }
        } catch (error) {
          logger.error(`Error syncing payment to ${integration.type}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in syncPayment:', error);
      throw error;
    }
  }

  async getConsolidatedReports(userId: string): Promise<any> {
    try {
      const integrations = await prisma.integration.findMany({
        where: {
          userId,
          category: 'accounting',
          isActive: true
        }
      });

      const reports: any = {};

      for (const integration of integrations) {
        try {
          const provider = await this.initializeProvider(userId, integration.type);
          if (provider) {
            reports[integration.type] = await provider.getReports({});
          }
        } catch (error) {
          logger.error(`Error fetching reports from ${integration.type}:`, error);
        }
      }

      // Consolidate reports from all providers
      return this.consolidateReports(reports);
    } catch (error) {
      logger.error('Error getting consolidated reports:', error);
      throw error;
    }
  }

  private consolidateReports(reports: any): any {
    // Implement logic to merge reports from multiple providers
    const consolidated = {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      outstandingInvoices: 0,
      cashBalance: 0,
      providers: []
    };

    for (const [provider, data] of Object.entries(reports)) {
      // Extract and combine key metrics
      consolidated.providers.push({
        name: provider,
        data
      });
    }

    return consolidated;
  }

  // Webhook handlers for real-time updates
  async handleQuickBooksWebhook(data: any): Promise<void> {
    try {
      const signature = data.headers['intuit-signature'];
      const payload = data.body;

      // Verify webhook signature
      const hash = crypto
        .createHmac('sha256', process.env.QB_WEBHOOK_TOKEN!)
        .update(JSON.stringify(payload))
        .digest('base64');

      if (hash !== signature) {
        throw new Error('Invalid webhook signature');
      }

      // Process webhook events
      for (const event of payload.eventNotifications) {
        switch (event.dataChangeEvent.entities[0].name) {
          case 'Invoice':
            await this.handleInvoiceUpdate(event.realmId, event.dataChangeEvent.entities[0].id);
            break;
          case 'Payment':
            await this.handlePaymentUpdate(event.realmId, event.dataChangeEvent.entities[0].id);
            break;
        }
      }
    } catch (error) {
      logger.error('Error handling QuickBooks webhook:', error);
      throw error;
    }
  }

  private async handleInvoiceUpdate(realmId: string, externalId: string): Promise<void> {
    // Implement logic to sync updates from QuickBooks back to our system
  }

  private async handlePaymentUpdate(realmId: string, externalId: string): Promise<void> {
    // Implement logic to sync payment updates from QuickBooks
  }

  async syncWithProvider(userId: string, providerType: string): Promise<any> {
    try {
      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          type: providerType,
          category: 'accounting'
        }
      });

      if (!integration || !integration.isActive) {
        throw new Error('Integration not found or inactive');
      }

      const provider = await this.initializeProvider(userId, providerType);
      if (!provider) {
        throw new Error('Failed to initialize provider');
      }

      // Sync invoices
      const invoices = await prisma.invoice.findMany({
        where: { userId },
        include: { items: true }
      });

      let syncedCount = 0;
      let failedCount = 0;
      const errors: any[] = [];

      for (const invoice of invoices) {
        try {
          await provider.syncInvoice(invoice);
          syncedCount++;
        } catch (error) {
          failedCount++;
          errors.push({
            invoiceId: invoice.id,
            error: (error as Error).message
          });
        }
      }

      // Update last sync
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() }
      });

      // Create sync log
      await prisma.syncLog.create({
        data: {
          integrationId: integration.id,
          userId,
          direction: 'outbound',
          entityType: 'invoice',
          entityId: 'batch',
          status: failedCount > 0 ? 'partial' : 'success',
          recordsProcessed: syncedCount,
          startedAt: new Date(),
          completedAt: new Date(),
          details: {
            synced: syncedCount,
            failed: failedCount,
            errors
          }
        }
      });

      return {
        success: true,
        synced: syncedCount,
        failed: failedCount,
        errors
      };
    } catch (error) {
      logger.error('Error syncing with provider:', error);
      throw error;
    }
  }

  async exportInvoices(userId: string, providerType: string, invoiceIds: string[]): Promise<any> {
    try {
      const provider = await this.initializeProvider(userId, providerType);
      if (!provider) {
        throw new Error('Failed to initialize provider');
      }

      const invoices = await prisma.invoice.findMany({
        where: {
          id: { in: invoiceIds },
          userId
        },
        include: { items: true }
      });

      const results = [];
      for (const invoice of invoices) {
        try {
          const result = await provider.syncInvoice(invoice);
          results.push({
            invoiceId: invoice.id,
            success: true,
            externalId: result.id
          });
        } catch (error) {
          results.push({
            invoiceId: invoice.id,
            success: false,
            error: (error as Error).message
          });
        }
      }

      return {
        success: true,
        results
      };
    } catch (error) {
      logger.error('Error exporting invoices:', error);
      throw error;
    }
  }

  async importFromProvider(userId: string, providerType: string, dataType: string, options: any = {}): Promise<any> {
    try {
      const provider = await this.initializeProvider(userId, providerType);
      if (!provider) {
        throw new Error('Failed to initialize provider');
      }

      let imported = 0;
      let failed = 0;
      const errors: any[] = [];

      switch (dataType) {
        case 'invoices':
          const invoices = await provider.getInvoices(options);
          for (const invoice of invoices) {
            try {
              // Transform and save invoice
              await this.importInvoice(userId, invoice, providerType);
              imported++;
            } catch (error) {
              failed++;
              errors.push({
                externalId: invoice.id,
                error: (error as Error).message
              });
            }
          }
          break;

        case 'customers':
          const customers = await provider.getCustomers(options);
          for (const customer of customers) {
            try {
              await this.importCustomer(userId, customer, providerType);
              imported++;
            } catch (error) {
              failed++;
              errors.push({
                externalId: customer.id,
                error: (error as Error).message
              });
            }
          }
          break;

        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

      return {
        success: true,
        imported,
        failed,
        errors
      };
    } catch (error) {
      logger.error('Error importing from provider:', error);
      throw error;
    }
  }

  private async importInvoice(userId: string, externalInvoice: any, provider: string): Promise<void> {
    // Transform external invoice to our format and save
    // This is a placeholder - implement actual transformation logic
  }

  private async importCustomer(userId: string, externalCustomer: any, provider: string): Promise<void> {
    // Transform external customer to our format and save
    // This is a placeholder - implement actual transformation logic
  }
}

export const accountingService = new AccountingService();