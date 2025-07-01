import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import logger from '../utils/logger';
import { i18nService } from './i18n.service';
import path from 'path';
import fs from 'fs/promises';

export class PDFMultilangService {
  private async loadFont(doc: PDFKit.PDFDocument, language: string) {
    try {
      // Load appropriate fonts for different languages
      const fontMap: any = {
        'ja': 'NotoSansCJK-Regular.ttf',
        'zh': 'NotoSansCJK-Regular.ttf',
        'ar': 'NotoSansArabic-Regular.ttf',
        'default': 'Helvetica'
      };

      const fontName = fontMap[language] || fontMap.default;
      if (fontName !== 'Helvetica') {
        const fontPath = path.join(__dirname, '../../fonts', fontName);
        const fontExists = await fs.access(fontPath).then(() => true).catch(() => false);
        if (fontExists) {
          doc.registerFont('Custom', fontPath);
          return 'Custom';
        }
      }
      return 'Helvetica';
    } catch (error) {
      logger.error('Error loading font:', error);
      return 'Helvetica';
    }
  }

  async generateInvoicePDF(invoice: any, language: string = 'en'): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Get translations and formatting
        const t = (key: string, params?: any) => i18nService.translate(key, language, params);
        const langConfig = i18nService.getLanguageConfig(language) || i18nService.getLanguageConfig('en')!;
        const font = await this.loadFont(doc, language);

        // Company Header
        doc
          .fontSize(24)
          .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
          .text('LOGOS ECOSYSTEM', 50, 50);

        doc
          .fontSize(10)
          .font(font)
          .text('123 AI Street', 50, 80)
          .text('San Francisco, CA 94105', 50, 95)
          .text('United States', 50, 110)
          .text('support@logos-ecosystem.com', 50, 125);

        // Invoice title
        doc
          .fontSize(20)
          .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
          .text(t('invoice.title').toUpperCase(), 400, 50, { align: 'right' });

        doc
          .fontSize(10)
          .font(font)
          .text(`${t('invoice.number')}: ${invoice.invoiceNumber}`, 400, 80, { align: 'right' })
          .text(`${t('invoice.issueDate')}: ${i18nService.formatDate(invoice.issueDate, language)}`, 400, 95, { align: 'right' })
          .text(`${t('invoice.dueDate')}: ${i18nService.formatDate(invoice.dueDate, language)}`, 400, 110, { align: 'right' });

        // Status badge
        if (invoice.status) {
          const statusColors: any = {
            paid: '#10b981',
            pending: '#f59e0b',
            overdue: '#ef4444',
            partial: '#3b82f6'
          };
          
          doc
            .fontSize(8)
            .fillColor(statusColors[invoice.status] || '#6b7280')
            .text(t(`invoice.${invoice.status}`).toUpperCase(), 400, 130, { align: 'right' })
            .fillColor('#000000');
        }

        // Bill To
        doc
          .fontSize(12)
          .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
          .text(t('invoice.billTo') + ':', 50, 180);

        doc
          .fontSize(10)
          .font(font)
          .text(invoice.customer?.name || invoice.user?.username || invoice.user?.email || '', 50, 200)
          .text(invoice.customer?.email || invoice.user?.email || '', 50, 215);

        if (invoice.customer?.address || invoice.customerAddress) {
          const address = invoice.customer?.address || invoice.customerAddress;
          doc
            .text(address.line1 || '', 50, 230)
            .text(address.line2 || '', 50, 245)
            .text(`${address.city || ''}, ${address.state || ''} ${address.postalCode || ''}`, 50, 260)
            .text(address.country || '', 50, 275);
        }

        // Items table
        const tableTop = 320;
        const itemCodeX = 50;
        const descriptionX = 100;
        const quantityX = 340;
        const priceX = 400;
        const amountX = 470;

        // Table header
        doc
          .fontSize(10)
          .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
          .text('#', itemCodeX, tableTop)
          .text(t('invoice.description'), descriptionX, tableTop)
          .text(t('invoice.quantity'), quantityX, tableTop)
          .text(t('invoice.unitPrice'), priceX, tableTop)
          .text(t('invoice.amount'), amountX, tableTop);

        // Draw line under header
        doc
          .moveTo(50, tableTop + 15)
          .lineTo(550, tableTop + 15)
          .stroke();

        // Items
        let position = tableTop + 30;
        doc.font(font);

        invoice.items.forEach((item: any, index: number) => {
          doc
            .fontSize(9)
            .text(`${index + 1}`, itemCodeX, position)
            .text(item.description, descriptionX, position, { width: 230 })
            .text(i18nService.formatNumber(item.quantity, language, 0), quantityX, position)
            .text(i18nService.formatCurrency(item.unitPrice, language), priceX, position)
            .text(i18nService.formatCurrency(item.total, language), amountX, position);
          
          position += 25;
        });

        // Totals section
        const totalsX = 380;
        position += 20;

        // Subtotal
        doc
          .fontSize(10)
          .text(t('invoice.subtotal') + ':', totalsX, position)
          .text(i18nService.formatCurrency(invoice.subtotal, language), amountX, position);
        
        position += 20;

        // Discount
        if (invoice.discount > 0) {
          doc
            .text(t('invoice.discount') + ':', totalsX, position)
            .text('-' + i18nService.formatCurrency(invoice.discount, language), amountX, position);
          position += 20;
        }

        // Tax
        if (invoice.tax > 0) {
          doc
            .text(t('invoice.tax') + ':', totalsX, position)
            .text(i18nService.formatCurrency(invoice.tax, language), amountX, position);
          position += 20;
        }

        // Draw line above total
        doc
          .moveTo(totalsX, position)
          .lineTo(550, position)
          .stroke();

        position += 10;

        // Total
        doc
          .fontSize(12)
          .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
          .text(t('invoice.total') + ':', totalsX, position)
          .text(i18nService.formatCurrency(invoice.total, language), amountX, position);

        // Payment terms and notes section
        position += 40;
        
        // Payment terms
        doc
          .fontSize(10)
          .font(font)
          .text(`${t('invoice.paymentTerms')}: ${this.translatePaymentTerms(invoice.paymentTerms, t)}`, 50, position);

        // Bank details or payment instructions
        if (invoice.paymentInstructions || invoice.bankDetails) {
          position += 30;
          doc
            .fontSize(10)
            .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
            .text(t('invoice.paymentInstructions') + ':', 50, position);
          
          position += 15;
          doc
            .font(font)
            .fontSize(9)
            .text(invoice.paymentInstructions || this.formatBankDetails(invoice.bankDetails, language), 50, position, { width: 500 });
        }

        // Notes
        if (invoice.notes) {
          position += 50;
          doc
            .fontSize(10)
            .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
            .text(t('invoice.notes') + ':', 50, position);
          
          position += 15;
          doc
            .font(font)
            .fontSize(9)
            .text(invoice.notes, 50, position, { width: 500 });
        }

        // Footer
        const pageHeight = doc.page.height;
        const footerY = pageHeight - 100;

        doc
          .fontSize(8)
          .font(font)
          .fillColor('#666666')
          .text(t('invoice.thankYou'), 50, footerY, { align: 'center', width: 500 })
          .text(t('email.footer'), 50, footerY + 15, { align: 'center', width: 500 });

        // QR Code for payment (if payment URL exists)
        if (invoice.paymentUrl) {
          // This would require qr-image package
          // const qr = require('qr-image');
          // const qrCode = qr.imageSync(invoice.paymentUrl, { type: 'png', size: 2 });
          // doc.image(qrCode, 480, footerY - 70, { width: 70 });
        }

        // Finalize PDF
        doc.end();
      } catch (error) {
        logger.error('Error generating invoice PDF:', error);
        reject(error);
      }
    });
  }

  async generateReceipt(payment: any, language: string = 'en'): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A5' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const t = (key: string, params?: any) => i18nService.translate(key, language, params);
        const font = await this.loadFont(doc, language);

        // Header
        doc
          .fontSize(20)
          .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
          .text(t('payment.receipt').toUpperCase(), 50, 50, { align: 'center' });

        // Success icon (checkmark)
        doc
          .fontSize(40)
          .fillColor('#10b981')
          .text('✓', 50, 80, { align: 'center' })
          .fillColor('#000000');

        doc
          .fontSize(10)
          .font(font)
          .text(`${t('payment.receipt')} #: ${payment.receiptNumber || payment.id}`, 50, 140)
          .text(`${t('payment.date')}: ${i18nService.formatDate(payment.date, language)}`, 50, 155);

        // Payment details
        doc
          .fontSize(12)
          .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
          .text(t('payment.title') + ' ' + t('common.info') + ':', 50, 190);

        doc
          .fontSize(10)
          .font(font)
          .text(`${t('payment.amount')}: ${i18nService.formatCurrency(payment.amount, language)}`, 50, 210)
          .text(`${t('payment.method')}: ${t(`payment.${payment.method}`)}`, 50, 225)
          .text(`${t('payment.reference')}: ${payment.reference}`, 50, 240);

        // Invoice reference
        if (payment.invoice) {
          doc
            .text(`${t('invoice.number')}: ${payment.invoice.invoiceNumber}`, 50, 255)
            .text(`${t('invoice.total')}: ${i18nService.formatCurrency(payment.invoice.total, language)}`, 50, 270);
          
          const balance = payment.invoice.total - payment.amount;
          if (balance > 0) {
            doc
              .fillColor('#ef4444')
              .text(`${t('invoice.pending')}: ${i18nService.formatCurrency(balance, language)}`, 50, 285)
              .fillColor('#000000');
          }
        }

        // Footer
        doc
          .fontSize(8)
          .fillColor('#666666')
          .text(t('payment.confirmed'), 50, 350, { align: 'center' })
          .text('LOGOS ECOSYSTEM', 50, 365, { align: 'center' });

        doc.end();
      } catch (error) {
        logger.error('Error generating receipt PDF:', error);
        reject(error);
      }
    });
  }

  async generateStatement(customer: any, invoices: any[], startDate: Date, endDate: Date, language: string = 'en'): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const t = (key: string, params?: any) => i18nService.translate(key, language, params);
        const font = await this.loadFont(doc, language);

        // Header
        doc
          .fontSize(24)
          .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
          .text(t('accounting.statement').toUpperCase(), 50, 50);

        doc
          .fontSize(10)
          .font(font)
          .text(`${t('common.from')}: ${i18nService.formatDate(startDate, language)} ${t('common.to')} ${i18nService.formatDate(endDate, language)}`, 50, 80)
          .text(`${t('common.date')}: ${i18nService.formatDate(new Date(), language)}`, 50, 95);

        // Customer info
        doc
          .fontSize(12)
          .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
          .text(t('customer.name') + ':', 50, 130);

        doc
          .fontSize(10)
          .font(font)
          .text(customer.username || customer.email, 50, 150)
          .text(customer.email, 50, 165);

        // Summary in multiple currencies if needed
        const summary = this.calculateStatementSummary(invoices);
        
        doc
          .fontSize(12)
          .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
          .text(t('dashboard.overview') + ':', 300, 130);

        doc
          .fontSize(10)
          .font(font)
          .text(`${t('accounting.totalInvoiced')}: ${i18nService.formatCurrency(summary.totalInvoiced, language)}`, 300, 150)
          .text(`${t('accounting.totalPaid')}: ${i18nService.formatCurrency(summary.totalPaid, language)}`, 300, 165)
          .text(`${t('accounting.balanceDue')}: ${i18nService.formatCurrency(summary.balanceDue, language)}`, 300, 180);

        // Invoices table
        const tableTop = 230;
        const positions = {
          date: 50,
          invoice: 120,
          description: 200,
          amount: 350,
          paid: 420,
          balance: 480
        };

        // Table header
        doc
          .fontSize(10)
          .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
          .text(t('common.date'), positions.date, tableTop)
          .text(t('invoice.number'), positions.invoice, tableTop)
          .text(t('invoice.description'), positions.description, tableTop)
          .text(t('invoice.amount'), positions.amount, tableTop)
          .text(t('invoice.paid'), positions.paid, tableTop)
          .text(t('accounting.balance'), positions.balance, tableTop);

        // Draw line under header
        doc
          .moveTo(50, tableTop + 15)
          .lineTo(550, tableTop + 15)
          .stroke();

        // Invoice rows
        let position = tableTop + 30;
        doc.font(font);

        invoices.forEach((invoice: any) => {
          const paid = invoice.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
          const balance = invoice.total - paid;

          doc
            .fontSize(9)
            .text(i18nService.formatDate(invoice.issueDate, language), positions.date, position)
            .text(invoice.invoiceNumber, positions.invoice, position)
            .text(invoice.items[0]?.description || t('accounting.services'), positions.description, position, { width: 140 })
            .text(i18nService.formatCurrency(invoice.total, language), positions.amount, position)
            .text(i18nService.formatCurrency(paid, language), positions.paid, position)
            .text(i18nService.formatCurrency(balance, language), positions.balance, position);
          
          // Color code overdue invoices
          if (balance > 0 && new Date(invoice.dueDate) < new Date()) {
            doc
              .fillColor('#ef4444')
              .fontSize(6)
              .text(t('invoice.overdue'), positions.balance + 40, position + 2)
              .fillColor('#000000');
          }
          
          position += 20;
        });

        // Summary totals
        position += 10;
        doc
          .moveTo(350, position)
          .lineTo(550, position)
          .stroke();

        position += 10;
        doc
          .fontSize(10)
          .font(font === 'Helvetica' ? 'Helvetica-Bold' : font)
          .text(t('common.total') + ':', positions.amount - 50, position)
          .text(i18nService.formatCurrency(summary.totalInvoiced, language), positions.amount, position)
          .text(i18nService.formatCurrency(summary.totalPaid, language), positions.paid, position)
          .text(i18nService.formatCurrency(summary.balanceDue, language), positions.balance, position);

        // Footer
        const pageHeight = doc.page.height;
        const footerY = pageHeight - 80;

        doc
          .fontSize(8)
          .font(font)
          .fillColor('#666666')
          .text(t('accounting.statementFooter'), 50, footerY, { align: 'center', width: 500 });

        doc.end();
      } catch (error) {
        logger.error('Error generating statement PDF:', error);
        reject(error);
      }
    });
  }

  private calculateStatementSummary(invoices: any[]) {
    let totalInvoiced = 0;
    let totalPaid = 0;

    invoices.forEach(invoice => {
      totalInvoiced += invoice.total;
      const paid = invoice.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
      totalPaid += paid;
    });

    return {
      totalInvoiced,
      totalPaid,
      balanceDue: totalInvoiced - totalPaid
    };
  }

  private translatePaymentTerms(terms: string, t: Function): string {
    const termMap: any = {
      'Net 30': 'net30',
      'Net 15': 'net15',
      'Net 60': 'net60',
      'Due on Receipt': 'dueOnReceipt',
      'Custom': 'custom'
    };

    const termKey = termMap[terms];
    return termKey ? t(`invoice.${termKey}`) : terms;
  }

  private formatBankDetails(bankDetails: any, language: string): string {
    if (!bankDetails) return '';

    const lines = [];
    if (bankDetails.bankName) lines.push(`Bank: ${bankDetails.bankName}`);
    if (bankDetails.accountName) lines.push(`Account Name: ${bankDetails.accountName}`);
    if (bankDetails.accountNumber) lines.push(`Account Number: ${bankDetails.accountNumber}`);
    if (bankDetails.routingNumber) lines.push(`Routing Number: ${bankDetails.routingNumber}`);
    if (bankDetails.swift) lines.push(`SWIFT/BIC: ${bankDetails.swift}`);
    if (bankDetails.iban) lines.push(`IBAN: ${bankDetails.iban}`);

    return lines.join('\n');
  }
}

export const pdfMultilangService = new PDFMultilangService();