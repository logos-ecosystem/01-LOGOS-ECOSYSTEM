import axios from 'axios';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { invoiceService } from './invoice.service';
import { AuditLogService } from './auditLog.service';
import crypto from 'crypto';

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
  webhookId?: string;
}

interface PayPalProduct {
  id: string;
  name: string;
  description: string;
  type: 'SERVICE' | 'DIGITAL' | 'PHYSICAL';
  category: string;
  image_url?: string;
  home_url?: string;
}

interface PayPalPlan {
  id: string;
  product_id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  billing_cycles: Array<{
    frequency: {
      interval_unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
      interval_count: number;
    };
    tenure_type: 'REGULAR' | 'TRIAL';
    sequence: number;
    total_cycles?: number;
    pricing_scheme: {
      fixed_price: {
        value: string;
        currency_code: string;
      };
    };
  }>;
  payment_preferences: {
    auto_bill_outstanding: boolean;
    setup_fee?: {
      value: string;
      currency_code: string;
    };
    setup_fee_failure_action: 'CONTINUE' | 'CANCEL';
    payment_failure_threshold: number;
  };
  taxes?: {
    percentage: string;
    inclusive: boolean;
  };
}

interface PayPalSubscription {
  id: string;
  plan_id: string;
  status: string;
  status_update_time: string;
  start_time: string;
  quantity: string;
  shipping_amount?: {
    currency_code: string;
    value: string;
  };
  subscriber: {
    name?: {
      given_name: string;
      surname: string;
    };
    email_address: string;
    payer_id?: string;
    shipping_address?: any;
  };
  billing_info?: {
    outstanding_balance: {
      currency_code: string;
      value: string;
    };
    cycle_executions?: Array<{
      tenure_type: string;
      sequence: number;
      cycles_completed: number;
      cycles_remaining?: number;
      total_cycles?: number;
    }>;
    last_payment?: {
      amount: {
        currency_code: string;
        value: string;
      };
      time: string;
    };
    next_billing_time?: string;
    failed_payments_count: number;
  };
  custom_id?: string;
  application_context?: {
    brand_name?: string;
    locale?: string;
    shipping_preference?: string;
    user_action?: string;
    payment_method?: {
      payer_selected?: string;
      payee_preferred?: string;
    };
    return_url?: string;
    cancel_url?: string;
  };
}

class PayPalService {
  private config: PayPalConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.config = {
      clientId: process.env.PAYPAL_CLIENT_ID!,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
      mode: (process.env.PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox',
      webhookId: process.env.PAYPAL_WEBHOOK_ID
    };

    this.baseUrl = this.config.mode === 'live' 
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  // Get PayPal OAuth access token
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);
      
      return this.accessToken;
    } catch (error) {
      logger.error('Error getting PayPal access token:', error);
      throw new Error('Failed to authenticate with PayPal');
    }
  }

  // Create a product in PayPal
  async createProduct(data: {
    name: string;
    description: string;
    type?: 'SERVICE' | 'DIGITAL' | 'PHYSICAL';
    category?: string;
    imageUrl?: string;
    homeUrl?: string;
  }): Promise<PayPalProduct> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/catalogs/products`,
        {
          name: data.name,
          description: data.description,
          type: data.type || 'SERVICE',
          category: data.category || 'SOFTWARE',
          image_url: data.imageUrl,
          home_url: data.homeUrl
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': crypto.randomUUID()
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error creating PayPal product:', error);
      throw error;
    }
  }

  // Create a billing plan
  async createPlan(data: {
    productId: string;
    name: string;
    description: string;
    price: number;
    currency?: string;
    interval: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
    intervalCount?: number;
    trialDays?: number;
    setupFee?: number;
  }): Promise<PayPalPlan> {
    const accessToken = await this.getAccessToken();

    const billingCycles = [];

    // Add trial period if specified
    if (data.trialDays && data.trialDays > 0) {
      billingCycles.push({
        frequency: {
          interval_unit: 'DAY',
          interval_count: data.trialDays
        },
        tenure_type: 'TRIAL',
        sequence: 1,
        total_cycles: 1,
        pricing_scheme: {
          fixed_price: {
            value: '0',
            currency_code: data.currency || 'USD'
          }
        }
      });
    }

    // Add regular billing cycle
    billingCycles.push({
      frequency: {
        interval_unit: data.interval,
        interval_count: data.intervalCount || 1
      },
      tenure_type: 'REGULAR',
      sequence: data.trialDays ? 2 : 1,
      pricing_scheme: {
        fixed_price: {
          value: data.price.toFixed(2),
          currency_code: data.currency || 'USD'
        }
      }
    });

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/billing/plans`,
        {
          product_id: data.productId,
          name: data.name,
          description: data.description,
          status: 'ACTIVE',
          billing_cycles: billingCycles,
          payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee: data.setupFee ? {
              value: data.setupFee.toFixed(2),
              currency_code: data.currency || 'USD'
            } : undefined,
            setup_fee_failure_action: 'CONTINUE',
            payment_failure_threshold: 3
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': crypto.randomUUID()
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error creating PayPal plan:', error);
      throw error;
    }
  }

  // Create a subscription
  async createSubscription(data: {
    planId: string;
    userId: string;
    customId?: string;
    startTime?: Date;
    returnUrl?: string;
    cancelUrl?: string;
  }): Promise<{ subscriptionId: string; approvalUrl: string }> {
    const accessToken = await this.getAccessToken();

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true, username: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/billing/subscriptions`,
        {
          plan_id: data.planId,
          start_time: data.startTime?.toISOString() || new Date().toISOString(),
          subscriber: {
            name: {
              given_name: user.username || user.email.split('@')[0],
              surname: ''
            },
            email_address: user.email
          },
          custom_id: data.customId || data.userId,
          application_context: {
            brand_name: 'LOGOS AI Ecosystem',
            locale: 'en-US',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'SUBSCRIBE_NOW',
            payment_method: {
              payer_selected: 'PAYPAL',
              payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
            },
            return_url: data.returnUrl || `${process.env.FRONTEND_URL}/dashboard/billing/success`,
            cancel_url: data.cancelUrl || `${process.env.FRONTEND_URL}/dashboard/billing/cancel`
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': crypto.randomUUID()
          }
        }
      );

      // Find the approval URL
      const approvalUrl = response.data.links.find((link: any) => link.rel === 'approve')?.href;

      if (!approvalUrl) {
        throw new Error('No approval URL returned from PayPal');
      }

      // Store PayPal subscription ID
      await prisma.user.update({
        where: { id: data.userId },
        data: {
          paypalCustomerId: response.data.id
        }
      });

      return {
        subscriptionId: response.data.id,
        approvalUrl
      };
    } catch (error) {
      logger.error('Error creating PayPal subscription:', error);
      throw error;
    }
  }

  // Get subscription details
  async getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error getting PayPal subscription:', error);
      throw error;
    }
  }

  // Update subscription
  async updateSubscription(subscriptionId: string, updates: any[]): Promise<void> {
    const accessToken = await this.getAccessToken();

    try {
      await axios.patch(
        `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
        updates,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      logger.error('Error updating PayPal subscription:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    try {
      await axios.post(
        `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
        {
          reason: reason || 'Customer requested cancellation'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      logger.error('Error cancelling PayPal subscription:', error);
      throw error;
    }
  }

  // Suspend subscription
  async suspendSubscription(subscriptionId: string, reason?: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    try {
      await axios.post(
        `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/suspend`,
        {
          reason: reason || 'Payment failure'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      logger.error('Error suspending PayPal subscription:', error);
      throw error;
    }
  }

  // Reactivate subscription
  async reactivateSubscription(subscriptionId: string, reason?: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    try {
      await axios.post(
        `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/activate`,
        {
          reason: reason || 'Customer resolved payment issue'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      logger.error('Error reactivating PayPal subscription:', error);
      throw error;
    }
  }

  // Create payment for invoice
  async createPayment(data: {
    amount: number;
    currency?: string;
    description?: string;
    invoiceId?: string;
    returnUrl?: string;
    cancelUrl?: string;
    items?: Array<{
      name: string;
      description?: string;
      quantity: number;
      price: number;
    }>;
  }): Promise<{ paymentId: string; approvalUrl: string }> {
    const accessToken = await this.getAccessToken();

    const itemsTotal = data.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || data.amount;

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: data.invoiceId || crypto.randomUUID(),
            description: data.description || 'LOGOS AI Services',
            custom_id: data.invoiceId,
            amount: {
              currency_code: data.currency || 'USD',
              value: data.amount.toFixed(2),
              breakdown: data.items ? {
                item_total: {
                  currency_code: data.currency || 'USD',
                  value: itemsTotal.toFixed(2)
                }
              } : undefined
            },
            items: data.items?.map(item => ({
              name: item.name,
              description: item.description,
              quantity: item.quantity.toString(),
              unit_amount: {
                currency_code: data.currency || 'USD',
                value: item.price.toFixed(2)
              }
            }))
          }],
          application_context: {
            brand_name: 'LOGOS AI Ecosystem',
            landing_page: 'BILLING',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url: data.returnUrl || `${process.env.FRONTEND_URL}/dashboard/billing/success`,
            cancel_url: data.cancelUrl || `${process.env.FRONTEND_URL}/dashboard/billing/cancel`
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': crypto.randomUUID()
          }
        }
      );

      const approvalUrl = response.data.links.find((link: any) => link.rel === 'approve')?.href;

      if (!approvalUrl) {
        throw new Error('No approval URL returned from PayPal');
      }

      return {
        paymentId: response.data.id,
        approvalUrl
      };
    } catch (error) {
      logger.error('Error creating PayPal payment:', error);
      throw error;
    }
  }

  // Capture payment
  async capturePayment(orderId: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error capturing PayPal payment:', error);
      throw error;
    }
  }

  // Refund payment
  async refundPayment(captureId: string, amount?: number, currency?: string, reason?: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/payments/captures/${captureId}/refund`,
        {
          amount: amount ? {
            value: amount.toFixed(2),
            currency_code: currency || 'USD'
          } : undefined,
          note_to_payer: reason
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': crypto.randomUUID()
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error refunding PayPal payment:', error);
      throw error;
    }
  }

  // Handle webhook
  async handleWebhook(headers: any, body: any): Promise<{ received: boolean }> {
    try {
      // Verify webhook signature
      if (this.config.webhookId) {
        const isValid = await this.verifyWebhookSignature(headers, body);
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      const event = body;
      logger.info(`PayPal webhook received: ${event.event_type}`, { eventId: event.id });

      // Handle different event types
      switch (event.event_type) {
        case 'BILLING.SUBSCRIPTION.CREATED':
          await this.handleSubscriptionCreated(event);
          break;

        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await this.handleSubscriptionActivated(event);
          break;

        case 'BILLING.SUBSCRIPTION.UPDATED':
          await this.handleSubscriptionUpdated(event);
          break;

        case 'BILLING.SUBSCRIPTION.EXPIRED':
        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await this.handleSubscriptionCancelled(event);
          break;

        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          await this.handleSubscriptionSuspended(event);
          break;

        case 'PAYMENT.SALE.COMPLETED':
          await this.handlePaymentCompleted(event);
          break;

        case 'PAYMENT.SALE.REFUNDED':
          await this.handlePaymentRefunded(event);
          break;

        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handleCaptureCompleted(event);
          break;

        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
          await this.handlePaymentFailed(event);
          break;

        default:
          logger.info(`Unhandled PayPal webhook event: ${event.event_type}`);
      }

      return { received: true };
    } catch (error) {
      logger.error('Error handling PayPal webhook:', error);
      throw error;
    }
  }

  // Verify webhook signature
  private async verifyWebhookSignature(headers: any, body: any): Promise<boolean> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
        {
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: this.config.webhookId,
          webhook_event: body
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.verification_status === 'SUCCESS';
    } catch (error) {
      logger.error('Error verifying PayPal webhook signature:', error);
      return false;
    }
  }

  // Webhook handlers
  private async handleSubscriptionCreated(event: any) {
    const subscription = event.resource;
    const userId = subscription.custom_id;

    logger.info(`PayPal subscription created: ${subscription.id} for user ${userId}`);

    // Audit log
    await auditLogService.log({
      action: 'paypal_subscription_created',
      entity: 'subscription',
      entityId: subscription.id,
      userId,
      metadata: { planId: subscription.plan_id }
    });
  }

  private async handleSubscriptionActivated(event: any) {
    const subscription = event.resource;
    const userId = subscription.custom_id;

    // Find plan details
    const plan = await prisma.plan.findFirst({
      where: { paypalPlanId: subscription.plan_id }
    });

    if (!plan) {
      logger.error(`Plan not found for PayPal plan ID: ${subscription.plan_id}`);
      return;
    }

    // Create or update subscription in database
    await prisma.subscription.upsert({
      where: { paypalSubscriptionId: subscription.id },
      update: {
        status: 'active',
        currentPeriodEnd: new Date(subscription.billing_info?.next_billing_time || Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      create: {
        userId,
        planId: plan.id,
        paypalSubscriptionId: subscription.id,
        stripeSubscriptionId: '', // PayPal doesn't use Stripe IDs
        stripeCustomerId: '', // PayPal doesn't use Stripe IDs
        status: 'active',
        currentPeriodEnd: new Date(subscription.billing_info?.next_billing_time || Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    // Send confirmation email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Subscription Activated',
        template: 'subscription-activated',
        data: {
          planName: plan.name,
          nextBillingDate: subscription.billing_info?.next_billing_time
        }
      });
    }

    // Audit log
    await auditLogService.log({
      action: 'paypal_subscription_activated',
      entity: 'subscription',
      entityId: subscription.id,
      userId,
      metadata: { planId: plan.id }
    });
  }

  private async handleSubscriptionUpdated(event: any) {
    const subscription = event.resource;

    await prisma.subscription.update({
      where: { paypalSubscriptionId: subscription.id },
      data: {
        status: subscription.status.toLowerCase(),
        currentPeriodEnd: new Date(subscription.billing_info?.next_billing_time || Date.now())
      }
    });
  }

  private async handleSubscriptionCancelled(event: any) {
    const subscription = event.resource;

    await prisma.subscription.update({
      where: { paypalSubscriptionId: subscription.id },
      data: {
        status: 'canceled',
        canceledAt: new Date()
      }
    });

    // Send cancellation email
    const dbSubscription = await prisma.subscription.findUnique({
      where: { paypalSubscriptionId: subscription.id },
      include: { user: true, plan: true }
    });

    if (dbSubscription?.user) {
      await emailService.sendEmail({
        to: dbSubscription.user.email,
        subject: 'Subscription Cancelled',
        template: 'subscription-cancelled',
        data: {
          planName: dbSubscription.plan.name,
          endDate: dbSubscription.currentPeriodEnd
        }
      });
    }
  }

  private async handleSubscriptionSuspended(event: any) {
    const subscription = event.resource;

    await prisma.subscription.update({
      where: { paypalSubscriptionId: subscription.id },
      data: { status: 'past_due' }
    });
  }

  private async handlePaymentCompleted(event: any) {
    const sale = event.resource;
    const invoiceId = sale.invoice_id || sale.custom;

    if (invoiceId) {
      // Update invoice status
      await invoiceService.markAsPaid(invoiceId, {
        method: 'paypal',
        reference: sale.id,
        amount: parseFloat(sale.amount.total),
        date: new Date(sale.create_time)
      });
    }

    // Audit log
    await auditLogService.log({
      action: 'paypal_payment_completed',
      entity: 'payment',
      entityId: sale.id,
      metadata: {
        amount: sale.amount.total,
        currency: sale.amount.currency,
        invoiceId
      }
    });
  }

  private async handlePaymentRefunded(event: any) {
    const refund = event.resource;
    
    // Audit log
    await auditLogService.log({
      action: 'paypal_payment_refunded',
      entity: 'payment',
      entityId: refund.id,
      metadata: {
        amount: refund.amount.total,
        currency: refund.amount.currency,
        reason: refund.reason
      }
    });
  }

  private async handleCaptureCompleted(event: any) {
    const capture = event.resource;
    const invoiceId = capture.custom_id;

    if (invoiceId) {
      // Update invoice status
      await invoiceService.markAsPaid(invoiceId, {
        method: 'paypal',
        reference: capture.id,
        amount: parseFloat(capture.amount.value),
        date: new Date(capture.create_time)
      });
    }
  }

  private async handlePaymentFailed(event: any) {
    const subscription = event.resource;
    const userId = subscription.custom_id;

    // Send payment failed email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Payment Failed',
        template: 'payment-failed',
        data: {
          updatePaymentUrl: `${process.env.FRONTEND_URL}/dashboard/billing`
        }
      });
    }

    // Audit log
    await auditLogService.log({
      action: 'paypal_payment_failed',
      entity: 'subscription',
      entityId: subscription.id,
      userId,
      metadata: { reason: 'Payment failed' }
    });
  }

  // Sync plans with PayPal
  async syncPlans(): Promise<void> {
    try {
      const plans = await prisma.plan.findMany({
        where: { isActive: true }
      });

      for (const plan of plans) {
        if (!plan.paypalPlanId) {
          // Create product first
          const product = await this.createProduct({
            name: 'LOGOS AI Expert Bots',
            description: 'Advanced AI-powered bots for your business',
            type: 'SERVICE',
            category: 'SOFTWARE'
          });

          // Create plan
          const paypalPlan = await this.createPlan({
            productId: product.id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            interval: plan.interval === 'monthly' ? 'MONTH' : 'YEAR',
            intervalCount: 1
          });

          // Update plan with PayPal IDs
          await prisma.plan.update({
            where: { id: plan.id },
            data: {
              paypalProductId: product.id,
              paypalPlanId: paypalPlan.id
            }
          });

          logger.info(`Synced plan ${plan.name} with PayPal`);
        }
      }
    } catch (error) {
      logger.error('Error syncing plans with PayPal:', error);
      throw error;
    }
  }

  // Get payment methods for a user
  async getPaymentMethods(userId: string): Promise<any[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { paypalCustomerId: true }
    });

    if (!user?.paypalCustomerId) {
      return [];
    }

    // PayPal doesn't provide a direct API to list payment methods
    // This would typically be handled through PayPal's vault API
    return [];
  }

  // Create payment method
  async createPaymentMethod(userId: string, returnUrl: string): Promise<{ setupUrl: string }> {
    // PayPal uses a different flow for saving payment methods
    // This would redirect to PayPal to save a payment method
    const setupUrl = `${this.baseUrl}/signin?returnUrl=${encodeURIComponent(returnUrl)}`;
    
    return { setupUrl };
  }
}

// Export singleton instance
export const paypalService = new PayPalService();