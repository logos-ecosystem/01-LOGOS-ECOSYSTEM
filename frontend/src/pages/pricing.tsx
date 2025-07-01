import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CheckCircle,
  ExpandMore,
  Rocket,
  Business,
  AllInclusive,
  Star
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import SEOHead from '../components/SEO/SEOHead';
import { useAuth } from '../contexts/AuthContext';

const plans = [
  {
    name: 'Starter',
    icon: <Rocket />,
    price: { monthly: 29, annual: 290 },
    description: 'Perfect for individuals getting started with AI',
    features: [
      '5 AI agents included',
      'Voice interaction',
      'Mobile & web access',
      '1,000 requests/month',
      'Email support',
      'Basic integrations'
    ],
    popular: false
  },
  {
    name: 'Professional',
    icon: <Star />,
    price: { monthly: 99, annual: 990 },
    description: 'For professionals who need more power',
    features: [
      '20 AI agents included',
      'Voice & audio I/O',
      'All device access',
      '10,000 requests/month',
      'Priority support',
      'Advanced integrations',
      'API access',
      'Custom workflows'
    ],
    popular: true
  },
  {
    name: 'Business',
    icon: <Business />,
    price: { monthly: 299, annual: 2990 },
    description: 'For teams and businesses',
    features: [
      '50 AI agents included',
      'Full voice & audio suite',
      'All integrations',
      '50,000 requests/month',
      'Dedicated support',
      'Team collaboration',
      'Admin dashboard',
      'Usage analytics',
      'SLA guarantee'
    ],
    popular: false
  },
  {
    name: 'Enterprise',
    icon: <AllInclusive />,
    price: { monthly: 'Custom', annual: 'Custom' },
    description: 'Unlimited power for large organizations',
    features: [
      'Unlimited AI agents',
      'White-label options',
      'Custom integrations',
      'Unlimited requests',
      'Dedicated account manager',
      'Custom AI training',
      'On-premise deployment',
      'Enterprise security',
      'Custom SLA'
    ],
    popular: false
  }
];

const faqs = [
  {
    question: 'Can I change plans anytime?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any differences.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, bank transfers, and cryptocurrency payments including Bitcoin, Ethereum, and USDT.'
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! All new users get a 14-day free trial of the Professional plan. No credit card required.'
  },
  {
    question: 'What counts as a request?',
    answer: 'Any interaction with an AI agent counts as one request. This includes text queries, voice commands, and API calls.'
  },
  {
    question: 'Can I buy additional AI agents?',
    answer: 'Absolutely! You can purchase individual AI agents from our marketplace at any time, regardless of your plan.'
  },
  {
    question: 'Do you offer educational discounts?',
    answer: 'Yes! Students and educators get 50% off all plans. Contact support with your .edu email to get verified.'
  }
];

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const handleGetStarted = (planName: string) => {
    if (planName === 'Enterprise') {
      router.push('/contact?type=enterprise');
    } else if (isAuthenticated) {
      router.push(`/dashboard/billing?plan=${planName.toLowerCase()}`);
    } else {
      router.push(`/auth/signup?plan=${planName.toLowerCase()}`);
    }
  };

  return (
    <>
      <SEOHead
        title="Pricing - LOGOS ECOSYSTEM"
        description="Choose the perfect AI plan for your needs. From individuals to enterprises, we have you covered."
        keywords="AI pricing, subscription plans, AI agents pricing"
      />

      <Box sx={{ minHeight: '100vh', background: '#0a0a0a', color: 'white' }}>
        {/* Hero Section */}
        <Box sx={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', py: 8 }}>
          <Container maxWidth="lg">
            <Typography variant="h2" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
              Simple, Transparent Pricing
            </Typography>
            <Typography variant="h5" align="center" sx={{ opacity: 0.9, mb: 4 }}>
              Choose the plan that fits your needs. Cancel anytime.
            </Typography>
            
            {/* Billing Toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 6 }}>
              <Typography variant="body1" sx={{ mr: 2 }}>
                Monthly
              </Typography>
              <Switch
                checked={billingPeriod === 'annual'}
                onChange={(e) => setBillingPeriod(e.target.checked ? 'annual' : 'monthly')}
                color="primary"
              />
              <Typography variant="body1" sx={{ ml: 2 }}>
                Annual
              </Typography>
              <Chip
                label="Save 20%"
                color="success"
                size="small"
                sx={{ ml: 2 }}
              />
            </Box>
          </Container>
        </Box>

        {/* Pricing Cards */}
        <Container maxWidth="lg" sx={{ py: 8, mt: -8 }}>
          <Grid container spacing={4}>
            {plans.map((plan) => (
              <Grid item xs={12} md={6} lg={3} key={plan.name}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    background: plan.popular ? 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)' : 'rgba(255,255,255,0.05)',
                    border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    transform: plan.popular ? 'scale(1.05)' : 'none',
                  }}
                >
                  {plan.popular && (
                    <Chip
                      label="Most Popular"
                      color="warning"
                      sx={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  )}
                  <CardContent sx={{ flex: 1, p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      <Box sx={{ fontSize: 48, mb: 2 }}>
                        {plan.icon}
                      </Box>
                      <Typography variant="h4" gutterBottom>
                        {plan.name}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
                        {plan.description}
                      </Typography>
                      <Typography variant="h3" sx={{ mb: 1 }}>
                        {typeof plan.price[billingPeriod] === 'number' 
                          ? `$${plan.price[billingPeriod]}`
                          : plan.price[billingPeriod]
                        }
                      </Typography>
                      {typeof plan.price[billingPeriod] === 'number' && (
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                          per {billingPeriod === 'monthly' ? 'month' : 'year'}
                        </Typography>
                      )}
                    </Box>
                    <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.2)' }} />
                    <List dense>
                      {plan.features.map((feature, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <CheckCircle color={plan.popular ? 'inherit' : 'primary'} />
                          </ListItemIcon>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                  <CardActions sx={{ p: 3, pt: 0 }}>
                    <Button
                      fullWidth
                      variant={plan.popular ? 'contained' : 'outlined'}
                      size="large"
                      onClick={() => handleGetStarted(plan.name)}
                      sx={{
                        background: plan.popular ? 'white' : 'transparent',
                        color: plan.popular ? '#2196F3' : 'white',
                        borderColor: 'white',
                        '&:hover': {
                          background: plan.popular ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)',
                        }
                      }}
                    >
                      {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>

        {/* Features Comparison */}
        <Box sx={{ background: 'rgba(255,255,255,0.05)', py: 8 }}>
          <Container maxWidth="lg">
            <Typography variant="h3" align="center" gutterBottom sx={{ mb: 6 }}>
              All Plans Include
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    End-to-End Encryption
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Your data is always secure and private
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    99.9% Uptime SLA
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Reliable service you can count on
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Regular Updates
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    New AI agents and features added monthly
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* FAQs */}
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Typography variant="h3" align="center" gutterBottom sx={{ mb: 6 }}>
            Frequently Asked Questions
          </Typography>
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {faqs.map((faq, index) => (
              <Accordion
                key={index}
                sx={{
                  background: 'rgba(255,255,255,0.05)',
                  '&:before': { display: 'none' },
                  mb: 2,
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">{faq.question}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body1" sx={{ opacity: 0.8 }}>
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Container>

        {/* CTA Section */}
        <Box sx={{ background: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)', py: 8 }}>
          <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
            <Typography variant="h3" gutterBottom>
              Ready to Get Started?
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              Join thousands of users already using LOGOS ECOSYSTEM
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/auth/signup')}
              sx={{
                background: 'white',
                color: '#2196F3',
                '&:hover': {
                  background: 'rgba(255,255,255,0.9)',
                },
              }}
            >
              Start Your Free Trial
            </Button>
          </Container>
        </Box>

        {/* Footer */}
        <Box sx={{ py: 4, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Container maxWidth="lg">
            <Typography variant="body2" align="center" sx={{ opacity: 0.6 }}>
              © 2024 LOGOS ECOSYSTEM. All rights reserved. Prices subject to change.
            </Typography>
          </Container>
        </Box>
      </Box>
    </>
  );
}