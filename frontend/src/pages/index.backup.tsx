import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Box, Container, Typography, Button, Grid, Card, CardContent } from '@mui/material';
import { styled } from '@mui/material/styles';
import SEOHead from '../components/SEO/SEOHead';
import { useAuth } from '../contexts/AuthContext';

const HeroSection = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  color: 'white',
  padding: theme.spacing(15, 0),
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'url("/images/ai-pattern.svg") repeat',
    opacity: 0.1,
  },
}));

const FeatureCard = styled(Card)(({ theme }) => ({
  height: '100%',
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  },
}));

const StatsBox = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(3),
  '& .stat-number': {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: theme.palette.primary.main,
  },
  '& .stat-label': {
    fontSize: '1.2rem',
    color: theme.palette.text.secondary,
  },
}));

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      title: 'AI Agents for Every Field',
      description: 'Access specialized AI agents for medicine, law, engineering, science, and more.',
      icon: '🤖',
    },
    {
      title: 'Voice & Audio Integration',
      description: 'Interact with AI agents using natural voice commands and receive audio responses.',
      icon: '🎙️',
    },
    {
      title: 'IoT & Smart Device Support',
      description: 'Connect your smart home, wearables, and IoT devices for seamless AI assistance.',
      icon: '🏠',
    },
    {
      title: 'Automotive Integration',
      description: 'Access AI agents directly from your car\'s infotainment system.',
      icon: '🚗',
    },
    {
      title: 'Marketplace Ecosystem',
      description: 'Buy and sell AI agents, custom solutions, and integrations.',
      icon: '🛍️',
    },
    {
      title: 'White-Label Ready',
      description: 'Customize and rebrand the entire platform for your business.',
      icon: '🏢',
    },
  ];

  const stats = [
    { number: '100+', label: 'AI Agents' },
    { number: '50+', label: 'Knowledge Domains' },
    { number: '24/7', label: 'Availability' },
    { number: '100%', label: 'Secure' },
  ];

  return (
    <>
      <SEOHead
        title="LOGOS ECOSYSTEM - AI-Native Platform for Everyone"
        description="Access specialized AI agents for every field of knowledge. Voice-enabled, IoT-ready, and fully customizable."
        keywords="AI agents, artificial intelligence, voice AI, IoT integration, smart home AI, automotive AI"
      />

      <Box sx={{ minHeight: '100vh', background: '#0a0a0a' }}>
        {/* Hero Section */}
        <HeroSection>
          <Container maxWidth="lg">
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, fontWeight: 'bold', mb: 3 }}>
                  The Future of AI is Here
                </Typography>
                <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                  Access specialized AI agents for every field of human knowledge. 
                  Voice-enabled, IoT-ready, and built for the future.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => router.push(isAuthenticated ? '/dashboard' : '/auth/signup')}
                    sx={{ 
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                    }}
                  >
                    Get Started Free
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => router.push('/marketplace')}
                    sx={{ borderColor: 'white', color: 'white' }}
                  >
                    Explore Marketplace
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  component="img"
                  src="/images/hero-ai.svg"
                  alt="AI Ecosystem"
                  sx={{ width: '100%', maxWidth: 500, height: 'auto' }}
                />
              </Grid>
            </Grid>
          </Container>
        </HeroSection>

        {/* Stats Section */}
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Grid container spacing={3}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <StatsBox>
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </StatsBox>
              </Grid>
            ))}
          </Grid>
        </Container>

        {/* Features Section */}
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Typography variant="h2" align="center" sx={{ mb: 6, color: 'white' }}>
            Everything You Need in One Platform
          </Typography>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <FeatureCard>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h2" sx={{ fontSize: '3rem', mb: 2 }}>
                      {feature.icon}
                    </Typography>
                    <Typography variant="h5" sx={{ mb: 2, color: 'white' }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </FeatureCard>
              </Grid>
            ))}
          </Grid>
        </Container>

        {/* CTA Section */}
        <Box sx={{ background: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)', py: 8, mt: 8 }}>
          <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
            <Typography variant="h3" sx={{ mb: 3, color: 'white' }}>
              Ready to Transform Your Business?
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, color: 'rgba(255, 255, 255, 0.9)' }}>
              Join thousands of users leveraging AI for success
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/auth/signup')}
              sx={{ 
                background: 'white',
                color: '#2196F3',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              Start Your Free Trial
            </Button>
          </Container>
        </Box>

        {/* Footer */}
        <Box sx={{ py: 4, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                  LOGOS ECOSYSTEM
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  AI-Native platform bringing specialized intelligence to every domain.
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                  Quick Links
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Link href="/about" passHref>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', '&:hover': { color: 'white' } }}>
                      About Us
                    </Typography>
                  </Link>
                  <Link href="/pricing" passHref>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', '&:hover': { color: 'white' } }}>
                      Pricing
                    </Typography>
                  </Link>
                  <Link href="/developers" passHref>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', '&:hover': { color: 'white' } }}>
                      Developers
                    </Typography>
                  </Link>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                  Legal
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Link href="/privacy" passHref>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', '&:hover': { color: 'white' } }}>
                      Privacy Policy
                    </Typography>
                  </Link>
                  <Link href="/terms" passHref>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', '&:hover': { color: 'white' } }}>
                      Terms of Service
                    </Typography>
                  </Link>
                </Box>
              </Grid>
            </Grid>
            <Typography variant="body2" sx={{ mt: 4, pt: 4, borderTop: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center' }}>
              © 2024 LOGOS ECOSYSTEM. All rights reserved.
            </Typography>
          </Container>
        </Box>
      </Box>
    </>
  );
}