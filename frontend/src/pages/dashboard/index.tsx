import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Tab,
  Tabs,
  Alert,
  Skeleton,
  useTheme,
  useMediaQuery,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountBalance,
  Receipt,
  CreditCard,
  Settings,
  Support,
  Analytics,
  CloudQueue,
  Security,
  Language,
  NotificationsActive,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Schedule,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Add,
  Edit,
  Visibility,
  Download,
  Send,
  MoreVert,
  Refresh,
  AutoAwesome,
  SmartToy,
  IntegrationInstructions,
  DocumentScanner,
  VerifiedUser,
  Speed,
  DataUsage
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import Layout from '@/components/Layout';
import { api } from '@/services/api';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface DashboardData {
  overview: {
    totalRevenue: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
    totalInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    activeProducts: number;
    apiUsage: number;
    supportTickets: number;
  };
  revenueChart: {
    labels: string[];
    data: number[];
  };
  usageChart: {
    labels: string[];
    data: any[];
  };
  recentActivity: any[];
  upcomingInvoices: any[];
  activeIntegrations: any[];
  aiMetrics: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    tokensUsed: number;
  };
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
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdvancedDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useNotification();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/dashboard/advanced');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const speedDialActions = [
    { icon: <Receipt />, name: 'New Invoice', action: () => router.push('/dashboard/invoices/new') },
    { icon: <SmartToy />, name: 'Configure AI Bot', action: () => router.push('/dashboard/products/new') },
    { icon: <Support />, name: 'Create Ticket', action: () => router.push('/dashboard/support/new') },
    { icon: <CreditCard />, name: 'Add Payment Method', action: () => router.push('/dashboard/billing') },
  ];

  if (loading) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} md={6} lg={3} key={i}>
                <Skeleton variant="rectangular" height={200} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Layout>
    );
  }

  const revenueChartData = {
    labels: dashboardData?.revenueChart.labels || [],
    datasets: [
      {
        label: 'Revenue',
        data: dashboardData?.revenueChart.data || [],
        borderColor: theme.palette.primary.main,
        backgroundColor: `${theme.palette.primary.main}20`,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const usageChartData = {
    labels: ['API Calls', 'Storage', 'Bandwidth', 'AI Tokens'],
    datasets: [
      {
        data: [
          dashboardData?.overview.apiUsage || 0,
          75, // Example data
          60, // Example data
          dashboardData?.aiMetrics.tokensUsed || 0,
        ],
        backgroundColor: [
          theme.palette.primary.main,
          theme.palette.secondary.main,
          theme.palette.warning.main,
          theme.palette.info.main,
        ],
      },
    ],
  };

  return (
    <Layout>
      <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Welcome back, {user?.username || user?.email}!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Here's what's happening with your LOGOS AI ecosystem today.
            </Typography>
          </Box>
          <Box>
            <Tooltip title="Refresh data">
              <IconButton onClick={fetchDashboardData} disabled={refreshing}>
                <Refresh className={refreshing ? 'rotating' : ''} />
              </IconButton>
            </Tooltip>
            <Badge badgeContent={unreadCount} color="error">
              <IconButton onClick={() => router.push('/dashboard/notifications')}>
                <NotificationsActive />
              </IconButton>
            </Badge>
          </Box>
        </Box>

        {/* Quick Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card hover-scale">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <AttachMoney />
                  </Avatar>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Monthly Revenue
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(dashboardData?.overview.monthlyRevenue || 0)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUp color="success" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="success.main">
                    +12.5% from last month
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card hover-scale">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                    <SmartToy />
                  </Avatar>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Active AI Bots
                    </Typography>
                    <Typography variant="h5">
                      {dashboardData?.overview.activeProducts || 0}
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label="All systems operational" 
                  color="success" 
                  size="small" 
                  icon={<CheckCircle />}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card hover-scale">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <Receipt />
                  </Avatar>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Pending Invoices
                    </Typography>
                    <Typography variant="h5">
                      {dashboardData?.overview.pendingInvoices || 0}
                    </Typography>
                  </Box>
                </Box>
                {dashboardData?.overview.overdueInvoices ? (
                  <Chip 
                    label={`${dashboardData.overview.overdueInvoices} overdue`} 
                    color="error" 
                    size="small" 
                    icon={<Warning />}
                  />
                ) : (
                  <Chip 
                    label="All up to date" 
                    color="success" 
                    size="small" 
                    icon={<CheckCircle />}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card hover-scale">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                    <Speed />
                  </Avatar>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      API Success Rate
                    </Typography>
                    <Typography variant="h5">
                      {dashboardData?.aiMetrics.successRate || 0}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={dashboardData?.aiMetrics.successRate || 0} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<DashboardIcon />} label="Overview" />
            <Tab icon={<SmartToy />} label="AI Products" />
            <Tab icon={<AccountBalance />} label="Accounting" />
            <Tab icon={<Analytics />} label="Analytics" />
            <Tab icon={<IntegrationInstructions />} label="Integrations" />
            <Tab icon={<Settings />} label="Settings" />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        <TabPanel value={selectedTab} index={0}>
          <Grid container spacing={3}>
            {/* Revenue Chart */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue Trend
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Line 
                      data={revenueChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        }
                      }} 
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Usage Chart */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Resource Usage
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Doughnut 
                      data={usageChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' }
                        }
                      }} 
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Activity */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Recent Activity</Typography>
                    <Button size="small" onClick={() => router.push('/dashboard/activity')}>
                      View All
                    </Button>
                  </Box>
                  <List>
                    {dashboardData?.recentActivity.slice(0, 5).map((activity, index) => (
                      <React.Fragment key={activity.id}>
                        <ListItem alignItems="flex-start">
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                              {activity.icon || <AutoAwesome />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={activity.title}
                            secondary={
                              <>
                                <Typography component="span" variant="body2" color="text.primary">
                                  {activity.description}
                                </Typography>
                                {' — '}{formatDate(activity.timestamp)}
                              </>
                            }
                          />
                        </ListItem>
                        {index < 4 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Upcoming Invoices */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Upcoming Invoices</Typography>
                    <Button size="small" onClick={() => router.push('/dashboard/invoices')}>
                      View All
                    </Button>
                  </Box>
                  <List>
                    {dashboardData?.upcomingInvoices.slice(0, 5).map((invoice, index) => (
                      <React.Fragment key={invoice.id}>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                              <Receipt />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={`Invoice #${invoice.number}`}
                            secondary={`Due ${formatDate(invoice.dueDate)} - ${formatCurrency(invoice.amount)}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}>
                              <Visibility />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < 4 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {/* AI Products Tab */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Configure and manage your LOGOS AI Expert Bots here. Each bot can be customized for specific tasks and integrated with your applications.
              </Alert>
            </Grid>
            {/* Product cards would go here */}
          </Grid>
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {/* Accounting Tab */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Accounting Overview
                  </Typography>
                  {/* Accounting content */}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          {/* Analytics Tab */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Advanced Analytics
                  </Typography>
                  {/* Analytics content */}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={selectedTab} index={4}>
          {/* Integrations Tab */}
          <Grid container spacing={3}>
            {dashboardData?.activeIntegrations.map((integration) => (
              <Grid item xs={12} sm={6} md={4} key={integration.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar src={integration.logo} sx={{ mr: 2 }}>
                        {integration.name[0]}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">{integration.name}</Typography>
                        <Chip
                          label={integration.status}
                          color={integration.status === 'connected' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {integration.description}
                    </Typography>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => router.push(`/dashboard/integrations/${integration.id}`)}
                    >
                      Configure
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={selectedTab} index={5}>
          {/* Settings Tab */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Account Settings
                  </Typography>
                  <List>
                    <ListItem button onClick={() => router.push('/dashboard/settings/profile')}>
                      <ListItemAvatar>
                        <Avatar>
                          <AccountBalance />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary="Profile Settings" secondary="Manage your account information" />
                    </ListItem>
                    <ListItem button onClick={() => router.push('/dashboard/settings/security')}>
                      <ListItemAvatar>
                        <Avatar>
                          <Security />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary="Security" secondary="Two-factor authentication and password" />
                    </ListItem>
                    <ListItem button onClick={() => router.push('/dashboard/settings/billing')}>
                      <ListItemAvatar>
                        <Avatar>
                          <CreditCard />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary="Billing" secondary="Payment methods and invoices" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Speed Dial for Quick Actions */}
        <SpeedDial
          ariaLabel="Quick actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
          onClose={() => setSpeedDialOpen(false)}
          onOpen={() => setSpeedDialOpen(true)}
          open={speedDialOpen}
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              tooltipOpen
              onClick={() => {
                action.action();
                setSpeedDialOpen(false);
              }}
            />
          ))}
        </SpeedDial>
      </Box>

      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }
        
        .glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .hover-scale {
          transition: transform 0.2s ease-in-out;
        }
        
        .hover-scale:hover {
          transform: scale(1.02);
        }
        
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .rotating {
          animation: rotate 1s linear infinite;
        }
      `}</style>
    </Layout>
  );
}