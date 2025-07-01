import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export class InvoiceService {
  async createInvoice(data: any) {
    try {
      return await prisma.invoice.create({ data });
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  }

  async getInvoice(id: string) {
    return await prisma.invoice.findUnique({ where: { id } });
  }

  async updateInvoice(id: string, data: any) {
    return await prisma.invoice.update({ where: { id }, data });
  }
}

export const invoiceService = new InvoiceService();
