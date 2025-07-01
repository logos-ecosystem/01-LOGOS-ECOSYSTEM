import React, { useState } from 'react';
import { NextPage } from 'next';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  alpha,
  CircularProgress,
  Skeleton
} from '@mui/material';
import {
  Check,
  Close,
  CreditCard as CreditCardIcon,
  Receipt,
  TrendingUp,
  Star,
  ArrowUpward,
  ArrowDownward,
  Download,
  Add,
  Delete,
  CheckCircle
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import withAuth from '@/components/Auth/withAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionAPI } from '@/services/api/subscription';
import { loadStripe } from '@stripe/stripe-js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const SubscriptionManagement: NextPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Queries
  const { data: currentSubscription, isLoading: loadingSubscription } = useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: subscriptionAPI.getCurrentSubscription
  });

  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: subscriptionAPI.getPlans
  });

  const { data: paymentMethods, isLoading: loadingPaymentMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: subscriptionAPI.getPaymentMethods
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => subscriptionAPI.getInvoices(10, 0)
  });

  const { data: usageStats } = useQuery({
    queryKey: ['subscription', 'usage'],
    queryFn: subscriptionAPI.getUsageStats
  });

  // Mutations
  const upgradeMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (currentSubscription) {
        return subscriptionAPI.updateSubscription(currentSubscription.id, planId);
      } else {
        // Create checkout session for new subscription
        const { sessionId } = await subscriptionAPI.createCheckoutSession(planId);
        const stripe = await stripePromise;
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setShowUpgradeDialog(false);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!currentSubscription) throw new Error('No active subscription');
      return subscriptionAPI.cancelSubscription(currentSubscription.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setShowCancelDialog(false);
    }
  });

  const addPaymentMethodMutation = useMutation({
    mutationFn: async () => {
      const { clientSecret } = await subscriptionAPI.createSetupIntent();
      const stripe = await stripePromise;
      if (stripe) {
        // This would typically open Stripe's payment element
        // For now, we'll just show the portal
        const { url } = await subscriptionAPI.createCustomerPortalSession();
        window.open(url, '_blank');
      }
    }
  });

  const downloadInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const blob = await subscriptionAPI.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  });

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    setShowUpgradeDialog(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    try {
      await upgradeMutation.mutateAsync(selectedPlan);
    } finally {
      setIsProcessing(false);
    }
  };

  const openCustomerPortal = async () => {
    const { url } = await subscriptionAPI.createCustomerPortalSession();
    window.open(url, '_blank');
  };

  const getPlanComparison = (planA: string, planB: string) => {
    if (planA === planB) return 'current';
    const planOrder = ['free', 'starter', 'professional', 'enterprise'];
    const indexA = planOrder.indexOf(planA.toLowerCase());
    const indexB = planOrder.indexOf(planB.toLowerCase());
    return indexA < indexB ? 'upgrade' : 'downgrade';
  };

  if (loadingSubscription || loadingPlans) {
    return (
      <DashboardLayout>
        <Container maxWidth="xl">
          <Box sx={{ py: 4 }}>
            <Skeleton variant="text" width={300} height={40} />
            <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Suscripción y Pagos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona tu plan, métodos de pago y facturación
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Current Plan */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Plan Actual
              </Typography>
              {currentSubscription ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" sx={{ mr: 2 }}>
                      {currentSubscription.plan.name}
                    </Typography>
                    <Chip
                      label={currentSubscription.status}
                      color={currentSubscription.status === 'active' ? 'success' : 'default'}
                    />
                  </Box>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {currentSubscription.plan.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Typography variant="h5">
                      ${currentSubscription.plan.price}/{currentSubscription.plan.interval === 'monthly' ? 'mes' : 'año'}
                    </Typography>
                    {currentSubscription.cancelAtPeriodEnd && (
                      <Alert severity="warning" sx={{ py: 0 }}>
                        Se cancelará el {format(new Date(currentSubscription.currentPeriodEnd), 'dd/MM/yyyy')}
                      </Alert>
                    )}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={openCustomerPortal}
                    >
                      Portal de Cliente
                    </Button>
                    {!currentSubscription.cancelAtPeriodEnd && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setShowCancelDialog(true)}
                      >
                        Cancelar Suscripción
                      </Button>
                    )}
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body1" color="text.secondary">
                    No tienes una suscripción activa. Selecciona un plan para comenzar.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Available Plans */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Planes Disponibles
            </Typography>
            <Grid container spacing={3}>
              {plans?.map((plan) => {
                const comparison = currentSubscription
                  ? getPlanComparison(currentSubscription.plan.name, plan.name)
                  : 'upgrade';
                
                return (
                  <Grid item xs={12} sm={6} md={3} key={plan.id}>
                    <Card
                      sx={{
                        height: '100%',
                        position: 'relative',
                        ...(plan.isPopular && {
                          borderColor: theme.palette.primary.main,
                          borderWidth: 2
                        })
                      }}
                      variant={plan.isPopular ? 'outlined' : 'elevation'}
                    >
                      {plan.isPopular && (
                        <Chip
                          label="MÁS POPULAR"
                          color="primary"
                          size="small"
                          icon={<Star />}
                          sx={{
                            position: 'absolute',
                            top: 10,
                            right: 10
                          }}
                        />
                      )}
                      <CardContent sx={{ pb: 0 }}>
                        <Typography variant="h5" gutterBottom>
                          {plan.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {plan.description}
                        </Typography>
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="h3" component="span">
                            ${plan.price}
                          </Typography>
                          <Typography variant="body1" component="span" color="text.secondary">
                            /{plan.interval === 'monthly' ? 'mes' : 'año'}
                          </Typography>
                        </Box>
                        <List dense>
                          {plan.features.slice(0, 5).map((feature) => (
                            <ListItem key={feature.id} sx={{ px: 0 }}>
                              <ListItemIcon sx={{ minWidth: 30 }}>
                                {feature.included ? (
                                  <Check color="success" fontSize="small" />
                                ) : (
                                  <Close color="disabled" fontSize="small" />
                                )}
                              </ListItemIcon>
                              <ListItemText
                                primary={feature.name}
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  color: feature.included ? 'text.primary' : 'text.disabled'
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                      <CardActions sx={{ p: 2, pt: 0 }}>
                        {comparison === 'current' ? (
                          <Button fullWidth variant="outlined" disabled>
                            Plan Actual
                          </Button>
                        ) : (
                          <Button
                            fullWidth
                            variant={plan.isPopular ? 'contained' : 'outlined'}
                            startIcon={comparison === 'upgrade' ? <ArrowUpward /> : <ArrowDownward />}
                            onClick={() => handleUpgrade(plan.id)}
                          >
                            {comparison === 'upgrade' ? 'Mejorar' : 'Cambiar'} Plan
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>

          {/* Usage Stats */}
          {usageStats && (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Uso del Plan
                </Typography>
                <List>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Llamadas API"
                      secondary={`${usageStats.currentPeriod.apiCalls.toLocaleString()} / ${usageStats.limits.maxApiCalls.toLocaleString()}`}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {usageStats.percentages.apiCalls}%
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Almacenamiento"
                      secondary={`${usageStats.currentPeriod.storageGB} GB / ${usageStats.limits.maxStorageGB} GB`}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {usageStats.percentages.storage}%
                    </Typography>
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Bots Activos"
                      secondary={`${usageStats.currentPeriod.activeBots} / ${usageStats.limits.maxBots}`}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {usageStats.percentages.bots}%
                    </Typography>
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          )}

          {/* Payment Methods */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Métodos de Pago
                </Typography>
                <IconButton onClick={() => addPaymentMethodMutation.mutate()}>
                  <Add />
                </IconButton>
              </Box>
              {paymentMethods && paymentMethods.length > 0 ? (
                <List>
                  {paymentMethods.map((method) => (
                    <ListItem
                      key={method.id}
                      secondaryAction={
                        <IconButton edge="end" disabled>
                          <Delete />
                        </IconButton>
                      }
                      sx={{ px: 0 }}
                    >
                      <ListItemIcon>
                        <CreditCardIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={`•••• ${method.last4}`}
                        secondary={method.brand}
                      />
                      {method.isDefault && (
                        <Chip label="Principal" size="small" sx={{ mr: 1 }} />
                      )}
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hay métodos de pago configurados
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Recent Invoices */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Facturas Recientes
              </Typography>
              {invoices && invoices.invoices.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell align="right">Monto</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            {format(new Date(invoice.dueDate), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            {invoice.items[0]?.description || 'Suscripción'}
                          </TableCell>
                          <TableCell align="right">
                            ${invoice.amount} {invoice.currency.toUpperCase()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={invoice.status}
                              color={invoice.status === 'paid' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => downloadInvoiceMutation.mutate(invoice.id)}
                            >
                              <Download />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hay facturas disponibles
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Upgrade Dialog */}
        <Dialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)}>
          <DialogTitle>
            Confirmar Cambio de Plan
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              ¿Estás seguro de que deseas cambiar tu plan? Los cambios se aplicarán inmediatamente.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowUpgradeDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={confirmUpgrade}
              disabled={isProcessing}
              startIcon={isProcessing ? <CircularProgress size={20} /> : null}
            >
              {isProcessing ? 'Procesando...' : 'Confirmar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cancel Dialog */}
        <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
          <DialogTitle>
            Cancelar Suscripción
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Tu suscripción permanecerá activa hasta el final del período actual.
            </Alert>
            <Typography variant="body1">
              ¿Estás seguro de que deseas cancelar tu suscripción? Perderás acceso a todas las funciones premium.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCancelDialog(false)}>
              Mantener Suscripción
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar Suscripción'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
};

export default withAuth(SubscriptionManagement);