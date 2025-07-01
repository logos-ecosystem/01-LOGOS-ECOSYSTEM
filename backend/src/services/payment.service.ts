import { prisma } from '../config/database';
import { stripeService } from './stripe.service';
import { paypalService } from './paypal.service';
import { logger } from '../utils/logger';
import { PaymentMethod } from '@prisma/client';

interface PaymentServiceInterface {
  createSubscription(params: any): Promise<any>;
  cancelSubscription(subscriptionId: string, reason?: string): Promise<void>;
  createPayment(params: any): Promise<any>;
  refundPayment(paymentId: string, amount?: number, reason?: string): Promise<any>;
}

interface UnifiedPaymentResult {
  success: boolean;
  paymentMethod: PaymentMethod;
  transactionId: string;
  approvalUrl?: string;
  data?: any;
  error?: string;
}

class PaymentService {
  private services: Record<PaymentMethod, PaymentServiceInterface>;

  constructor() {
    this.services = {
      STRIPE: stripeService,
      PAYPAL: paypalService
    };
  }

  // Get user's preferred payment method
  async getUserPaymentMethod(userId: string): Promise<PaymentMethod> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultPaymentMethod: true }
    });

    return user?.defaultPaymentMethod || PaymentMethod.STRIPE;
  }

  // Create subscription with preferred payment method
  async createSubscription(
    userId: string,
    planId: string,
    paymentMethod?: PaymentMethod
  ): Promise<UnifiedPaymentResult> {
    try {
      const method = paymentMethod || await this.getUserPaymentMethod(userId);
      const plan = await prisma.plan.findUnique({ where: { id: planId } });

      if (!plan) {
        throw new Error('Plan not found');
      }

      let result;

      switch (method) {
        case PaymentMethod.STRIPE:
          if (!plan.stripePriceId) {
            throw new Error('Plan not available for Stripe payments');
          }

          const stripeResult = await stripeService.createSubscription(userId, plan.stripePriceId);
          result = {
            success: true,
            paymentMethod: PaymentMethod.STRIPE,
            transactionId: stripeResult.subscriptionId,
            data: stripeResult
          };
          break;

        case PaymentMethod.PAYPAL:
          if (!plan.paypalPlanId) {
            throw new Error('Plan not available for PayPal payments');
          }

          const paypalResult = await paypalService.createSubscription({
            planId: plan.paypalPlanId,
            userId,
            returnUrl: `${process.env.FRONTEND_URL}/dashboard/billing/success`,
            cancelUrl: `${process.env.FRONTEND_URL}/dashboard/billing/cancel`
          });

          result = {
            success: true,
            paymentMethod: PaymentMethod.PAYPAL,
            transactionId: paypalResult.subscriptionId,
            approvalUrl: paypalResult.approvalUrl,
            data: paypalResult
          };
          break;

        default:
          throw new Error('Invalid payment method');
      }

      return result;
    } catch (error: any) {
      logger.error('Error creating subscription:', error);
      return {
        success: false,
        paymentMethod: paymentMethod || PaymentMethod.STRIPE,
        transactionId: '',
        error: error.message
      };
    }
  }

  // Cancel subscription
  async cancelSubscription(
    subscriptionId: string,
    paymentMethod: PaymentMethod,
    reason?: string
  ): Promise<UnifiedPaymentResult> {
    try {
      const service = this.services[paymentMethod];
      await service.cancelSubscription(subscriptionId, reason);

      return {
        success: true,
        paymentMethod,
        transactionId: subscriptionId
      };
    } catch (error: any) {
      logger.error('Error cancelling subscription:', error);
      return {
        success: false,
        paymentMethod,
        transactionId: subscriptionId,
        error: error.message
      };
    }
  }

  // Create one-time payment
  async createPayment(
    userId: string,
    amount: number,
    currency: string = 'USD',
    description?: string,
    paymentMethod?: PaymentMethod,
    metadata?: any
  ): Promise<UnifiedPaymentResult> {
    try {
      const method = paymentMethod || await this.getUserPaymentMethod(userId);
      let result;

      switch (method) {
        case PaymentMethod.STRIPE:
          const stripePayment = await stripeService.createPaymentIntent({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency.toLowerCase(),
            description,
            metadata: {
              userId,
              ...metadata
            }
          });

          result = {
            success: true,
            paymentMethod: PaymentMethod.STRIPE,
            transactionId: stripePayment.id,
            data: {
              clientSecret: stripePayment.client_secret,
              paymentIntentId: stripePayment.id
            }
          };
          break;

        case PaymentMethod.PAYPAL:
          const paypalPayment = await paypalService.createPayment({
            amount,
            currency,
            description,
            invoiceId: metadata?.invoiceId,
            returnUrl: `${process.env.FRONTEND_URL}/dashboard/billing/success`,
            cancelUrl: `${process.env.FRONTEND_URL}/dashboard/billing/cancel`
          });

          result = {
            success: true,
            paymentMethod: PaymentMethod.PAYPAL,
            transactionId: paypalPayment.paymentId,
            approvalUrl: paypalPayment.approvalUrl,
            data: paypalPayment
          };
          break;

        default:
          throw new Error('Invalid payment method');
      }

      return result;
    } catch (error: any) {
      logger.error('Error creating payment:', error);
      return {
        success: false,
        paymentMethod: paymentMethod || PaymentMethod.STRIPE,
        transactionId: '',
        error: error.message
      };
    }
  }

  // Process refund
  async refundPayment(
    paymentId: string,
    paymentMethod: PaymentMethod,
    amount?: number,
    reason?: string
  ): Promise<UnifiedPaymentResult> {
    try {
      let result;

      switch (paymentMethod) {
        case PaymentMethod.STRIPE:
          const stripeRefund = await stripeService.createRefund(paymentId, amount, reason);
          result = {
            success: true,
            paymentMethod: PaymentMethod.STRIPE,
            transactionId: stripeRefund.id,
            data: stripeRefund
          };
          break;

        case PaymentMethod.PAYPAL:
          const paypalRefund = await paypalService.refundPayment(paymentId, amount, 'USD', reason);
          result = {
            success: true,
            paymentMethod: PaymentMethod.PAYPAL,
            transactionId: paypalRefund.id,
            data: paypalRefund
          };
          break;

        default:
          throw new Error('Invalid payment method');
      }

      return result;
    } catch (error: any) {
      logger.error('Error processing refund:', error);
      return {
        success: false,
        paymentMethod,
        transactionId: paymentId,
        error: error.message
      };
    }
  }

  // Get available payment methods for user
  async getAvailablePaymentMethods(userId: string): Promise<{
    methods: Array<{
      type: PaymentMethod;
      isDefault: boolean;
      isConfigured: boolean;
      customerId?: string;
    }>;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeCustomerId: true,
        paypalCustomerId: true,
        defaultPaymentMethod: true
      }
    });

    const methods = [];

    // Check Stripe
    methods.push({
      type: PaymentMethod.STRIPE,
      isDefault: user?.defaultPaymentMethod === PaymentMethod.STRIPE,
      isConfigured: !!user?.stripeCustomerId,
      customerId: user?.stripeCustomerId || undefined
    });

    // Check PayPal
    methods.push({
      type: PaymentMethod.PAYPAL,
      isDefault: user?.defaultPaymentMethod === PaymentMethod.PAYPAL,
      isConfigured: !!user?.paypalCustomerId,
      customerId: user?.paypalCustomerId || undefined
    });

    return { methods };
  }

  // Update default payment method
  async updateDefaultPaymentMethod(
    userId: string,
    paymentMethod: PaymentMethod
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { defaultPaymentMethod: paymentMethod }
    });
  }

  // Sync subscription status from payment provider
  async syncSubscriptionStatus(
    subscriptionId: string,
    paymentMethod: PaymentMethod
  ): Promise<void> {
    try {
      let status;
      let currentPeriodEnd;

      switch (paymentMethod) {
        case PaymentMethod.STRIPE:
          const stripeSubscription = await stripeService.stripe.subscriptions.retrieve(subscriptionId);
          status = stripeSubscription.status;
          currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
          break;

        case PaymentMethod.PAYPAL:
          const paypalSubscription = await paypalService.getSubscription(subscriptionId);
          status = paypalSubscription.status.toLowerCase();
          currentPeriodEnd = paypalSubscription.billing_info?.next_billing_time 
            ? new Date(paypalSubscription.billing_info.next_billing_time)
            : undefined;
          break;

        default:
          throw new Error('Invalid payment method');
      }

      // Update subscription in database
      if (status && currentPeriodEnd) {
        const updateData: any = { status };
        if (currentPeriodEnd) {
          updateData.currentPeriodEnd = currentPeriodEnd;
        }

        await prisma.subscription.update({
          where: paymentMethod === PaymentMethod.STRIPE 
            ? { stripeSubscriptionId: subscriptionId }
            : { paypalSubscriptionId: subscriptionId },
          data: updateData
        });
      }
    } catch (error) {
      logger.error('Error syncing subscription status:', error);
      throw error;
    }
  }

  // Get payment history
  async getPaymentHistory(userId: string): Promise<any[]> {
    const [stripePayments, invoices] = await Promise.all([
      // Get Stripe payment intents
      prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true }
      }).then(async (user) => {
        if (!user?.stripeCustomerId) return [];
        
        const payments = await stripeService.stripe.paymentIntents.list({
          customer: user.stripeCustomerId,
          limit: 100
        });
        
        return payments.data.map(payment => ({
          id: payment.id,
          type: 'stripe',
          amount: payment.amount / 100,
          currency: payment.currency.toUpperCase(),
          status: payment.status,
          description: payment.description,
          createdAt: new Date(payment.created * 1000),
          method: 'STRIPE'
        }));
      }),

      // Get invoices with payments
      prisma.invoice.findMany({
        where: { userId },
        include: { payments: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Combine and sort by date
    const allPayments = [
      ...stripePayments,
      ...invoices.flatMap(invoice => 
        invoice.payments.map(payment => ({
          id: payment.id,
          type: 'invoice',
          amount: payment.amount,
          currency: invoice.currency,
          status: 'succeeded',
          description: `Invoice #${invoice.invoiceNumber}`,
          createdAt: payment.date,
          method: payment.method.toUpperCase() as PaymentMethod
        }))
      )
    ];

    return allPayments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

// Export singleton instance
export const paymentService = new PaymentService();