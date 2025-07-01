import React from 'react';
import { Box, Container, Typography, Button, Grid, Paper } from '@mui/material';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h1" component="h1" gutterBottom sx={{ fontSize: { xs: '2.5rem', md: '4rem' } }}>
          LOGOS AI Ecosystem
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          100+ AI Agents • Marketplace • IoT Integration • Enterprise Ready
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            sx={{ mr: 2 }}
            onClick={() => router.push('/dashboard')}
          >
            Get Started
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => router.push('/marketplace')}
          >
            Explore Marketplace
          </Button>
        </Box>
      </Box>

      <Grid container spacing={4} sx={{ mt: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>100+ AI Agents</Typography>
            <Typography>Specialized agents for every industry and use case</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>Marketplace</Typography>
            <Typography>Buy, sell, and trade AI services</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>Enterprise Ready</Typography>
            <Typography>Secure, scalable, and fully customizable</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          © 2024 LOGOS AI Ecosystem. Powered by Anthropic Claude.
        </Typography>
      </Box>
    </Container>
  );
}