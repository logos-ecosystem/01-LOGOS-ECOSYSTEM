import api from '../api';
import {
  Subscription,
  SubscriptionPlan,
  PaymentMethod,
  Invoice,
  UsageStats
} from '@/types/subscription';

export const subscriptionAPI = {
  // Plans
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const { data } = await api.get('/subscriptions/plans');
    return data;
  },

  getPlanDetails: async (planId: string): Promise<SubscriptionPlan> => {
    const { data } = await api.get(`/subscriptions/plans/${planId}`);
    return data;
  },

  // Current Subscription
  getCurrentSubscription: async (): Promise<Subscription | null> => {
    const { data } = await api.get('/subscriptions/current');
    return data;
  },

  createSubscription: async (planId: string, paymentMethodId: string): Promise<Subscription> => {
    const { data } = await api.post('/subscriptions', {
      planId,
      paymentMethodId
    });
    return data;
  },

  updateSubscription: async (subscriptionId: string, planId: string): Promise<Subscription> => {
    const { data } = await api.put(`/subscriptions/${subscriptionId}`, {
      planId
    });
    return data;
  },

  cancelSubscription: async (subscriptionId: string, immediate = false): Promise<Subscription> => {
    const { data } = await api.post(`/subscriptions/${subscriptionId}/cancel`, {
      immediate
    });
    return data;
  },

  reactivateSubscription: async (subscriptionId: string): Promise<Subscription> => {
    const { data } = await api.post(`/subscriptions/${subscriptionId}/reactivate`);
    return data;
  },

  // Payment Methods
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const { data } = await api.get('/payment-methods');
    return data;
  },

  addPaymentMethod: async (paymentMethodId: string): Promise<PaymentMethod> => {
    const { data } = await api.post('/payment-methods', {
      paymentMethodId
    });
    return data;
  },

  setDefaultPaymentMethod: async (paymentMethodId: string): Promise<PaymentMethod> => {
    const { data } = await api.put(`/payment-methods/${paymentMethodId}/default`);
    return data;
  },

  removePaymentMethod: async (paymentMethodId: string): Promise<void> => {
    await api.delete(`/payment-methods/${paymentMethodId}`);
  },

  // Invoices
  getInvoices: async (limit = 10, offset = 0): Promise<{
    invoices: Invoice[];
    total: number;
  }> => {
    const { data } = await api.get('/invoices', {
      params: { limit, offset }
    });
    return data;
  },

  getInvoiceDetails: async (invoiceId: string): Promise<Invoice> => {
    const { data } = await api.get(`/invoices/${invoiceId}`);
    return data;
  },

  downloadInvoice: async (invoiceId: string): Promise<Blob> => {
    const { data } = await api.get(`/invoices/${invoiceId}/download`, {
      responseType: 'blob'
    });
    return data;
  },

  // Usage & Stats
  getUsageStats: async (): Promise<UsageStats> => {
    const { data } = await api.get('/subscriptions/usage');
    return data;
  },

  getUsageHistory: async (startDate: Date, endDate: Date): Promise<any> => {
    const { data } = await api.get('/subscriptions/usage/history', {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
    return data;
  },

  // Stripe Setup
  createSetupIntent: async (): Promise<{ clientSecret: string }> => {
    const { data } = await api.post('/stripe/setup-intent');
    return data;
  },

  createPaymentIntent: async (amount: number): Promise<{ clientSecret: string }> => {
    const { data } = await api.post('/stripe/payment-intent', { amount });
    return data;
  },

  createCheckoutSession: async (planId: string): Promise<{ sessionId: string; url: string }> => {
    const { data } = await api.post('/stripe/checkout-session', { planId });
    return data;
  },

  createCustomerPortalSession: async (): Promise<{ url: string }> => {
    const { data } = await api.post('/stripe/customer-portal');
    return data;
  }
};