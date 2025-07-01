import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Rating,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Dialog,
  Skeleton,
  Alert,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Favorite,
  FavoriteBorder,
  Share,
  ShoppingCart,
  PlayArrow,
  Mic,
  DirectionsCar,
  Home,
  Watch,
  Code
} from '@mui/icons-material';
import SEOHead from '../../../components/SEO/SEOHead';
import DashboardLayout from '../../../components/Layout/DashboardLayout';
import PurchaseDialog from '../../../components/Marketplace/PurchaseDialog';
import ReviewsList from '../../../components/Marketplace/ReviewsList';
import RelatedItems from '../../../components/Marketplace/RelatedItems';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

interface Agent {
  id: string;
  name: string;
  description: string;
  long_description: string;
  category: string;
  subcategory?: string;
  capabilities: Array<{
    name: string;
    description: string;
    parameters?: Record<string, string>;
  }>;
  rating: number;
  reviews_count: number;
  price: number;
  icon: string;
  usage_count: number;
  last_updated: string;
  creator: {
    id: string;
    name: string;
    avatar?: string;
  };
  features: string[];
  requirements: string[];
  integrations: {
    voice: boolean;
    automotive: boolean;
    iot: boolean;
    api: boolean;
  };
  screenshots?: string[];
  video_demo?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`agent-tabpanel-${index}`}
      aria-labelledby={`agent-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AgentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, user } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAgent();
      checkPurchaseStatus();
      checkFavoriteStatus();
    }
  }, [id]);

  const fetchAgent = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/agents/${id}`);
      setAgent(response.data.data);
    } catch (error) {
      console.error('Error fetching agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPurchaseStatus = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get(`/agents/${id}/purchase-status`);
      setIsPurchased(response.data.data.purchased);
    } catch (error) {
      console.error('Error checking purchase status:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get(`/agents/${id}/favorite-status`);
      setIsFavorite(response.data.data.is_favorite);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    try {
      if (isFavorite) {
        await api.delete(`/agents/${id}/favorite`);
      } else {
        await api.post(`/agents/${id}/favorite`);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handlePurchase = () => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }
    setPurchaseDialogOpen(true);
  };

  const handlePurchaseComplete = () => {
    setPurchaseDialogOpen(false);
    setIsPurchased(true);
    router.push('/dashboard/ai-chat');
  };

  const handleTryDemo = () => {
    setDemoMode(true);
    router.push(`/dashboard/ai-chat?agent=${id}&demo=true`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: agent?.name,
        text: agent?.description,
        url: window.location.href,
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Skeleton variant="rectangular" height={400} />
        </Container>
      </DashboardLayout>
    );
  }

  if (!agent) {
    return (
      <DashboardLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">Agent not found</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SEOHead
        title={`${agent.name} - AI Agent | LOGOS ECOSYSTEM`}
        description={agent.description}
        keywords={`${agent.category}, ${agent.subcategory}, AI agent, ${agent.name}`}
        ogImage={agent.screenshots?.[0]}
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          {/* Left Column - Main Info */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 4, mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                <Avatar sx={{ width: 100, height: 100, fontSize: '3rem', bgcolor: 'primary.main' }}>
                  {agent.icon}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" gutterBottom>
                    {agent.name}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {agent.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Chip label={agent.category} color="primary" />
                    {agent.subcategory && <Chip label={agent.subcategory} variant="outlined" />}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating value={agent.rating} readOnly precision={0.5} />
                  <Typography variant="body2" color="text.secondary">
                    {agent.rating} ({agent.reviews_count} reviews)
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {agent.usage_count.toLocaleString()} uses
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                  <Tab label="Overview" />
                  <Tab label="Capabilities" />
                  <Tab label="Reviews" />
                  <Tab label="Documentation" />
                </Tabs>
              </Box>

              <TabPanel value={tabValue} index={0}>
                <Typography variant="body1" paragraph>
                  {agent.long_description}
                </Typography>

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Key Features
                </Typography>
                <List>
                  {agent.features.map((feature, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={feature} />
                    </ListItem>
                  ))}
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Integrations
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {agent.integrations.voice && (
                    <Chip icon={<Mic />} label="Voice Enabled" variant="outlined" />
                  )}
                  {agent.integrations.automotive && (
                    <Chip icon={<DirectionsCar />} label="Car Integration" variant="outlined" />
                  )}
                  {agent.integrations.iot && (
                    <Chip icon={<Home />} label="IoT Ready" variant="outlined" />
                  )}
                  {agent.integrations.api && (
                    <Chip icon={<Code />} label="API Access" variant="outlined" />
                  )}
                </Box>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" gutterBottom>
                  Agent Capabilities
                </Typography>
                <Grid container spacing={2}>
                  {agent.capabilities.map((capability, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {capability.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {capability.description}
                          </Typography>
                          {capability.parameters && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" color="text.secondary">
                                Parameters:
                              </Typography>
                              <List dense>
                                {Object.entries(capability.parameters).map(([key, value]) => (
                                  <ListItem key={key}>
                                    <ListItemText
                                      primary={key}
                                      secondary={value}
                                      primaryTypographyProps={{ variant: 'body2' }}
                                      secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <ReviewsList agentId={agent.id} />
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                <Typography variant="h6" gutterBottom>
                  Getting Started
                </Typography>
                <Typography variant="body1" paragraph>
                  Once you've purchased this agent, you can access it through:
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Web Dashboard"
                      secondary="Access via the AI Chat interface in your dashboard"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Voice Commands"
                      secondary="Say 'Hey LOGOS, connect me to {agent.name}'"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="API Integration"
                      secondary="Use our REST API or SDKs for programmatic access"
                    />
                  </ListItem>
                  {agent.integrations.automotive && (
                    <ListItem>
                      <ListItemText 
                        primary="Car Integration"
                        secondary="Available through your car's infotainment system"
                      />
                    </ListItem>
                  )}
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  System Requirements
                </Typography>
                <List>
                  {agent.requirements.map((req, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircle color="action" />
                      </ListItemIcon>
                      <ListItemText primary={req} />
                    </ListItem>
                  ))}
                </List>
              </TabPanel>
            </Paper>

            {/* Related Agents */}
            <RelatedItems 
              currentItemId={agent.id} 
              category={agent.category}
              itemType="agent"
            />
          </Grid>

          {/* Right Column - Purchase Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ position: 'sticky', top: 20 }}>
              <CardContent>
                <Typography variant="h4" gutterBottom>
                  ${agent.price}/month
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={isPurchased ? <PlayArrow /> : <ShoppingCart />}
                    onClick={isPurchased ? () => router.push('/dashboard/ai-chat') : handlePurchase}
                    disabled={isPurchased && user?.id === agent.creator.id}
                  >
                    {isPurchased ? 'Use Agent' : 'Purchase'}
                  </Button>
                  <IconButton onClick={toggleFavorite} color={isFavorite ? 'error' : 'default'}>
                    {isFavorite ? <Favorite /> : <FavoriteBorder />}
                  </IconButton>
                  <IconButton onClick={handleShare}>
                    <Share />
                  </IconButton>
                </Box>

                {!isPurchased && (
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    startIcon={<PlayArrow />}
                    onClick={handleTryDemo}
                    sx={{ mb: 3 }}
                  >
                    Try Demo (5 min)
                  </Button>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Created by
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar src={agent.creator.avatar} />
                  <Typography variant="body2">{agent.creator.name}</Typography>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Last updated: {new Date(agent.last_updated).toLocaleDateString()}
                </Typography>

                {isPurchased && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    You have access to this agent
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <PurchaseDialog
        open={purchaseDialogOpen}
        onClose={() => setPurchaseDialogOpen(false)}
        onComplete={handlePurchaseComplete}
        item={{
          id: agent.id,
          name: agent.name,
          price: agent.price,
          type: 'agent'
        }}
      />
    </DashboardLayout>
  );
}