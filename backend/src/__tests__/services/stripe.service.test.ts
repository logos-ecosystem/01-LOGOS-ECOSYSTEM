import { StripeService } from '../../services/stripe.service';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

// Mock Stripe
jest.mock('stripe');

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    subscription: {
      update: jest.fn()
    }
  }))
}));

describe('StripeService', () => {
  let stripeService: StripeService;
  let mockStripe: any;
  let mockPrisma: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock Stripe instance
    mockStripe = {
      paymentIntents: {
        create: jest.fn()
      },
      paymentMethods: {
        attach: jest.fn()
      },
      customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn()
      },
      subscriptions: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn()
      },
      invoices: {
        list: jest.fn()
      },
      checkout: {
        sessions: {
          create: jest.fn()
        }
      },
      billingPortal: {
        sessions: {
          create: jest.fn()
        }
      },
      promotionCodes: {
        list: jest.fn()
      },
      coupons: {
        retrieve: jest.fn()
      },
      webhooks: {
        constructEvent: jest.fn()
      }
    };

    // Mock Stripe constructor
    (Stripe as unknown as jest.Mock).mockImplementation(() => mockStripe);

    // Create service instance
    stripeService = new StripeService();
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const mockPaymentIntent = { id: 'pi_test123', amount: 9900 };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.createPaymentIntent(99, 'usd', { userId: 'user123' });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 9900,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: { userId: 'user123' }
      });
      expect(result).toEqual(mockPaymentIntent);
    });

    it('should handle errors when creating payment intent', async () => {
      const error = new Error('Stripe error');
      mockStripe.paymentIntents.create.mockRejectedValue(error);

      await expect(stripeService.createPaymentIntent(99, 'usd')).rejects.toThrow('Stripe error');
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription successfully', async () => {
      const mockSubscription = { id: 'sub_test123', status: 'active' };
      mockStripe.paymentMethods.attach.mockResolvedValue({});
      mockStripe.customers.update.mockResolvedValue({});
      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await stripeService.createSubscription(
        'cus_test123',
        'price_test123',
        'pm_test123'
      );

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_test123', {
        customer: 'cus_test123'
      });
      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_test123', {
        invoice_settings: { default_payment_method: 'pm_test123' }
      });
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        items: [{ price: 'price_test123' }],
        expand: ['latest_invoice.payment_intent']
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should handle errors when creating subscription', async () => {
      const error = new Error('Payment method failed');
      mockStripe.paymentMethods.attach.mockRejectedValue(error);

      await expect(
        stripeService.createSubscription('cus_test123', 'price_test123', 'pm_test123')
      ).rejects.toThrow('Payment method failed');
    });
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const mockCustomer = { id: 'cus_test123', email: 'test@example.com' };
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await stripeService.createCustomer(
        'test@example.com',
        'Test User',
        { userId: 'user123' }
      );

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: { userId: 'user123' }
      });
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately when requested', async () => {
      const mockCanceledSub = { id: 'sub_test123', status: 'canceled' };
      mockStripe.subscriptions.cancel.mockResolvedValue(mockCanceledSub);

      const result = await stripeService.cancelSubscription('sub_test123', true);

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_test123');
      expect(result).toEqual(mockCanceledSub);
    });

    it('should cancel subscription at period end by default', async () => {
      const mockUpdatedSub = { id: 'sub_test123', cancel_at_period_end: true };
      mockStripe.subscriptions.update.mockResolvedValue(mockUpdatedSub);

      const result = await stripeService.cancelSubscription('sub_test123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: true
      });
      expect(result).toEqual(mockUpdatedSub);
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription price successfully', async () => {
      const mockCurrentSub = {
        id: 'sub_test123',
        items: { data: [{ id: 'si_test123' }] }
      };
      const mockUpdatedSub = { id: 'sub_test123', status: 'active' };
      
      mockStripe.subscriptions.retrieve.mockResolvedValue(mockCurrentSub);
      mockStripe.subscriptions.update.mockResolvedValue(mockUpdatedSub);

      const result = await stripeService.updateSubscription('sub_test123', 'price_new123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        items: [{
          id: 'si_test123',
          price: 'price_new123'
        }],
        proration_behavior: 'create_prorations'
      });
      expect(result).toEqual(mockUpdatedSub);
    });
  });

  describe('getInvoices', () => {
    it('should retrieve customer invoices', async () => {
      const mockInvoices = {
        data: [
          { id: 'inv_test1', amount_paid: 9900 },
          { id: 'inv_test2', amount_paid: 9900 }
        ]
      };
      mockStripe.invoices.list.mockResolvedValue(mockInvoices);

      const result = await stripeService.getInvoices('cus_test123', 5);

      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_test123',
        limit: 5
      });
      expect(result).toEqual(mockInvoices.data);
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session successfully', async () => {
      const mockSession = { id: 'cs_test123', url: 'https://checkout.stripe.com/test' };
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await stripeService.createCheckoutSession(
        'cus_test123',
        'price_test123',
        'https://example.com/success',
        'https://example.com/cancel',
        { userId: 'user123' }
      );

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        line_items: [{ price: 'price_test123', quantity: 1 }],
        mode: 'subscription',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: { userId: 'user123' }
      });
      expect(result).toEqual(mockSession);
    });
  });

  describe('validatePromoCode', () => {
    it('should validate promo code successfully', async () => {
      const mockPromoCode = {
        id: 'promo_test123',
        code: 'WELCOME20',
        coupon: { id: 'coupon_test123' }
      };
      const mockCoupon = {
        percent_off: 20,
        amount_off: null,
        currency: null,
        duration: 'once',
        duration_in_months: null
      };

      mockStripe.promotionCodes.list.mockResolvedValue({ data: [mockPromoCode] });
      mockStripe.coupons.retrieve.mockResolvedValue(mockCoupon);

      const result = await stripeService.validatePromoCode('WELCOME20');

      expect(result).toEqual({
        id: 'promo_test123',
        code: 'WELCOME20',
        discount: {
          percent_off: 20,
          amount_off: null,
          currency: null,
          duration: 'once',
          duration_in_months: null
        }
      });
    });

    it('should return null for invalid promo code', async () => {
      mockStripe.promotionCodes.list.mockResolvedValue({ data: [] });

      const result = await stripeService.validatePromoCode('INVALID');

      expect(result).toBeNull();
    });
  });

  describe('handleWebhook', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test123' } }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = await stripeService.handleWebhook('sig_test', 'payload');

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        'payload',
        'sig_test',
        process.env.STRIPE_WEBHOOK_SECRET
      );
      expect(result).toEqual({ received: true });
    });

    it('should handle customer.subscription.updated event', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        status: 'active',
        current_period_end: 1234567890,
        cancel_at_period_end: false
      };
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: { object: mockSubscription }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      // Mock prisma update
      const mockPrismaUpdate = jest.fn().mockResolvedValue({});
      const prisma = new PrismaClient();
      (prisma.subscription.update as jest.Mock) = mockPrismaUpdate;

      await stripeService.handleWebhook('sig_test', 'payload');

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_test123' },
        data: {
          status: 'active',
          currentPeriodEnd: new Date(1234567890000),
          cancelAtPeriodEnd: false
        }
      });
    });

    it('should handle webhook signature verification failure', async () => {
      const error = new Error('Invalid signature');
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw error;
      });

      await expect(stripeService.handleWebhook('invalid_sig', 'payload')).rejects.toThrow(
        'Invalid signature'
      );
    });
  });

  describe('createPortalSession', () => {
    it('should create billing portal session successfully', async () => {
      const mockSession = {
        id: 'bps_test123',
        url: 'https://billing.stripe.com/session/test'
      };
      mockStripe.billingPortal.sessions.create.mockResolvedValue(mockSession);

      const result = await stripeService.createPortalSession(
        'cus_test123',
        'https://example.com/account'
      );

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        return_url: 'https://example.com/account'
      });
      expect(result).toEqual(mockSession);
    });
  });
});