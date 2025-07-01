import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

const prisma = new PrismaClient();

export class SubscriptionController {
  // Get all available plans
  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await stripe.prices.list({
        active: true,
        expand: ['data.product']
      });

      const formattedPlans = plans.data.map(price => ({
        id: price.id,
        name: (price.product as Stripe.Product).name,
        description: (price.product as Stripe.Product).description,
        price: price.unit_amount ? price.unit_amount / 100 : 0,
        currency: price.currency,
        interval: price.recurring?.interval,
        features: (price.product as Stripe.Product).metadata.features?.split(',') || [],
        stripePriceId: price.id,
        isPopular: (price.product as Stripe.Product).metadata.popular === 'true'
      }));

      res.json(formattedPlans);
    } catch (error) {
      logger.error('Error fetching plans:', error);
      next(error);
    }
  }

  // Get current user subscription
  async getCurrentSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: {
            in: ['active', 'trialing']
          }
        },
        include: {
          plan: true
        }
      });

      if (!subscription) {
        return res.json(null);
      }

      // Get additional info from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      res.json({
        ...subscription,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
      });
    } catch (error) {
      logger.error('Error fetching subscription:', error);
      next(error);
    }
  }

  // Create a new subscription
  async createSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { planId, paymentMethodId } = req.body;
      const userId = req.user.id;

      // Get or create Stripe customer
      let customer = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!customer.stripeCustomerId) {
        const stripeCustomer = await stripe.customers.create({
          email: customer.email,
          metadata: { userId }
        });

        customer = await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: stripeCustomer.id }
        });
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.stripeCustomerId
      });

      // Set as default payment method
      await stripe.customers.update(customer.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.stripeCustomerId,
        items: [{ price: planId }],
        expand: ['latest_invoice.payment_intent']
      });

      // Save to database
      const dbSubscription = await prisma.subscription.create({
        data: {
          userId,
          planId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: customer.stripeCustomerId,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        }
      });

      res.json(dbSubscription);
    } catch (error) {
      logger.error('Error creating subscription:', error);
      next(error);
    }
  }

  // Update subscription (upgrade/downgrade)
  async updateSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { subscriptionId } = req.params;
      const { planId } = req.body;

      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      // Update Stripe subscription
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      const updatedSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          items: [{
            id: stripeSubscription.items.data[0].id,
            price: planId
          }],
          proration_behavior: 'create_prorations'
        }
      );

      // Update database
      const dbSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          planId,
          status: updatedSubscription.status
        }
      });

      res.json(dbSubscription);
    } catch (error) {
      logger.error('Error updating subscription:', error);
      next(error);
    }
  }

  // Cancel subscription
  async cancelSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { subscriptionId } = req.params;
      const { immediate } = req.body;

      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      // Cancel in Stripe
      const canceledSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: !immediate
        }
      );

      if (immediate) {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      }

      // Update database
      const dbSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: immediate ? 'canceled' : subscription.status,
          canceledAt: immediate ? new Date() : null
        }
      });

      res.json(dbSubscription);
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      next(error);
    }
  }

  // Get payment methods
  async getPaymentMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user.stripeCustomerId) {
        return res.json([]);
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card'
      });

      const formattedMethods = paymentMethods.data.map(method => ({
        id: method.id,
        type: method.type,
        last4: method.card?.last4,
        brand: method.card?.brand,
        expiryMonth: method.card?.exp_month,
        expiryYear: method.card?.exp_year,
        isDefault: method.id === user.defaultPaymentMethodId
      }));

      res.json(formattedMethods);
    } catch (error) {
      logger.error('Error fetching payment methods:', error);
      next(error);
    }
  }

  // Create setup intent for adding payment method
  async createSetupIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user.stripeCustomerId) {
        const stripeCustomer = await stripe.customers.create({
          email: user.email,
          metadata: { userId }
        });

        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: stripeCustomer.id }
        });

        user.stripeCustomerId = stripeCustomer.id;
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: user.stripeCustomerId,
        payment_method_types: ['card']
      });

      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error) {
      logger.error('Error creating setup intent:', error);
      next(error);
    }
  }

  // Create checkout session
  async createCheckoutSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { planId } = req.body;
      const userId = req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      const session = await stripe.checkout.sessions.create({
        customer: user.stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{
          price: planId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/dashboard/subscription?success=true`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard/subscription?canceled=true`,
        metadata: { userId }
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      logger.error('Error creating checkout session:', error);
      next(error);
    }
  }

  // Get usage statistics
  async getUsageStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      
      // Get current usage from database
      const usage = await prisma.usageStats.findFirst({
        where: {
          userId,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        }
      });

      // Get user's plan limits
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active'
        },
        include: {
          plan: true
        }
      });

      const limits = subscription?.plan?.limits || {
        maxApiCalls: 1000,
        maxStorageGB: 1,
        maxBots: 1,
        maxTeamMembers: 1
      };

      const currentUsage = {
        apiCalls: usage?.apiCalls || 0,
        storageGB: usage?.storageGB || 0,
        activeBots: usage?.activeBots || 0,
        teamMembers: usage?.teamMembers || 1
      };

      const percentages = {
        apiCalls: (currentUsage.apiCalls / limits.maxApiCalls) * 100,
        storage: (currentUsage.storageGB / limits.maxStorageGB) * 100,
        bots: (currentUsage.activeBots / limits.maxBots) * 100,
        teamMembers: (currentUsage.teamMembers / limits.maxTeamMembers) * 100
      };

      res.json({
        currentPeriod: currentUsage,
        limits,
        percentages
      });
    } catch (error) {
      logger.error('Error fetching usage stats:', error);
      next(error);
    }
  }

  // Get invoices
  async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { limit = 10, offset = 0 } = req.query;
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user.stripeCustomerId) {
        return res.json({ invoices: [], total: 0 });
      }

      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: Number(limit),
        starting_after: offset ? String(offset) : undefined
      });

      const formattedInvoices = invoices.data.map(invoice => ({
        id: invoice.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: new Date(invoice.due_date * 1000),
        paidAt: invoice.paid_at ? new Date(invoice.paid_at * 1000) : null,
        invoicePdf: invoice.invoice_pdf,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        items: invoice.lines.data.map(item => ({
          id: item.id,
          description: item.description,
          amount: item.amount / 100,
          quantity: item.quantity
        }))
      }));

      res.json({
        invoices: formattedInvoices,
        total: invoices.data.length
      });
    } catch (error) {
      logger.error('Error fetching invoices:', error);
      next(error);
    }
  }
}

export default new SubscriptionController();