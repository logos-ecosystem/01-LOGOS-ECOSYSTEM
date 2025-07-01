import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CreditCard,
  AccountBalance,
  CheckCircle,
  Warning,
  Settings,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '@/services/api';
import { useNotification } from '@/contexts/NotificationContext';

// Stripe logos
const StripeLogo = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.72 7.44c0-.96-.48-1.68-1.56-1.68-1.08 0-1.8.72-1.8 1.68 0 1.08.84 1.68 1.92 1.68.54 0 .96-.12 1.26-.24v-.84c-.3.12-.66.18-1.02.18-.42 0-.78-.12-.84-.48h2.04v-.3zm-2.04-.48c0-.36.24-.6.6-.6s.54.24.54.6h-1.14zM11.16 6.96c-.36-.18-.9-.3-1.32-.3C8.7 6.66 8.1 7.32 8.1 8.4c0 .96.54 1.68 1.62 1.68.48 0 1.02-.12 1.38-.3l-.18-.72c-.24.12-.54.18-.84.18-.48 0-.78-.24-.78-.78 0-.6.36-.84.84-.84.3 0 .6.06.84.18l.18-.84zM6.48 9.96V7.02c0-.84-.42-1.38-1.38-1.38-.48 0-.96.12-1.26.42-.18-.3-.54-.42-1.02-.42-.42 0-.78.12-1.08.36V5.82H.9v4.14h.9V7.5c0-.6.36-.84.72-.84.42 0 .6.24.6.84v2.46h.9V7.5c0-.6.36-.84.78-.84.42 0 .66.24.66.84v2.46h.9zM21.12 5.82h-1.5v-.84h-.9v.84h-.84v.78h.84v1.92c0 .9.36 1.44 1.38 1.44.36 0 .78-.12 1.02-.24l-.24-.78c-.18.06-.42.12-.54.12-.3 0-.42-.18-.42-.48V6.6h1.5v-.78h-.3zM26.34 5.64c-.36 0-.66.12-.84.36V5.82h-.9v4.14h.9v-2.4c0-.54.24-.84.66-.84.12 0 .24 0 .36.06l.24-.84c-.12-.06-.3-.06-.42-.06v-.24zM30.12 8.4c0-1.14-.72-1.74-1.68-1.74-.42 0-.84.18-1.08.48V5.82h-.9v4.14h.9V9.6c.24.24.6.42 1.08.42.96 0 1.68-.6 1.68-1.62zm-.96 0c0 .6-.36.96-.84.96-.3 0-.54-.12-.72-.3V7.74c.18-.24.48-.36.72-.36.48 0 .84.36.84 1.02zM24.36 10.02c.42 0 .72-.3.72-.72s-.3-.72-.72-.72-.72.3-.72.72.3.72.72.72zM34.92 7.44c0-.96-.48-1.68-1.56-1.68-1.08 0-1.8.72-1.8 1.68 0 1.08.84 1.68 1.92 1.68.54 0 .96-.12 1.26-.24v-.84c-.3.12-.66.18-1.02.18-.42 0-.78-.12-.84-.48h2.04v-.3zm-2.04-.48c0-.36.24-.6.6-.6s.54.24.54.6h-1.14z" fill="#635BFF"/>
  </svg>
);

const PayPalLogo = () => (
  <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M46.21 6.75h-6.21c-.42 0-.81.34-.9.75l-2.61 16.5c-.06.31.21.6.51.6h2.97c.42 0 .81-.34.9-.75l.69-4.38c.09-.41.48-.75.9-.75h2.07c4.32 0 6.81-2.1 7.47-6.24.3-1.83-.03-3.27-.84-4.26-.9-1.11-2.49-1.68-4.59-1.68l-.36.21zm.75 6.15c-.36 2.25-2.16 2.25-3.9 2.25h-.99l.69-4.38c.03-.24.24-.42.48-.42h.45c1.17 0 2.28 0 2.85.66.33.39.42.96.42 1.89zM23.19 6.75h-6.21c-.42 0-.81.34-.9.75l-2.61 16.5c-.06.31.21.6.51.6h3.18c.3 0 .57-.24.63-.51l.75-4.65c.09-.41.48-.75.9-.75h2.07c4.32 0 6.81-2.1 7.47-6.24.3-1.83-.03-3.27-.84-4.26-.93-1.11-2.52-1.68-4.62-1.68l-.33.21zm.75 6.15c-.36 2.25-2.16 2.25-3.9 2.25h-.99l.69-4.38c.03-.24.24-.42.48-.42h.45c1.17 0 2.28 0 2.85.66.33.39.42.96.42 1.89zM35.1 12.75h-3.18c-.24 0-.45.18-.48.42l-.12.78-.18-.27c-.57-.84-1.86-1.11-3.15-1.11-2.94 0-5.46 2.22-5.94 5.34-.24 1.56.12 3.06.93 4.08.75.93 1.83 1.32 3.12 1.32 2.19 0 3.42-1.41 3.42-1.41l-.12.75c-.06.3.21.6.51.6h2.85c.42 0 .81-.34.9-.75l1.68-10.65c.03-.33-.21-.63-.54-.63v.03zm-3.45 5.16c-.24 1.47-1.38 2.46-2.82 2.46-.72 0-1.32-.24-1.68-.66-.36-.42-.48-1.02-.39-1.65.21-1.44 1.38-2.46 2.79-2.46.72 0 1.29.24 1.65.66.39.45.51 1.05.45 1.65z" fill="#003087"/>
    <path d="M53.94 12.75h-3.21c-.27 0-.51.15-.63.39l-3.66 5.37-1.56-5.19c-.09-.33-.39-.57-.75-.57h-3.15c-.39 0-.66.36-.57.72l2.91 8.55-2.73 3.87c-.21.3 0 .72.36.72h3.18c.27 0 .51-.15.63-.36l8.82-12.72c.24-.33 0-.78-.36-.78h-.28z" fill="#009CDE"/>
  </svg>
);

interface PaymentMethodSelectorProps {
  selectedMethod?: 'STRIPE' | 'PAYPAL';
  onMethodChange?: (method: 'STRIPE' | 'PAYPAL') => void;
  onPaymentComplete?: (result: any) => void;
  amount?: number;
  currency?: string;
  description?: string;
  showSavedMethods?: boolean;
  allowMethodChange?: boolean;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PaymentMethodSelector({
  selectedMethod: initialMethod = 'STRIPE',
  onMethodChange,
  onPaymentComplete,
  amount,
  currency = 'USD',
  description,
  showSavedMethods = true,
  allowMethodChange = true
}: PaymentMethodSelectorProps) {
  const { showNotification } = useNotification();
  const [selectedMethod, setSelectedMethod] = useState(initialMethod);
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paypalConfig, setPaypalConfig] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>('');

  useEffect(() => {
    fetchPaymentMethods();
    fetchPayPalConfig();
  }, []);

  const fetchPaymentMethods = async () => {
    if (!showSavedMethods) return;

    try {
      const response = await api.get('/paypal/payment-methods');
      setPaymentMethods(response.data.methods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const fetchPayPalConfig = async () => {
    try {
      const response = await api.get('/paypal/client-config');
      setPaypalConfig(response.data);
    } catch (error) {
      console.error('Error fetching PayPal config:', error);
    }
  };

  const handleMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const method = event.target.value as 'STRIPE' | 'PAYPAL';
    setSelectedMethod(method);
    onMethodChange?.(method);
  };

  const createPaymentIntent = async () => {
    if (!amount) return;

    try {
      setLoading(true);
      const response = await api.post('/payments/create', {
        amount,
        currency,
        description,
        paymentMethod: selectedMethod
      });

      if (response.data.paymentMethod === 'STRIPE') {
        setClientSecret(response.data.data.clientSecret);
      }

      return response.data;
    } catch (error) {
      console.error('Error creating payment:', error);
      showNotification('Failed to initialize payment', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const StripePaymentForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
      event.preventDefault();

      if (!stripe || !elements || !clientSecret) {
        return;
      }

      setProcessing(true);

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (result.error) {
        showNotification(result.error.message || 'Payment failed', 'error');
      } else {
        showNotification('Payment successful!', 'success');
        onPaymentComplete?.(result.paymentIntent);
      }

      setProcessing(false);
    };

    return (
      <form onSubmit={handleSubmit}>
        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, mb: 2 }}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </Box>
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={!stripe || processing}
          startIcon={processing ? <CircularProgress size={20} /> : <CreditCard />}
        >
          {processing ? 'Processing...' : `Pay ${currency} ${amount?.toFixed(2)}`}
        </Button>
      </form>
    );
  };

  return (
    <Box>
      {/* Payment Method Selection */}
      {allowMethodChange && (
        <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Select Payment Method
          </Typography>
          <RadioGroup value={selectedMethod} onChange={handleMethodChange}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedMethod === 'STRIPE' ? '2px solid' : '1px solid',
                    borderColor: selectedMethod === 'STRIPE' ? 'primary.main' : 'divider'
                  }}
                  onClick={() => handleMethodChange({ target: { value: 'STRIPE' } } as any)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Radio value="STRIPE" />
                        <Box sx={{ ml: 2 }}>
                          <StripeLogo />
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Credit/Debit Card
                          </Typography>
                        </Box>
                      </Box>
                      {selectedMethod === 'STRIPE' && (
                        <CheckCircle color="primary" />
                      )}
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Chip label="Secure" size="small" icon={<CheckCircle />} />
                      <Chip label="Instant" size="small" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedMethod === 'PAYPAL' ? '2px solid' : '1px solid',
                    borderColor: selectedMethod === 'PAYPAL' ? 'primary.main' : 'divider'
                  }}
                  onClick={() => handleMethodChange({ target: { value: 'PAYPAL' } } as any)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Radio value="PAYPAL" />
                        <Box sx={{ ml: 2 }}>
                          <PayPalLogo />
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            PayPal Account
                          </Typography>
                        </Box>
                      </Box>
                      {selectedMethod === 'PAYPAL' && (
                        <CheckCircle color="primary" />
                      )}
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Chip label="Buyer Protection" size="small" icon={<CheckCircle />} />
                      <Chip label="No Card Required" size="small" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </RadioGroup>
        </FormControl>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Saved Payment Methods */}
      {showSavedMethods && paymentMethods.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Saved Payment Methods
          </Typography>
          <Grid container spacing={2}>
            {paymentMethods.map((method) => (
              <Grid item xs={12} key={method.id}>
                <Card variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {method.type === 'STRIPE' ? <CreditCard /> : <AccountBalance />}
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="body1">
                          {method.type === 'STRIPE' ? 'Card ending in ****' : 'PayPal Account'}
                        </Typography>
                        {method.isDefault && (
                          <Chip label="Default" size="small" color="primary" />
                        )}
                      </Box>
                    </Box>
                    <Tooltip title="Manage payment method">
                      <IconButton size="small">
                        <Settings />
                      </IconButton>
                    </Tooltip>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Payment Form */}
      {amount && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Payment Details
          </Typography>
          
          {selectedMethod === 'STRIPE' && clientSecret && (
            <Elements stripe={stripePromise}>
              <StripePaymentForm />
            </Elements>
          )}

          {selectedMethod === 'PAYPAL' && paypalConfig && (
            <PayPalScriptProvider options={{
              "client-id": paypalConfig.clientId,
              currency: paypalConfig.currency,
              intent: "capture"
            }}>
              <PayPalButtons
                createOrder={async (data, actions) => {
                  const payment = await createPaymentIntent();
                  if (payment?.paymentMethod === 'PAYPAL') {
                    return payment.transactionId;
                  }
                  throw new Error('Failed to create PayPal order');
                }}
                onApprove={async (data, actions) => {
                  try {
                    const response = await api.post('/paypal/payments/capture', {
                      orderId: data.orderID
                    });
                    showNotification('Payment successful!', 'success');
                    onPaymentComplete?.(response.data);
                  } catch (error) {
                    showNotification('Payment failed', 'error');
                  }
                }}
                onError={(err) => {
                  console.error('PayPal error:', err);
                  showNotification('Payment failed', 'error');
                }}
                style={{ layout: "vertical" }}
              />
            </PayPalScriptProvider>
          )}
        </Box>
      )}

      {/* Security Notice */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          Your payment information is encrypted and secure. We never store your card details.
        </Typography>
      </Alert>
    </Box>
  );
}