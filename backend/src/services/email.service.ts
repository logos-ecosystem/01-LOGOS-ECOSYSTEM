import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';
import Handlebars from 'handlebars';

interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  data?: any;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private templatesDir = path.join(__dirname, '../../src/templates/email');
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    // Register Handlebars helpers
    this.registerHandlebarsHelpers();
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      let html = options.html;
      let text = options.text;

      // If template is specified, load and process it
      if (options.template) {
        const template = await this.loadTemplate(options.template);
        html = this.processTemplate(template.html, options.data);
        text = this.processTemplate(template.text, options.data);
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'LOGOS Ecosystem <noreply@logos-ecosystem.com>',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html,
        text,
        attachments: options.attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { messageId: info.messageId, to: options.to });
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  private async loadTemplate(templateName: string): Promise<{ html: string; text: string }> {
    try {
      const htmlPath = path.join(this.templatesDir, `${templateName}.hbs`);
      const textPath = path.join(this.templatesDir, `${templateName}.txt`);

      const [html, text] = await Promise.all([
        fs.readFile(htmlPath, 'utf-8').catch(() => this.getDefaultTemplate()),
        fs.readFile(textPath, 'utf-8').catch(() => '')
      ]);

      return { html, text };
    } catch (error) {
      logger.error('Error loading email template:', error);
      return { html: this.getDefaultTemplate(), text: '' };
    }
  }

  private processTemplate(template: string, data: any): string {
    if (!data) return template;

    // Compile template if not already compiled
    let compiledTemplate = this.compiledTemplates.get(template);
    if (!compiledTemplate) {
      compiledTemplate = Handlebars.compile(template);
      this.compiledTemplates.set(template, compiledTemplate);
    }

    return compiledTemplate(data);
  }

  private registerHandlebarsHelpers() {
    // Format date helper
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    // Format currency helper
    Handlebars.registerHelper('formatNumber', (number: number) => {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(number);
    });

    // Conditional helper
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
  }

  private getDefaultTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: white;
      padding: 30px;
      border: 1px solid #e0e0e0;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>LOGOS AI</h1>
  </div>
  <div class="content">
    {{content}}
  </div>
  <div class="footer">
    <p>&copy; 2024 LOGOS AI. Todos los derechos reservados.</p>
  </div>
</body>
</html>
    `;
  }

  // Pre-defined email methods
  async sendWelcomeEmail(email: string, username: string) {
    await this.sendEmail({
      to: email,
      subject: 'Bienvenido a LOGOS AI',
      template: 'welcome',
      data: { username, email }
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Restablecer contraseña - LOGOS AI',
      template: 'password-reset',
      data: { resetUrl }
    });
  }

  async sendVerificationEmail(email: string, verificationToken: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${verificationToken}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Verifica tu cuenta - LOGOS AI',
      template: 'verify-email',
      data: { verificationUrl }
    });
  }

  async sendSubscriptionConfirmation(email: string, planName: string, amount: number) {
    await this.sendEmail({
      to: email,
      subject: 'Confirmación de suscripción - LOGOS AI',
      template: 'subscription-confirmation',
      data: { planName, amount }
    });
  }

  async sendTicketCreatedEmail(email: string, ticketId: string, subject: string) {
    await this.sendEmail({
      to: email,
      subject: `Ticket creado: ${subject}`,
      template: 'ticket-created',
      data: { ticketId, subject }
    });
  }

  async sendTicketUpdatedEmail(email: string, ticketId: string, status: string) {
    await this.sendEmail({
      to: email,
      subject: `Actualización de ticket #${ticketId}`,
      template: 'ticket-updated',
      data: { ticketId, status }
    });
  }

  async sendInvoice(invoice: any) {
    const emailData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paymentTerms: invoice.paymentTerms || 'Net 30',
      customer: {
        name: invoice.customer.name,
        email: invoice.customer.email,
        address: invoice.customer.address
      },
      items: invoice.items,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      tax: invoice.tax,
      total: invoice.total,
      notes: invoice.notes,
      paymentUrl: `${process.env.APP_URL}/pay/invoice/${invoice.id}`,
      viewUrl: `${process.env.APP_URL}/invoices/${invoice.id}`,
      isPastDue: new Date(invoice.dueDate) < new Date()
    };

    await this.sendEmail({
      to: invoice.customer.email,
      subject: `Invoice ${invoice.invoiceNumber} from LOGOS Ecosystem`,
      template: 'invoice',
      data: emailData,
      attachments: invoice.pdfPath ? [{
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        path: invoice.pdfPath
      }] : undefined
    });
  }

  async sendPaymentReceipt(payment: any) {
    const emailData = {
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.date,
      paymentMethod: payment.method,
      transactionId: payment.reference,
      invoiceNumber: payment.invoice?.invoiceNumber,
      amount: payment.amount,
      currency: payment.currency || 'USD',
      description: payment.description,
      accountUrl: `${process.env.APP_URL}/account/payments`,
      downloadUrl: `${process.env.APP_URL}/receipts/${payment.id}/download`
    };

    await this.sendEmail({
      to: payment.customerEmail,
      subject: `Payment Receipt - LOGOS Ecosystem`,
      template: 'payment-receipt',
      data: emailData
    });
  }

  async sendInvoiceReminder(invoice: any) {
    const daysOverdue = Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    
    await this.sendEmail({
      to: invoice.customer.email,
      subject: `Payment Reminder: Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`,
      template: 'invoice-reminder',
      data: {
        ...invoice,
        daysOverdue,
        paymentUrl: `${process.env.APP_URL}/pay/invoice/${invoice.id}`
      }
    });
  }

  async sendSubscriptionRenewalReminder(subscription: any, daysUntilRenewal: number) {
    await this.sendEmail({
      to: subscription.userEmail,
      subject: `Subscription Renewal Reminder - ${subscription.productName}`,
      template: 'subscription-renewal',
      data: {
        productName: subscription.productName,
        renewalDate: subscription.nextBillingDate,
        daysUntilRenewal,
        amount: subscription.amount,
        manageUrl: `${process.env.APP_URL}/account/subscriptions`
      }
    });
  }
}

export const emailService = new EmailService();
export const sendEmail = (options: EmailOptions) => emailService.sendEmail(options);