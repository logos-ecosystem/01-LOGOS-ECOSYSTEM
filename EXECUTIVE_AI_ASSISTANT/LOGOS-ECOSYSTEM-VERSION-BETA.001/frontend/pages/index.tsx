import React from 'react';
import { Box, Container, Typography, Button, Grid, Paper } from '@mui/material';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 8, mb: 4, textAlign: 'center' }}>
        <Typography variant="h1" component="h1" gutterBottom sx={{ fontSize: '3rem', fontWeight: 'bold' }}>
          Welcome to LOGOS AI Ecosystem
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Discover 100+ Specialized AI Agents Ready to Transform Your World
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Button 
            variant="contained" 
            size="large" 
            sx={{ mr: 2 }}
            onClick={() => router.push('/marketplace')}
          >
            Explore AI Agents
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            onClick={() => router.push('/auth/signin')}
          >
            Get Started
          </Button>
        </Box>
      </Box>

      <Grid container spacing={4} sx={{ mt: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h4" gutterBottom>100+ AI Agents</Typography>
            <Typography color="text.secondary">
              Specialized agents for every industry and use case
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h4" gutterBottom>Instant Access</Typography>
            <Typography color="text.secondary">
              Start using AI agents immediately with our marketplace
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h4" gutterBottom>Enterprise Ready</Typography>
            <Typography color="text.secondary">
              Scalable, secure, and customizable for your needs
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 8, mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          Ready to Transform Your Business?
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Join thousands of companies using LOGOS AI
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          color="primary"
          onClick={() => router.push('/auth/signup')}
        >
          Start Free Trial
        </Button>
      </Box>
    </Container>
  );
}