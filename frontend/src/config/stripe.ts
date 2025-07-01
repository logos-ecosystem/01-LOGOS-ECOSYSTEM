import { loadStripe } from '@stripe/stripe-js';

// Stripe configuration
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Initialize Stripe
export const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

// Stripe Plans Configuration
export const STRIPE_PLANS = {
  free: {
    priceId: 'price_free',
    name: 'Free',
    price: 0,
    interval: 'monthly',
    features: [
      '1 Bot básico',
      '1,000 llamadas API/mes',
      '1GB almacenamiento',
      'Soporte por email',
      'Actualizaciones básicas'
    ],
    limits: {
      maxBots: 1,
      maxApiCalls: 1000,
      maxStorageGB: 1,
      maxTeamMembers: 1,
      customIntegrations: false,
      prioritySupport: false,
      dedicatedAccount: false
    }
  },
  starter: {
    priceId: 'price_1OxxxxxxxxxxxxxxxxAB', // Replace with actual Stripe price ID
    name: 'Starter',
    price: 29,
    interval: 'monthly',
    features: [
      '5 Bots personalizados',
      '10,000 llamadas API/mes',
      '10GB almacenamiento',
      'Integraciones básicas',
      'Soporte prioritario',
      'Analytics básico'
    ],
    limits: {
      maxBots: 5,
      maxApiCalls: 10000,
      maxStorageGB: 10,
      maxTeamMembers: 3,
      customIntegrations: true,
      prioritySupport: true,
      dedicatedAccount: false
    }
  },
  professional: {
    priceId: 'price_1OxxxxxxxxxxxxxxxxCD', // Replace with actual Stripe price ID
    name: 'Professional',
    price: 99,
    interval: 'monthly',
    features: [
      '20 Bots avanzados',
      '100,000 llamadas API/mes',
      '100GB almacenamiento',
      'Integraciones ilimitadas',
      'Soporte 24/7',
      'Analytics avanzado',
      'API personalizada',
      'Webhooks ilimitados'
    ],
    limits: {
      maxBots: 20,
      maxApiCalls: 100000,
      maxStorageGB: 100,
      maxTeamMembers: 10,
      customIntegrations: true,
      prioritySupport: true,
      dedicatedAccount: false
    }
  },
  enterprise: {
    priceId: 'price_1OxxxxxxxxxxxxxxxxEF', // Replace with actual Stripe price ID
    name: 'Enterprise',
    price: 299,
    interval: 'monthly',
    features: [
      'Bots ilimitados',
      'Llamadas API ilimitadas',
      '1TB almacenamiento',
      'Integraciones empresariales',
      'Soporte dedicado',
      'SLA garantizado',
      'Capacitación personalizada',
      'Desarrollo a medida',
      'Seguridad avanzada'
    ],
    limits: {
      maxBots: -1, // Unlimited
      maxApiCalls: -1, // Unlimited
      maxStorageGB: 1000,
      maxTeamMembers: -1, // Unlimited
      customIntegrations: true,
      prioritySupport: true,
      dedicatedAccount: true
    }
  }
};

// Stripe webhook events we want to handle
export const STRIPE_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'payment_method.attached',
  'payment_method.detached'
];

// Error messages
export const STRIPE_ERROR_MESSAGES = {
  INVALID_CARD: 'La tarjeta proporcionada es inválida',
  INSUFFICIENT_FUNDS: 'Fondos insuficientes',
  CARD_DECLINED: 'La tarjeta fue rechazada',
  EXPIRED_CARD: 'La tarjeta ha expirado',
  PROCESSING_ERROR: 'Error al procesar el pago',
  NETWORK_ERROR: 'Error de conexión. Por favor intenta nuevamente',
  AUTHENTICATION_REQUIRED: 'Se requiere autenticación adicional',
  DEFAULT: 'Ocurrió un error al procesar el pago'
};

// Helper function to get error message
export const getStripeErrorMessage = (error: any): string => {
  if (!error?.code) return STRIPE_ERROR_MESSAGES.DEFAULT;
  
  const errorMap: Record<string, string> = {
    'card_declined': STRIPE_ERROR_MESSAGES.CARD_DECLINED,
    'expired_card': STRIPE_ERROR_MESSAGES.EXPIRED_CARD,
    'insufficient_funds': STRIPE_ERROR_MESSAGES.INSUFFICIENT_FUNDS,
    'invalid_card': STRIPE_ERROR_MESSAGES.INVALID_CARD,
    'processing_error': STRIPE_ERROR_MESSAGES.PROCESSING_ERROR,
    'authentication_required': STRIPE_ERROR_MESSAGES.AUTHENTICATION_REQUIRED
  };
  
  return errorMap[error.code] || STRIPE_ERROR_MESSAGES.DEFAULT;
};