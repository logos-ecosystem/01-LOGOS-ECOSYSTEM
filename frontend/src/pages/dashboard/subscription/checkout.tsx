import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  Stack
} from '@mui/material';
import {
  CheckCircle,
  CreditCard,
  Security,
  Info,
  Warning,
  Error as ErrorIcon,
  ArrowBack,
  ArrowForward,
  Lock,
  Verified,
  AccountBalance,
  Payment,
  LocalOffer,
  Timer,
  AutoAwesome,
  Star,
  TrendingUp,
  Savings,
  CardGiftcard,
  Receipt,
  AccountBalanceWallet,
  AttachMoney,
  Euro,
  CurrencyBitcoin,
  QrCode2,
  Smartphone,
  Email,
  Phone,
  Home,
  Business,
  Flag,
  Language,
  Schedule,
  EventAvailable,
  CancelScheduleSend,
  Loop,
  Autorenew,
  NotificationsActive,
  Shield,
  VerifiedUser,
  GppGood,
  PrivacyTip,
  Policy,
  Gavel,
  HelpOutline,
  ContactSupport,
  LiveHelp,
  SupportAgent,
  Forum,
  QuestionAnswer,
  RateReview,
  ThumbUp,
  EmojiEvents,
  WorkspacePremium,
  Discount,
  Loyalty,
  Redeem,
  ShoppingCart,
  RemoveShoppingCart,
  AddShoppingCart,
  ShoppingCartCheckout,
  PriceCheck,
  PriceChange,
  MonetizationOn,
  RequestQuote,
  PointOfSale,
  Sell,
  Store,
  Storefront,
  Inventory,
  Inventory2,
  Category,
  Dashboard,
  Analytics,
  Insights,
  QueryStats,
  DataUsage,
  Storage,
  Cloud,
  CloudQueue,
  CloudDone,
  CloudSync,
  CloudUpload,
  CloudDownload,
  CloudOff,
  Computer,
  DesktopWindows,
  LaptopWindows,
  TabletAndroid,
  PhoneAndroid,
  Watch,
  SpeakerGroup,
  Headset,
  Keyboard,
  Mouse,
  Router,
  DeviceHub,
  Cast,
  CastConnected,
  ScreenShare,
  StopScreenShare,
  Airplay,
  Speaker,
  SurroundSound,
  VolumeUp,
  VolumeDown,
  VolumeMute,
  VolumeOff,
  MicNone,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  PhotoCamera,
  PhotoCameraFront,
  PhotoCameraBack,
  CameraAlt,
  CameraRoll,
  Panorama,
  PanoramaFishEye,
  PanoramaHorizontal,
  PanoramaVertical,
  PanoramaWideAngle,
  ThreeSixty,
  AddAPhoto,
  Image,
  Collections,
  PhotoLibrary,
  PhotoAlbum,
  Assistant,
  AssistantPhoto,
  Palette,
  ColorLens,
  Brush,
  FormatPaint,
  Create,
  Edit,
  Draw,
  Gesture,
  Title,
  TextFields,
  FormatSize,
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatStrikethrough,
  FormatQuote,
  FormatListBulleted,
  FormatListNumbered,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  FormatIndentDecrease,
  FormatIndentIncrease,
  FormatClear,
  TextFormat,
  WrapText,
  Notes,
  StickyNote2,
  Comment,
  ModeComment,
  CommentsDisabled,
  Forum as ForumIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Sms,
  Message,
  Chat,
  ChatBubble,
  ChatBubbleOutline,
  Feedback,
  ContactMail,
  Contacts,
  DialerSip,
  ContactPhone,
  VpnKey,
  Password,
  Pin,
  Pattern,
  Fingerprint,
  Face,
  TagFaces,
  Mood,
  MoodBad,
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentSatisfiedAlt,
  SentimentVeryDissatisfied,
  SentimentVerySatisfied,
  ThumbUpOffAlt,
  ThumbDownOffAlt,
  ThumbUpAlt,
  ThumbDownAlt,
  ThumbsUpDown
} from '@mui/icons-material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionAPI } from '@/services/api/subscription';
import { STRIPE_PLANS, stripePromise } from '@/config/stripe';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import withAuth from '@/components/Auth/withAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import axios from 'axios';

// Interfaces
interface BillingDetails {
  name: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  taxId?: string;
  companyName?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'crypto' | 'paypal';
  label: string;
  icon: React.ReactNode;
  description: string;
  fee?: number;
  processingTime?: string;
}

interface PromoCode {
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  validUntil?: Date;
  minPurchase?: number;
  firstTimeOnly?: boolean;
}

interface PlanDetails {
  planId: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  recommended?: boolean;
  savings?: number;
}

// Componente principal del checkout
const CheckoutForm: React.FC<{ planId: string }> = ({ planId }) => {
  const theme = useTheme();
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  
  // Estados
  const [activeStep, setActiveStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>({
    id: 'card',
    type: 'card',
    label: 'Tarjeta de Crédito/Débito',
    icon: <CreditCard />,
    description: 'Pago instantáneo y seguro'
  });
  
  const [billingDetails, setBillingDetails] = useState<BillingDetails>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });
  
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState(true);
  const [receiveUpdates, setReceiveUpdates] = useState(true);
  
  // Métodos de pago disponibles
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'card',
      type: 'card',
      label: 'Tarjeta de Crédito/Débito',
      icon: <CreditCard />,
      description: 'Visa, Mastercard, American Express',
      processingTime: 'Instantáneo'
    },
    {
      id: 'bank',
      type: 'bank',
      label: 'Transferencia Bancaria',
      icon: <AccountBalance />,
      description: 'ACH, SEPA, Wire Transfer',
      processingTime: '1-3 días hábiles',
      fee: 0
    },
    {
      id: 'paypal',
      type: 'paypal',
      label: 'PayPal',
      icon: <AccountBalanceWallet />,
      description: 'Paga con tu cuenta PayPal',
      processingTime: 'Instantáneo'
    },
    {
      id: 'crypto',
      type: 'crypto',
      label: 'Criptomonedas',
      icon: <CurrencyBitcoin />,
      description: 'Bitcoin, Ethereum, USDT',
      processingTime: '10-30 minutos',
      fee: -5 // 5% descuento
    }
  ];
  
  // Obtener detalles del plan
  const getPlanDetails = (): PlanDetails => {
    const plan = Object.values(STRIPE_PLANS).find(p => p.priceId === planId);
    if (!plan) {
      return {
        planId: '',
        name: 'Plan no encontrado',
        price: 0,
        interval: 'monthly',
        features: []
      };
    }
    
    const basePrice = plan.price;
    const yearlyPrice = basePrice * 12 * 0.8; // 20% descuento anual
    
    return {
      planId: plan.priceId,
      name: plan.name,
      price: billingInterval === 'yearly' ? yearlyPrice : basePrice,
      interval: billingInterval,
      features: plan.features,
      recommended: plan.name === 'Professional',
      savings: billingInterval === 'yearly' ? basePrice * 12 * 0.2 : 0
    };
  };
  
  const planDetails = getPlanDetails();
  
  // Calcular totales
  const calculateSubtotal = () => {
    return planDetails.price;
  };
  
  const calculateDiscount = () => {
    let discount = 0;
    const subtotal = calculateSubtotal();
    
    // Descuento por promo code
    if (appliedPromo) {
      if (appliedPromo.type === 'percentage') {
        discount += subtotal * (appliedPromo.discount / 100);
      } else {
        discount += appliedPromo.discount;
      }
    }
    
    // Descuento por método de pago
    if (paymentMethod.fee && paymentMethod.fee < 0) {
      discount += subtotal * (Math.abs(paymentMethod.fee) / 100);
    }
    
    return discount;
  };
  
  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const taxableAmount = subtotal - discount;
    
    // Calcular impuesto basado en la ubicación
    let taxRate = 0;
    if (billingDetails.address.country === 'US') {
      // Ejemplo: diferentes tasas por estado
      const stateTaxRates: Record<string, number> = {
        'CA': 0.0725,
        'NY': 0.08,
        'TX': 0.0625,
        'FL': 0.06,
        // ... más estados
      };
      taxRate = stateTaxRates[billingDetails.address.state] || 0.05;
    } else {
      // IVA para otros países
      taxRate = 0.21; // 21% IVA estándar
    }
    
    return taxableAmount * taxRate;
  };
  
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const tax = calculateTax();
    const fee = paymentMethod.fee && paymentMethod.fee > 0 
      ? subtotal * (paymentMethod.fee / 100) 
      : 0;
    
    return subtotal - discount + tax + fee;
  };
  
  // Validar código promocional
  const validatePromoCode = async () => {
    try {
      setError(null);
      
      // Simular validación de código promocional
      const validPromoCodes: Record<string, PromoCode> = {
        'WELCOME20': {
          code: 'WELCOME20',
          discount: 20,
          type: 'percentage',
          firstTimeOnly: true
        },
        'SAVE50': {
          code: 'SAVE50',
          discount: 50,
          type: 'fixed',
          minPurchase: 100
        },
        'BLACKFRIDAY': {
          code: 'BLACKFRIDAY',
          discount: 30,
          type: 'percentage',
          validUntil: new Date('2024-11-30')
        }
      };
      
      const promo = validPromoCodes[promoCode.toUpperCase()];
      
      if (!promo) {
        setError('Código promocional inválido');
        return;
      }
      
      // Validar restricciones
      if (promo.validUntil && new Date() > promo.validUntil) {
        setError('Este código promocional ha expirado');
        return;
      }
      
      if (promo.minPurchase && calculateSubtotal() < promo.minPurchase) {
        setError(`Compra mínima de $${promo.minPurchase} requerida`);
        return;
      }
      
      if (promo.firstTimeOnly && user?.hasActiveSubscription) {
        setError('Este código es solo para nuevos usuarios');
        return;
      }
      
      setAppliedPromo(promo);
      setPromoCode('');
    } catch (err) {
      setError('Error al validar el código promocional');
    }
  };
  
  // Manejar el pago
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setProcessing(true);
    setError(null);
    
    try {
      // Validar términos y condiciones
      if (!acceptTerms) {
        throw new Error('Debes aceptar los términos y condiciones');
      }
      
      // Crear payment intent en el backend
      const { data: { clientSecret } } = await subscriptionAPI.createPaymentIntent({
        planId: planDetails.planId,
        interval: billingInterval,
        promoCode: appliedPromo?.code,
        paymentMethodType: paymentMethod.type
      });
      
      let paymentResult;
      
      if (paymentMethod.type === 'card') {
        // Procesar pago con tarjeta
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Error al cargar el elemento de tarjeta');
        }
        
        paymentResult = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: billingDetails.name,
              email: billingDetails.email,
              phone: billingDetails.phone,
              address: {
                line1: billingDetails.address.line1,
                line2: billingDetails.address.line2,
                city: billingDetails.address.city,
                state: billingDetails.address.state,
                postal_code: billingDetails.address.postal_code,
                country: billingDetails.address.country
              }
            }
          },
          setup_future_usage: savePaymentMethod ? 'off_session' : undefined
        });
      } else if (paymentMethod.type === 'bank') {
        // Procesar transferencia bancaria
        paymentResult = await stripe.confirmAchPayment(clientSecret, {
          payment_method: {
            billing_details: billingDetails
          }
        });
      } else if (paymentMethod.type === 'paypal') {
        // Redirigir a PayPal
        window.location.href = `/api/payments/paypal/create?planId=${planDetails.planId}`;
        return;
      } else if (paymentMethod.type === 'crypto') {
        // Mostrar dirección de wallet para pago
        setSuccess(true);
        return;
      }
      
      if (paymentResult?.error) {
        throw new Error(paymentResult.error.message);
      }
      
      // Crear suscripción en el backend
      await subscriptionAPI.createSubscription({
        planId: planDetails.planId,
        interval: billingInterval,
        paymentMethodId: paymentResult?.paymentIntent?.payment_method,
        promoCode: appliedPromo?.code,
        autoRenew,
        billingDetails
      });
      
      setSuccess(true);
      
      // Redirigir al dashboard después de 3 segundos
      setTimeout(() => {
        router.push('/dashboard?welcome=true');
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };
  
  // Pasos del checkout
  const steps = [
    'Selección de Plan',
    'Información de Facturación',
    'Método de Pago',
    'Revisión y Confirmación'
  ];
  
  const handleNext = () => {
    if (activeStep === 0 && !planDetails.planId) {
      setError('Por favor selecciona un plan');
      return;
    }
    
    if (activeStep === 1) {
      // Validar información de facturación
      const requiredFields = ['name', 'email', 'phone'];
      const addressFields = ['line1', 'city', 'state', 'postal_code', 'country'];
      
      for (const field of requiredFields) {
        if (!billingDetails[field as keyof BillingDetails]) {
          setError(`El campo ${field} es requerido`);
          return;
        }
      }
      
      for (const field of addressFields) {
        if (!billingDetails.address[field as keyof typeof billingDetails.address]) {
          setError(`El campo de dirección ${field} es requerido`);
          return;
        }
      }
    }
    
    setError(null);
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  return (
    <Box>
      {success ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CheckCircle sx={{ fontSize: 80, color: theme.palette.success.main, mb: 3 }} />
          <Typography variant="h4" gutterBottom>
            ¡Pago Exitoso!
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Tu suscripción al plan {planDetails.name} ha sido activada correctamente.
          </Typography>
          {paymentMethod.type === 'crypto' && (
            <Alert severity="info" sx={{ mt: 3, maxWidth: 600, mx: 'auto' }}>
              <Typography variant="body2" gutterBottom>
                Por favor envía {calculateTotal().toFixed(2)} USD en Bitcoin a:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 1 }}>
                bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                Tu suscripción se activará automáticamente al confirmar el pago
              </Typography>
            </Alert>
          )}
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/dashboard')}
            sx={{ mt: 4 }}
          >
            Ir al Dashboard
          </Button>
        </Box>
      ) : (
        <>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            {/* Step 0: Selección de Plan */}
            {activeStep === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h5" gutterBottom>
                    Confirma tu Plan
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Has seleccionado el siguiente plan. Puedes cambiar entre facturación mensual o anual.
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={8}>
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Box>
                          <Typography variant="h4" gutterBottom>
                            {planDetails.name}
                          </Typography>
                          {planDetails.recommended && (
                            <Chip
                              label="Más Popular"
                              color="primary"
                              size="small"
                              icon={<Star />}
                              sx={{ mb: 2 }}
                            />
                          )}
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h3" color="primary">
                            ${billingInterval === 'yearly' 
                              ? (planDetails.price / 12).toFixed(2)
                              : planDetails.price.toFixed(2)
                            }
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {billingInterval === 'yearly' ? 'por mes' : 'al mes'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <FormControl component="fieldset" sx={{ mb: 3 }}>
                        <RadioGroup
                          value={billingInterval}
                          onChange={(e) => setBillingInterval(e.target.value as 'monthly' | 'yearly')}
                        >
                          <FormControlLabel
                            value="monthly"
                            control={<Radio />}
                            label={
                              <Box>
                                <Typography variant="body1">
                                  Facturación Mensual
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  ${planDetails.price.toFixed(2)} al mes
                                </Typography>
                              </Box>
                            }
                          />
                          <FormControlLabel
                            value="yearly"
                            control={<Radio />}
                            label={
                              <Box>
                                <Typography variant="body1">
                                  Facturación Anual
                                  <Chip
                                    label="Ahorra 20%"
                                    size="small"
                                    color="success"
                                    sx={{ ml: 1 }}
                                  />
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  ${(planDetails.price * 12 * 0.8).toFixed(2)} al año 
                                  (${(planDetails.price * 0.8).toFixed(2)} por mes)
                                </Typography>
                              </Box>
                            }
                          />
                        </RadioGroup>
                      </FormControl>
                      
                      <Divider sx={{ my: 3 }} />
                      
                      <Typography variant="h6" gutterBottom>
                        Características incluidas:
                      </Typography>
                      <List dense>
                        {planDetails.features.map((feature, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <CheckCircle color="primary" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={feature} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        ¿Tienes un código promocional?
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                          fullWidth
                          placeholder="Ingresa tu código"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          disabled={!!appliedPromo}
                        />
                        {appliedPromo ? (
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => setAppliedPromo(null)}
                          >
                            Quitar
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            onClick={validatePromoCode}
                            disabled={!promoCode}
                          >
                            Aplicar
                          </Button>
                        )}
                      </Box>
                      {appliedPromo && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                          Código {appliedPromo.code} aplicado: 
                          {appliedPromo.type === 'percentage' 
                            ? ` ${appliedPromo.discount}% de descuento`
                            : ` $${appliedPromo.discount} de descuento`
                          }
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card sx={{ position: 'sticky', top: 100 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Resumen del Pedido
                      </Typography>
                      <List dense>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary={planDetails.name}
                            secondary={`Facturación ${billingInterval === 'yearly' ? 'anual' : 'mensual'}`}
                          />
                          <Typography>
                            ${calculateSubtotal().toFixed(2)}
                          </Typography>
                        </ListItem>
                        
                        {calculateDiscount() > 0 && (
                          <ListItem sx={{ px: 0 }}>
                            <ListItemText 
                              primary="Descuentos"
                              secondary={appliedPromo?.code}
                            />
                            <Typography color="success.main">
                              -${calculateDiscount().toFixed(2)}
                            </Typography>
                          </ListItem>
                        )}
                        
                        {billingInterval === 'yearly' && (
                          <ListItem sx={{ px: 0 }}>
                            <ListItemText 
                              primary="Ahorro anual"
                              secondary="20% de descuento"
                            />
                            <Typography color="success.main">
                              -${planDetails.savings?.toFixed(2)}
                            </Typography>
                          </ListItem>
                        )}
                      </List>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">Total</Typography>
                        <Typography variant="h6" color="primary">
                          ${(calculateSubtotal() - calculateDiscount()).toFixed(2)}
                        </Typography>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        * Los impuestos se calcularán en el siguiente paso
                      </Typography>
                      
                      <List dense sx={{ bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 1, p: 1 }}>
                        <ListItem dense>
                          <ListItemIcon>
                            <Security fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Pago 100% seguro"
                            primaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                        <ListItem dense>
                          <ListItemIcon>
                            <Autorenew fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Cancela en cualquier momento"
                            primaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                        <ListItem dense>
                          <ListItemIcon>
                            <Timer fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Garantía de 30 días"
                            primaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
            
            {/* Step 1: Información de Facturación */}
            {activeStep === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h5" gutterBottom>
                    Información de Facturación
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Por favor completa tu información para la factura
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={!!billingDetails.companyName}
                                onChange={(e) => setBillingDetails({
                                  ...billingDetails,
                                  companyName: e.target.checked ? '' : undefined
                                })}
                              />
                            }
                            label="Facturar a nombre de empresa"
                          />
                        </Grid>
                        
                        {billingDetails.companyName !== undefined && (
                          <>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="Nombre de la Empresa"
                                value={billingDetails.companyName}
                                onChange={(e) => setBillingDetails({
                                  ...billingDetails,
                                  companyName: e.target.value
                                })}
                                required
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="ID Fiscal / NIF"
                                value={billingDetails.taxId || ''}
                                onChange={(e) => setBillingDetails({
                                  ...billingDetails,
                                  taxId: e.target.value
                                })}
                              />
                            </Grid>
                          </>
                        )}
                        
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Nombre Completo"
                            value={billingDetails.name}
                            onChange={(e) => setBillingDetails({
                              ...billingDetails,
                              name: e.target.value
                            })}
                            required
                          />
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={billingDetails.email}
                            onChange={(e) => setBillingDetails({
                              ...billingDetails,
                              email: e.target.value
                            })}
                            required
                          />
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Teléfono"
                            value={billingDetails.phone}
                            onChange={(e) => setBillingDetails({
                              ...billingDetails,
                              phone: e.target.value
                            })}
                            required
                            InputProps={{
                              startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                          />
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }}>
                            <Chip label="Dirección de Facturación" size="small" />
                          </Divider>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Dirección Línea 1"
                            value={billingDetails.address.line1}
                            onChange={(e) => setBillingDetails({
                              ...billingDetails,
                              address: { ...billingDetails.address, line1: e.target.value }
                            })}
                            required
                            InputProps={{
                              startAdornment: <Home sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                          />
                        </Grid>
                        
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Dirección Línea 2 (Opcional)"
                            value={billingDetails.address.line2 || ''}
                            onChange={(e) => setBillingDetails({
                              ...billingDetails,
                              address: { ...billingDetails.address, line2: e.target.value }
                            })}
                          />
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Ciudad"
                            value={billingDetails.address.city}
                            onChange={(e) => setBillingDetails({
                              ...billingDetails,
                              address: { ...billingDetails.address, city: e.target.value }
                            })}
                            required
                          />
                        </Grid>
                        
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="Estado/Provincia"
                            value={billingDetails.address.state}
                            onChange={(e) => setBillingDetails({
                              ...billingDetails,
                              address: { ...billingDetails.address, state: e.target.value }
                            })}
                            required
                          />
                        </Grid>
                        
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="Código Postal"
                            value={billingDetails.address.postal_code}
                            onChange={(e) => setBillingDetails({
                              ...billingDetails,
                              address: { ...billingDetails.address, postal_code: e.target.value }
                            })}
                            required
                          />
                        </Grid>
                        
                        <Grid item xs={12}>
                          <FormControl fullWidth required>
                            <InputLabel>País</InputLabel>
                            <Select
                              value={billingDetails.address.country}
                              label="País"
                              onChange={(e) => setBillingDetails({
                                ...billingDetails,
                                address: { ...billingDetails.address, country: e.target.value }
                              })}
                              startAdornment={<Flag sx={{ mr: 1, color: 'text.secondary' }} />}
                            >
                              <MenuItem value="US">Estados Unidos</MenuItem>
                              <MenuItem value="MX">México</MenuItem>
                              <MenuItem value="ES">España</MenuItem>
                              <MenuItem value="AR">Argentina</MenuItem>
                              <MenuItem value="CO">Colombia</MenuItem>
                              <MenuItem value="CL">Chile</MenuItem>
                              <MenuItem value="PE">Perú</MenuItem>
                              <MenuItem value="BR">Brasil</MenuItem>
                              <MenuItem value="GB">Reino Unido</MenuItem>
                              <MenuItem value="CA">Canadá</MenuItem>
                              <MenuItem value="FR">Francia</MenuItem>
                              <MenuItem value="DE">Alemania</MenuItem>
                              <MenuItem value="IT">Italia</MenuItem>
                              <MenuItem value="JP">Japón</MenuItem>
                              <MenuItem value="CN">China</MenuItem>
                              <MenuItem value="IN">India</MenuItem>
                              <MenuItem value="AU">Australia</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card sx={{ position: 'sticky', top: 100 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Información Importante
                      </Typography>
                      
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          Tu información de facturación se utilizará para:
                        </Typography>
                        <List dense sx={{ mt: 1 }}>
                          <ListItem sx={{ py: 0 }}>
                            <ListItemIcon>
                              <Receipt fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Generar facturas fiscales"
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                          <ListItem sx={{ py: 0 }}>
                            <ListItemIcon>
                              <VerifiedUser fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Verificación de identidad"
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                          <ListItem sx={{ py: 0 }}>
                            <ListItemIcon>
                              <ContactMail fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Comunicaciones importantes"
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        </List>
                      </Alert>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Privacidad de Datos
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Tu información está protegida con encriptación de nivel bancario 
                        y nunca será compartida con terceros sin tu consentimiento.
                      </Typography>
                      
                      <Button
                        fullWidth
                        variant="text"
                        size="small"
                        startIcon={<Policy />}
                        onClick={() => window.open('/privacy', '_blank')}
                      >
                        Ver Política de Privacidad
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
            
            {/* Step 2: Método de Pago */}
            {activeStep === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h5" gutterBottom>
                    Método de Pago
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Elige cómo deseas realizar el pago
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={8}>
                  <Grid container spacing={2}>
                    {paymentMethods.map((method) => (
                      <Grid item xs={12} sm={6} key={method.id}>
                        <Card
                          sx={{
                            cursor: 'pointer',
                            border: paymentMethod.id === method.id ? 2 : 1,
                            borderColor: paymentMethod.id === method.id 
                              ? 'primary.main' 
                              : 'divider',
                            transition: 'all 0.3s',
                            '&:hover': {
                              borderColor: 'primary.main',
                              transform: 'translateY(-2px)'
                            }
                          }}
                          onClick={() => setPaymentMethod(method)}
                        >
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Avatar sx={{ 
                                bgcolor: paymentMethod.id === method.id 
                                  ? 'primary.main' 
                                  : 'grey.200',
                                color: paymentMethod.id === method.id 
                                  ? 'white' 
                                  : 'text.secondary'
                              }}>
                                {method.icon}
                              </Avatar>
                              <Box sx={{ ml: 2, flexGrow: 1 }}>
                                <Typography variant="h6">
                                  {method.label}
                                </Typography>
                                {method.fee && method.fee !== 0 && (
                                  <Chip
                                    label={method.fee > 0 
                                      ? `+${method.fee}% comisión` 
                                      : `${Math.abs(method.fee)}% descuento`
                                    }
                                    size="small"
                                    color={method.fee > 0 ? 'warning' : 'success'}
                                  />
                                )}
                              </Box>
                              {paymentMethod.id === method.id && (
                                <CheckCircle color="primary" />
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {method.description}
                            </Typography>
                            {method.processingTime && (
                              <Typography variant="caption" color="text.secondary">
                                Tiempo de procesamiento: {method.processingTime}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  
                  <Card sx={{ mt: 3 }}>
                    <CardContent>
                      {paymentMethod.type === 'card' && (
                        <>
                          <Typography variant="h6" gutterBottom>
                            Información de la Tarjeta
                          </Typography>
                          <Box sx={{ mb: 3 }}>
                            <CardElement
                              options={{
                                style: {
                                  base: {
                                    fontSize: '16px',
                                    color: theme.palette.text.primary,
                                    '::placeholder': {
                                      color: theme.palette.text.secondary,
                                    },
                                  },
                                  invalid: {
                                    color: theme.palette.error.main,
                                  },
                                },
                                hidePostalCode: true,
                              }}
                            />
                          </Box>
                          <Alert severity="info" icon={<Lock />}>
                            Tu información de pago está protegida con encriptación SSL de 256 bits
                          </Alert>
                        </>
                      )}
                      
                      {paymentMethod.type === 'bank' && (
                        <>
                          <Typography variant="h6" gutterBottom>
                            Transferencia Bancaria
                          </Typography>
                          <Alert severity="info" sx={{ mb: 2 }}>
                            Se te proporcionarán los detalles bancarios después de confirmar el pedido
                          </Alert>
                          <List dense>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircle color="primary" />
                              </ListItemIcon>
                              <ListItemText primary="Sin comisiones adicionales" />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircle color="primary" />
                              </ListItemIcon>
                              <ListItemText primary="Procesamiento en 1-3 días hábiles" />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <CheckCircle color="primary" />
                              </ListItemIcon>
                              <ListItemText primary="Confirmación automática al recibir el pago" />
                            </ListItem>
                          </List>
                        </>
                      )}
                      
                      {paymentMethod.type === 'crypto' && (
                        <>
                          <Typography variant="h6" gutterBottom>
                            Pago con Criptomonedas
                          </Typography>
                          <Alert severity="success" sx={{ mb: 2 }}>
                            ¡5% de descuento adicional por pagar con crypto!
                          </Alert>
                          <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Selecciona la criptomoneda</InputLabel>
                            <Select defaultValue="btc" label="Selecciona la criptomoneda">
                              <MenuItem value="btc">Bitcoin (BTC)</MenuItem>
                              <MenuItem value="eth">Ethereum (ETH)</MenuItem>
                              <MenuItem value="usdt">Tether (USDT)</MenuItem>
                              <MenuItem value="usdc">USD Coin (USDC)</MenuItem>
                            </Select>
                          </FormControl>
                          <Typography variant="body2" color="text.secondary">
                            Se te proporcionará una dirección de wallet después de confirmar
                          </Typography>
                        </>
                      )}
                      
                      {paymentMethod.type === 'paypal' && (
                        <>
                          <Typography variant="h6" gutterBottom>
                            PayPal
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            Serás redirigido a PayPal para completar el pago de forma segura
                          </Typography>
                          <Box sx={{ textAlign: 'center', my: 3 }}>
                            <img 
                              src="/images/paypal-logo.png" 
                              alt="PayPal" 
                              style={{ height: 40 }}
                            />
                          </Box>
                        </>
                      )}
                      
                      <Divider sx={{ my: 3 }} />
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={savePaymentMethod}
                            onChange={(e) => setSavePaymentMethod(e.target.checked)}
                          />
                        }
                        label="Guardar método de pago para futuras compras"
                      />
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card sx={{ position: 'sticky', top: 100 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Resumen del Pedido
                      </Typography>
                      
                      <List dense>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary={planDetails.name}
                            secondary={`Facturación ${billingInterval}`}
                          />
                          <Typography>
                            ${calculateSubtotal().toFixed(2)}
                          </Typography>
                        </ListItem>
                        
                        {calculateDiscount() > 0 && (
                          <ListItem sx={{ px: 0 }}>
                            <ListItemText primary="Descuentos" />
                            <Typography color="success.main">
                              -${calculateDiscount().toFixed(2)}
                            </Typography>
                          </ListItem>
                        )}
                        
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText 
                            primary="Impuestos"
                            secondary={`${billingDetails.address.country} - ${billingDetails.address.state}`}
                          />
                          <Typography>
                            ${calculateTax().toFixed(2)}
                          </Typography>
                        </ListItem>
                        
                        {paymentMethod.fee && paymentMethod.fee > 0 && (
                          <ListItem sx={{ px: 0 }}>
                            <ListItemText primary="Comisión de procesamiento" />
                            <Typography>
                              ${(calculateSubtotal() * (paymentMethod.fee / 100)).toFixed(2)}
                            </Typography>
                          </ListItem>
                        )}
                      </List>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h5">Total</Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h5" color="primary">
                            ${calculateTotal().toFixed(2)}
                          </Typography>
                          {billingInterval === 'yearly' && (
                            <Typography variant="caption" color="text.secondary">
                              (${(calculateTotal() / 12).toFixed(2)} por mes)
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      
                      <Alert severity="success" icon={<Savings />}>
                        {billingInterval === 'yearly' 
                          ? `Ahorras $${planDetails.savings?.toFixed(2)} al año`
                          : 'Cambia a facturación anual y ahorra 20%'
                        }
                      </Alert>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
            
            {/* Step 3: Revisión y Confirmación */}
            {activeStep === 3 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h5" gutterBottom>
                    Revisión y Confirmación
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Por favor revisa tu pedido antes de confirmar
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={8}>
                  {/* Resumen del Plan */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Plan Seleccionado
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="h5">{planDetails.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Facturación {billingInterval === 'yearly' ? 'anual' : 'mensual'}
                          </Typography>
                        </Box>
                        <Typography variant="h5" color="primary">
                          ${calculateSubtotal().toFixed(2)}
                          {billingInterval === 'yearly' && (
                            <Typography variant="body2" color="text.secondary">
                              por año
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                  
                  {/* Información de Facturación */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">
                          Información de Facturación
                        </Typography>
                        <IconButton size="small" onClick={() => setActiveStep(1)}>
                          <Edit />
                        </IconButton>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary">
                            Nombre
                          </Typography>
                          <Typography variant="body1" gutterBottom>
                            {billingDetails.name}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary">
                            Email
                          </Typography>
                          <Typography variant="body1" gutterBottom>
                            {billingDetails.email}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary">
                            Teléfono
                          </Typography>
                          <Typography variant="body1">
                            {billingDetails.phone}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary">
                            Dirección
                          </Typography>
                          <Typography variant="body1">
                            {billingDetails.address.line1}
                            {billingDetails.address.line2 && `, ${billingDetails.address.line2}`}
                          </Typography>
                          <Typography variant="body1">
                            {billingDetails.address.city}, {billingDetails.address.state} {billingDetails.address.postal_code}
                          </Typography>
                          <Typography variant="body1">
                            {billingDetails.address.country}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                  
                  {/* Método de Pago */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">
                          Método de Pago
                        </Typography>
                        <IconButton size="small" onClick={() => setActiveStep(2)}>
                          <Edit />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                          {paymentMethod.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="body1">
                            {paymentMethod.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {paymentMethod.description}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                  
                  {/* Términos y Condiciones */}
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Términos y Condiciones
                      </Typography>
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={autoRenew}
                            onChange={(e) => setAutoRenew(e.target.checked)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1">
                              Renovación automática
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Tu suscripción se renovará automáticamente cada {billingInterval === 'yearly' ? 'año' : 'mes'}
                            </Typography>
                          </Box>
                        }
                        sx={{ mb: 2 }}
                      />
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={receiveUpdates}
                            onChange={(e) => setReceiveUpdates(e.target.checked)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1">
                              Recibir actualizaciones
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Novedades sobre productos, ofertas especiales y tips
                            </Typography>
                          </Box>
                        }
                        sx={{ mb: 2 }}
                      />
                      
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            color="primary"
                          />
                        }
                        label={
                          <Typography variant="body2">
                            Acepto los{' '}
                            <Link 
                              component="button" 
                              variant="body2"
                              onClick={(e) => {
                                e.preventDefault();
                                window.open('/terms', '_blank');
                              }}
                            >
                              Términos y Condiciones
                            </Link>
                            {' '}y la{' '}
                            <Link 
                              component="button" 
                              variant="body2"
                              onClick={(e) => {
                                e.preventDefault();
                                window.open('/privacy', '_blank');
                              }}
                            >
                              Política de Privacidad
                            </Link>
                          </Typography>
                        }
                        sx={{ mb: 2 }}
                      />
                      
                      <Alert severity="info" icon={<Info />}>
                        <Typography variant="body2">
                          Puedes cancelar tu suscripción en cualquier momento desde tu panel de control. 
                          Si cancelas, mantendrás acceso hasta el final del período de facturación actual.
                        </Typography>
                      </Alert>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card sx={{ position: 'sticky', top: 100 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Total a Pagar
                      </Typography>
                      
                      <List dense>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText primary="Subtotal" />
                          <Typography>
                            ${calculateSubtotal().toFixed(2)}
                          </Typography>
                        </ListItem>
                        
                        {calculateDiscount() > 0 && (
                          <ListItem sx={{ px: 0 }}>
                            <ListItemText primary="Descuentos" />
                            <Typography color="success.main">
                              -${calculateDiscount().toFixed(2)}
                            </Typography>
                          </ListItem>
                        )}
                        
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText primary="Impuestos" />
                          <Typography>
                            ${calculateTax().toFixed(2)}
                          </Typography>
                        </ListItem>
                      </List>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h4">Total</Typography>
                        <Typography variant="h4" color="primary">
                          ${calculateTotal().toFixed(2)}
                        </Typography>
                      </Box>
                      
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        type="submit"
                        disabled={processing || !acceptTerms || !stripe}
                        startIcon={processing ? <CircularProgress size={20} /> : <Lock />}
                      >
                        {processing ? 'Procesando...' : `Pagar ${calculateTotal().toFixed(2)} USD`}
                      </Button>
                      
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Security sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="caption" color="text.secondary">
                            Pago 100% seguro
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Shield sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="caption" color="text.secondary">
                            Garantía de devolución de 30 días
                          </Typography>
                        </Box>
                      </Stack>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="caption" color="text.secondary" align="center" display="block">
                        Al hacer clic en "Pagar", autorizas a LOGOS AI a cobrar tu método de pago
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
            
            {/* Navegación */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
                startIcon={<ArrowBack />}
              >
                Atrás
              </Button>
              
              {activeStep < steps.length - 1 && (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForward />}
                >
                  Continuar
                </Button>
              )}
            </Box>
          </form>
        </>
      )}
    </Box>
  );
};

const SubscriptionCheckout: NextPage = () => {
  const router = useRouter();
  const { planId } = router.query;
  
  if (!planId || !stripePromise) {
    return (
      <DashboardLayout>
        <Container maxWidth="lg">
          <Alert severity="error">
            Plan no válido o Stripe no está configurado
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <Container maxWidth="lg">
        <Elements stripe={stripePromise}>
          <CheckoutForm planId={planId as string} />
        </Elements>
      </Container>
    </DashboardLayout>
  );
};

export default withAuth(SubscriptionCheckout);