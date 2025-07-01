import React from 'react';
import { Container, Typography, Grid, Card, CardContent, CardActions, Button, Box, Chip } from '@mui/material';

const agents = [
  { id: 1, name: 'Business Analyst AI', category: 'Business', price: '$99/mo', description: 'Advanced business analytics and insights' },
  { id: 2, name: 'Code Assistant Pro', category: 'Technical', price: '$79/mo', description: 'Expert programming assistance' },
  { id: 3, name: 'Medical Advisor AI', category: 'Healthcare', price: '$149/mo', description: 'Medical knowledge and guidance' },
  { id: 4, name: 'Legal Expert AI', category: 'Legal', price: '$199/mo', description: 'Legal research and documentation' },
  { id: 5, name: 'Marketing Genius', category: 'Marketing', price: '$89/mo', description: 'Marketing strategies and content' },
  { id: 6, name: 'Education Tutor AI', category: 'Education', price: '$59/mo', description: 'Personalized learning assistance' },
];

export default function Marketplace() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h2" component="h1" gutterBottom align="center">
        AI Agent Marketplace
      </Typography>
      <Typography variant="h5" color="text.secondary" paragraph align="center">
        Choose from 100+ specialized AI agents
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 4 }}>
        {agents.map((agent) => (
          <Grid item key={agent.id} xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">
                  {agent.name}
                </Typography>
                <Chip label={agent.category} size="small" sx={{ mb: 2 }} />
                <Typography color="text.secondary" paragraph>
                  {agent.description}
                </Typography>
                <Typography variant="h6" color="primary">
                  {agent.price}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" variant="contained" fullWidth>
                  Get Started
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          More Agents Coming Soon!
        </Typography>
        <Typography color="text.secondary">
          We're adding new specialized AI agents every week
        </Typography>
      </Box>
    </Container>
  );
}
