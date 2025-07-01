// Automatic Invoicing Service
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  currency: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  items: InvoiceItem[];
  paymentTerms: string;
  notes?: string;
  attachments?: string[];
  recurring?: RecurringConfig;
  metadata?: Record<string, any>;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountRate: number;
  total: number;
  productId?: string;
  serviceId?: string;
  period?: {
    start: string;
    end: string;
  };
}

export interface RecurringConfig {
  frequency: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextInvoiceDate: string;
  occurrences?: number;
  autoSend: boolean;
  autoCharge: boolean;
  dayOfMonth?: number;
  monthOfYear?: number;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  html: string;
  css: string;
  variables: string[];
  preview?: string;
  isDefault: boolean;
}

export interface TaxConfig {
  id: string;
  name: string;
  rate: number;
  country: string;
  state?: string;
  category?: string;
  inclusive: boolean;
  compound: boolean;
}

export interface PaymentReminder {
  daysBeforeDue: number;
  daysAfterDue: number[];
  template: string;
  enabled: boolean;
}

class InvoicingService {
  private apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.logos-ecosystem.com';

  // Generate invoice number
  generateInvoiceNumber(prefix: string = 'INV', sequence: number): string {
    const year = new Date().getFullYear();
    const paddedSequence = sequence.toString().padStart(6, '0');
    return `${prefix}-${year}-${paddedSequence}`;
  }

  // Create new invoice
  async createInvoice(data: Partial<InvoiceData>): Promise<InvoiceData> {
    try {
      const response = await fetch(`${this.apiUrl}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to create invoice');
      return await response.json();
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  // Generate recurring invoices
  async generateRecurringInvoices(): Promise<InvoiceData[]> {
    try {
      const response = await fetch(`${this.apiUrl}/invoices/recurring/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to generate recurring invoices');
      return await response.json();
    } catch (error) {
      console.error('Error generating recurring invoices:', error);
      throw error;
    }
  }

  // Calculate invoice totals
  calculateInvoiceTotals(items: InvoiceItem[], taxRate: number = 0, discountRate: number = 0): {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = itemSubtotal * (item.discountRate / 100);
      const itemTax = (itemSubtotal - itemDiscount) * (item.taxRate / 100);
      return sum + itemSubtotal;
    }, 0);

    const discount = subtotal * (discountRate / 100);
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * (taxRate / 100);
    const total = taxableAmount + tax;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  // Send invoice by email
  async sendInvoice(invoiceId: string, recipients: string[]): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ recipients })
      });
    } catch (error) {
      console.error('Error sending invoice:', error);
      throw error;
    }
  }

  // Generate PDF
  async generatePDF(invoiceId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.apiUrl}/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to generate PDF');
      return await response.blob();
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  // Schedule invoice
  async scheduleInvoice(data: Partial<InvoiceData>, sendDate: Date): Promise<InvoiceData> {
    try {
      const response = await fetch(`${this.apiUrl}/invoices/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          ...data,
          scheduledDate: sendDate.toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to schedule invoice');
      return await response.json();
    } catch (error) {
      console.error('Error scheduling invoice:', error);
      throw error;
    }
  }

  // Apply payment
  async applyPayment(invoiceId: string, payment: {
    amount: number;
    method: string;
    reference: string;
    date: string;
  }): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(payment)
      });
    } catch (error) {
      console.error('Error applying payment:', error);
      throw error;
    }
  }

  // Get invoice analytics
  async getInvoiceAnalytics(period: 'month' | 'quarter' | 'year' = 'month'): Promise<{
    totalRevenue: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    averagePaymentTime: number;
    topCustomers: Array<{ customerId: string; total: number }>;
    revenueByMonth: Array<{ month: string; revenue: number }>;
  }> {
    try {
      const response = await fetch(`${this.apiUrl}/invoices/analytics?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to get analytics');
      return await response.json();
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  // Setup payment reminders
  async setupPaymentReminders(config: PaymentReminder[]): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/invoices/reminders`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ reminders: config })
      });
    } catch (error) {
      console.error('Error setting up reminders:', error);
      throw error;
    }
  }

  // Bulk invoice operations
  async bulkCreateInvoices(invoices: Partial<InvoiceData>[]): Promise<InvoiceData[]> {
    try {
      const response = await fetch(`${this.apiUrl}/invoices/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ invoices })
      });

      if (!response.ok) throw new Error('Failed to create bulk invoices');
      return await response.json();
    } catch (error) {
      console.error('Error creating bulk invoices:', error);
      throw error;
    }
  }

  // Export invoices
  async exportInvoices(format: 'csv' | 'excel' | 'pdf', filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    customerId?: string;
  }): Promise<Blob> {
    try {
      const params = new URLSearchParams({ format, ...filters });
      const response = await fetch(`${this.apiUrl}/invoices/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to export invoices');
      return await response.blob();
    } catch (error) {
      console.error('Error exporting invoices:', error);
      throw error;
    }
  }

  // Template management
  async getTemplates(): Promise<InvoiceTemplate[]> {
    try {
      const response = await fetch(`${this.apiUrl}/invoices/templates`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to get templates');
      return await response.json();
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  async saveTemplate(template: Partial<InvoiceTemplate>): Promise<InvoiceTemplate> {
    try {
      const response = await fetch(`${this.apiUrl}/invoices/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(template)
      });

      if (!response.ok) throw new Error('Failed to save template');
      return await response.json();
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  // Tax management
  async getTaxRates(country?: string): Promise<TaxConfig[]> {
    try {
      const params = country ? `?country=${country}` : '';
      const response = await fetch(`${this.apiUrl}/invoices/tax-rates${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to get tax rates');
      return await response.json();
    } catch (error) {
      console.error('Error getting tax rates:', error);
      throw error;
    }
  }

  // Credit note management
  async createCreditNote(invoiceId: string, items: string[], reason: string): Promise<InvoiceData> {
    try {
      const response = await fetch(`${this.apiUrl}/invoices/${invoiceId}/credit-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ items, reason })
      });

      if (!response.ok) throw new Error('Failed to create credit note');
      return await response.json();
    } catch (error) {
      console.error('Error creating credit note:', error);
      throw error;
    }
  }

  // Webhook management for invoice events
  async setupWebhooks(webhooks: {
    created?: string;
    sent?: string;
    paid?: string;
    overdue?: string;
    cancelled?: string;
  }): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/invoices/webhooks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ webhooks })
      });
    } catch (error) {
      console.error('Error setting up webhooks:', error);
      throw error;
    }
  }

  // Helper to get auth token
  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  // Format currency
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  // Calculate due date
  calculateDueDate(issueDate: Date, terms: number = 30): Date {
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + terms);
    return dueDate;
  }

  // Check if invoice is overdue
  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }
}

// Singleton instance
const invoicingService = new InvoicingService();

export default invoicingService;