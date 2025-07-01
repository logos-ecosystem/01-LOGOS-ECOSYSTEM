import { Request, Response } from 'express';
import { paypalService } from '../../services/paypal.service';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { AuditLogService } from '../../services/auditLog.service';
import { notificationService } from '../../services/notification.service';

export class PayPalController {
  // Create subscription
  async createSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { planId, returnUrl, cancelUrl } = req.body;

      // Get plan details
      const plan = await prisma.plan.findUnique({
        where: { id: planId }
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      if (!plan.paypalPlanId) {
        return res.status(400).json({ error: 'Plan not available for PayPal payments' });
      }

      // Check if user already has an active subscription
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: { in: ['active', 'trialing'] }
        }
      });

      if (existingSubscription) {
        return res.status(400).json({ error: 'User already has an active subscription' });
      }

      // Create PayPal subscription
      const result = await paypalService.createSubscription({
        planId: plan.paypalPlanId,
        userId,
        customId: userId,
        returnUrl,
        cancelUrl
      });

      // Log the action
      await auditLogService.log({
        action: 'paypal_subscription_initiated',
        entity: 'subscription',
        entityId: result.subscriptionId,
        userId,
        metadata: { planId: plan.id }
      });

      res.json({
        subscriptionId: result.subscriptionId,
        approvalUrl: result.approvalUrl
      });
    } catch (error) {
      logger.error('Error creating PayPal subscription:', error);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  }

  // Create one-time payment
  async createPayment(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { amount, currency, description, items, invoiceId, returnUrl, cancelUrl } = req.body;

      // Validate amount
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      // Create PayPal payment
      const result = await paypalService.createPayment({
        amount,
        currency: currency || 'USD',
        description,
        items,
        invoiceId,
        returnUrl,
        cancelUrl
      });

      // Log the action
      await auditLogService.log({
        action: 'paypal_payment_initiated',
        entity: 'payment',
        entityId: result.paymentId,
        userId,
        metadata: { amount, currency, invoiceId }
      });

      res.json({
        paymentId: result.paymentId,
        approvalUrl: result.approvalUrl
      });
    } catch (error) {
      logger.error('Error creating PayPal payment:', error);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  }

  // Capture payment after approval
  async capturePayment(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      // Capture the payment
      const capture = await paypalService.capturePayment(orderId);

      // Create notification
      await notificationService.create({
        userId,
        type: 'success',
        category: 'payment',
        title: 'Payment Successful',
        message: `Your PayPal payment has been processed successfully.`,
        priority: 'medium'
      });

      // Log the action
      await auditLogService.log({
        action: 'paypal_payment_captured',
        entity: 'payment',
        entityId: capture.id,
        userId,
        metadata: { orderId, status: capture.status }
      });

      res.json({
        message: 'Payment captured successfully',
        capture
      });
    } catch (error) {
      logger.error('Error capturing PayPal payment:', error);
      res.status(500).json({ error: 'Failed to capture payment' });
    }
  }

  // Cancel subscription
  async cancelSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { subscriptionId } = req.params;
      const { reason } = req.body;

      // Get subscription details
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          paypalSubscriptionId: subscriptionId
        }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      // Cancel PayPal subscription
      await paypalService.cancelSubscription(subscriptionId, reason);

      // Update database
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'canceled',
          canceledAt: new Date()
        }
      });

      // Create notification
      await notificationService.create({
        userId,
        type: 'info',
        category: 'payment',
        title: 'Subscription Cancelled',
        message: 'Your PayPal subscription has been cancelled successfully.',
        priority: 'medium'
      });

      // Log the action
      await auditLogService.log({
        action: 'paypal_subscription_cancelled',
        entity: 'subscription',
        entityId: subscription.id,
        userId,
        metadata: { reason }
      });

      res.json({ message: 'Subscription cancelled successfully' });
    } catch (error) {
      logger.error('Error cancelling PayPal subscription:', error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  }

  // Suspend subscription
  async suspendSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { subscriptionId } = req.params;
      const { reason } = req.body;

      // Verify ownership
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          paypalSubscriptionId: subscriptionId
        }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      // Suspend PayPal subscription
      await paypalService.suspendSubscription(subscriptionId, reason);

      // Update database
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'past_due' }
      });

      res.json({ message: 'Subscription suspended successfully' });
    } catch (error) {
      logger.error('Error suspending PayPal subscription:', error);
      res.status(500).json({ error: 'Failed to suspend subscription' });
    }
  }

  // Reactivate subscription
  async reactivateSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { subscriptionId } = req.params;
      const { reason } = req.body;

      // Verify ownership
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          paypalSubscriptionId: subscriptionId
        }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      // Reactivate PayPal subscription
      await paypalService.reactivateSubscription(subscriptionId, reason);

      // Update database
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'active' }
      });

      // Create notification
      await notificationService.create({
        userId,
        type: 'success',
        category: 'payment',
        title: 'Subscription Reactivated',
        message: 'Your PayPal subscription has been reactivated successfully.',
        priority: 'medium'
      });

      res.json({ message: 'Subscription reactivated successfully' });
    } catch (error) {
      logger.error('Error reactivating PayPal subscription:', error);
      res.status(500).json({ error: 'Failed to reactivate subscription' });
    }
  }

  // Get subscription details
  async getSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { subscriptionId } = req.params;

      // Verify ownership
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          paypalSubscriptionId: subscriptionId
        },
        include: {
          plan: true
        }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      // Get PayPal subscription details
      const paypalSubscription = await paypalService.getSubscription(subscriptionId);

      res.json({
        subscription: {
          ...subscription,
          paypalDetails: paypalSubscription
        }
      });
    } catch (error) {
      logger.error('Error getting PayPal subscription:', error);
      res.status(500).json({ error: 'Failed to get subscription details' });
    }
  }

  // Process refund
  async refundPayment(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { captureId, amount, currency, reason } = req.body;

      if (!captureId) {
        return res.status(400).json({ error: 'Capture ID is required' });
      }

      // Process refund
      const refund = await paypalService.refundPayment(captureId, amount, currency, reason);

      // Create notification
      await notificationService.create({
        userId,
        type: 'info',
        category: 'payment',
        title: 'Refund Processed',
        message: `Your refund of ${currency || 'USD'} ${amount || 'full amount'} has been processed.`,
        priority: 'medium'
      });

      // Log the action
      await auditLogService.log({
        action: 'paypal_refund_processed',
        entity: 'payment',
        entityId: refund.id,
        userId,
        metadata: { captureId, amount, currency, reason }
      });

      res.json({
        message: 'Refund processed successfully',
        refund
      });
    } catch (error) {
      logger.error('Error processing PayPal refund:', error);
      res.status(500).json({ error: 'Failed to process refund' });
    }
  }

  // Update payment method preferences
  async updatePaymentPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { defaultPaymentMethod } = req.body;

      if (!['STRIPE', 'PAYPAL'].includes(defaultPaymentMethod)) {
        return res.status(400).json({ error: 'Invalid payment method' });
      }

      // Update user preferences
      await prisma.user.update({
        where: { id: userId },
        data: { defaultPaymentMethod }
      });

      // Log the action
      await auditLogService.log({
        action: 'payment_preferences_updated',
        entity: 'user',
        entityId: userId,
        userId,
        metadata: { defaultPaymentMethod }
      });

      res.json({ message: 'Payment preferences updated successfully' });
    } catch (error) {
      logger.error('Error updating payment preferences:', error);
      res.status(500).json({ error: 'Failed to update payment preferences' });
    }
  }

  // Get available payment methods
  async getPaymentMethods(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

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
      if (user?.stripeCustomerId) {
        methods.push({
          type: 'STRIPE',
          id: user.stripeCustomerId,
          isDefault: user.defaultPaymentMethod === 'STRIPE'
        });
      }

      // Check PayPal
      if (user?.paypalCustomerId) {
        methods.push({
          type: 'PAYPAL',
          id: user.paypalCustomerId,
          isDefault: user.defaultPaymentMethod === 'PAYPAL'
        });
      }

      res.json({ methods });
    } catch (error) {
      logger.error('Error getting payment methods:', error);
      res.status(500).json({ error: 'Failed to get payment methods' });
    }
  }

  // Handle webhook
  async handleWebhook(req: Request, res: Response) {
    try {
      const headers = req.headers;
      const body = req.body;

      // Handle the webhook
      const result = await paypalService.handleWebhook(headers, body);

      res.json(result);
    } catch (error) {
      logger.error('PayPal webhook error:', error);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  }

  // Sync plans with PayPal
  async syncPlans(req: Request, res: Response) {
    try {
      // Admin only
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await paypalService.syncPlans();

      res.json({ message: 'Plans synced with PayPal successfully' });
    } catch (error) {
      logger.error('Error syncing plans with PayPal:', error);
      res.status(500).json({ error: 'Failed to sync plans' });
    }
  }

  // Get PayPal SDK client token (for frontend integration)
  async getClientToken(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      // Generate client token for PayPal SDK
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const mode = process.env.PAYPAL_MODE || 'sandbox';

      if (!clientId) {
        return res.status(500).json({ error: 'PayPal not configured' });
      }

      res.json({
        clientId,
        mode,
        currency: 'USD'
      });
    } catch (error) {
      logger.error('Error getting PayPal client token:', error);
      res.status(500).json({ error: 'Failed to get client token' });
    }
  }
}

export const paypalController = new PayPalController();