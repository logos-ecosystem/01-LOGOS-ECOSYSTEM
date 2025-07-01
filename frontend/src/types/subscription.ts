export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: PlanFeature[];
  limits: PlanLimits;
  stripePriceId: string;
  isPopular?: boolean;
  badge?: string;
}

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  value?: string | number;
}

export interface PlanLimits {
  maxBots: number;
  maxApiCalls: number;
  maxStorageGB: number;
  maxTeamMembers: number;
  customIntegrations: boolean;
  prioritySupport: boolean;
  dedicatedAccount: boolean;
}

export type SubscriptionStatus = 
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  dueDate: Date;
  paidAt?: Date;
  invoicePdf?: string;
  hostedInvoiceUrl?: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
  quantity: number;
}

export interface UsageStats {
  currentPeriod: {
    apiCalls: number;
    storageGB: number;
    activeBots: number;
    teamMembers: number;
  };
  limits: PlanLimits;
  percentages: {
    apiCalls: number;
    storage: number;
    bots: number;
    teamMembers: number;
  };
}