import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { logger } from '../utils/logger';

export class PDFService {
  async generateInvoicePDF(invoice: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('LOGOS ECOSYSTEM', 50, 50);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text('123 AI Street', 50, 80)
          .text('San Francisco, CA 94105', 50, 95)
          .text('United States', 50, 110)
          .text('support@logos-ecosystem.com', 50, 125);

        // Invoice title
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('INVOICE', 400, 50, { align: 'right' });

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Invoice #: ${invoice.invoiceNumber}`, 400, 80, { align: 'right' })
          .text(`Date: ${format(new Date(invoice.issueDate), 'MMM dd, yyyy')}`, 400, 95, { align: 'right' })
          .text(`Due: ${format(new Date(invoice.dueDate), 'MMM dd, yyyy')}`, 400, 110, { align: 'right' });

        // Bill To
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Bill To:', 50, 180);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(invoice.user.username || invoice.user.email, 50, 200)
          .text(invoice.user.email, 50, 215);

        if (invoice.customerAddress) {
          doc
            .text(invoice.customerAddress.line1, 50, 230)
            .text(`${invoice.customerAddress.city}, ${invoice.customerAddress.state} ${invoice.customerAddress.postalCode}`, 50, 245)
            .text(invoice.customerAddress.country, 50, 260);
        }

        // Items table
        const tableTop = 320;
        const itemCodeX = 50;
        const descriptionX = 150;
        const quantityX = 350;
        const priceX = 400;
        const amountX = 460;

        // Table header
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Item', itemCodeX, tableTop)
          .text('Description', descriptionX, tableTop)
          .text('Qty', quantityX, tableTop)
          .text('Price', priceX, tableTop)
          .text('Amount', amountX, tableTop);

        // Draw line under header
        doc
          .moveTo(50, tableTop + 15)
          .lineTo(550, tableTop + 15)
          .stroke();

        // Items
        let position = tableTop + 30;
        doc.font('Helvetica');

        invoice.items.forEach((item: any, index: number) => {
          doc
            .text(`${index + 1}`, itemCodeX, position)
            .text(item.description, descriptionX, position, { width: 190 })
            .text(item.quantity.toString(), quantityX, position)
            .text(`$${item.unitPrice.toFixed(2)}`, priceX, position)
            .text(`$${item.total.toFixed(2)}`, amountX, position);
          
          position += 25;
        });

        // Totals
        const totalsX = 400;
        position += 20;

        // Subtotal
        doc
          .text('Subtotal:', totalsX, position)
          .text(`$${invoice.subtotal.toFixed(2)}`, amountX, position);
        
        position += 20;

        // Discount
        if (invoice.discount > 0) {
          doc
            .text('Discount:', totalsX, position)
            .text(`-$${invoice.discount.toFixed(2)}`, amountX, position);
          position += 20;
        }

        // Tax
        if (invoice.tax > 0) {
          doc
            .text('Tax:', totalsX, position)
            .text(`$${invoice.tax.toFixed(2)}`, amountX, position);
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
          .font('Helvetica-Bold')
          .text('Total:', totalsX, position)
          .text(`$${invoice.total.toFixed(2)}`, amountX, position);

        // Payment terms
        position += 40;
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Payment Terms: ${invoice.paymentTerms}`, 50, position);

        // Notes
        if (invoice.notes) {
          position += 30;
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Notes:', 50, position);
          
          position += 15;
          doc
            .font('Helvetica')
            .text(invoice.notes, 50, position, { width: 500 });
        }

        // Footer
        doc
          .fontSize(8)
          .font('Helvetica')
          .text('Thank you for your business!', 50, 700, { align: 'center', width: 500 })
          .text('For questions about this invoice, please contact support@logos-ecosystem.com', 50, 715, { align: 'center', width: 500 });

        // Finalize PDF
        doc.end();
      } catch (error) {
        logger.error('Error generating invoice PDF:', error);
        reject(error);
      }
    });
  }

  async generateReceipt(payment: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A5' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('PAYMENT RECEIPT', 50, 50, { align: 'center' });

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Receipt #: ${payment.id}`, 50, 100)
          .text(`Date: ${format(new Date(payment.date), 'MMM dd, yyyy HH:mm')}`, 50, 115);

        // Payment details
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Payment Details:', 50, 150);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Amount: $${payment.amount.toFixed(2)}`, 50, 170)
          .text(`Method: ${payment.method}`, 50, 185)
          .text(`Reference: ${payment.reference}`, 50, 200);

        // Invoice reference
        if (payment.invoice) {
          doc
            .text(`Invoice: ${payment.invoice.invoiceNumber}`, 50, 215)
            .text(`Invoice Total: $${payment.invoice.total.toFixed(2)}`, 50, 230);
        }

        // Footer
        doc
          .fontSize(8)
          .text('This is an official payment receipt', 50, 350, { align: 'center' })
          .text('LOGOS ECOSYSTEM', 50, 365, { align: 'center' });

        doc.end();
      } catch (error) {
        logger.error('Error generating receipt PDF:', error);
        reject(error);
      }
    });
  }

  async generateStatement(customer: any, invoices: any[], startDate: Date, endDate: Date): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('STATEMENT', 50, 50);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 50, 80)
          .text(`Generated: ${format(new Date(), 'MMM dd, yyyy')}`, 50, 95);

        // Customer info
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Customer:', 50, 130);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(customer.username || customer.email, 50, 150)
          .text(customer.email, 50, 165);

        // Summary
        const summary = this.calculateStatementSummary(invoices);
        
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Summary:', 300, 130);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Total Invoiced: $${summary.totalInvoiced.toFixed(2)}`, 300, 150)
          .text(`Total Paid: $${summary.totalPaid.toFixed(2)}`, 300, 165)
          .text(`Balance Due: $${summary.balanceDue.toFixed(2)}`, 300, 180);

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
          .font('Helvetica-Bold')
          .text('Date', positions.date, tableTop)
          .text('Invoice #', positions.invoice, tableTop)
          .text('Description', positions.description, tableTop)
          .text('Amount', positions.amount, tableTop)
          .text('Paid', positions.paid, tableTop)
          .text('Balance', positions.balance, tableTop);

        // Draw line under header
        doc
          .moveTo(50, tableTop + 15)
          .lineTo(550, tableTop + 15)
          .stroke();

        // Invoice rows
        let position = tableTop + 30;
        doc.font('Helvetica');

        invoices.forEach((invoice: any) => {
          const paid = invoice.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
          const balance = invoice.total - paid;

          doc
            .fontSize(9)
            .text(format(new Date(invoice.issueDate), 'MMM dd'), positions.date, position)
            .text(invoice.invoiceNumber, positions.invoice, position)
            .text(invoice.items[0]?.description || 'Services', positions.description, position, { width: 140 })
            .text(`$${invoice.total.toFixed(2)}`, positions.amount, position)
            .text(`$${paid.toFixed(2)}`, positions.paid, position)
            .text(`$${balance.toFixed(2)}`, positions.balance, position);
          
          position += 20;
        });

        // Footer
        doc
          .fontSize(8)
          .font('Helvetica')
          .text('For questions about this statement, please contact support@logos-ecosystem.com', 50, 700, { align: 'center', width: 500 });

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
}

export const pdfService = new PDFService();