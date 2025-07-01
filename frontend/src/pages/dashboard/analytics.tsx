import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Paper,
  Divider,
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Refresh,
  Download,
  Info,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { api } from '../../services/api';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  suffix?: string;
  prefix?: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [activeTab, setActiveTab] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  
  // Metrics state
  const [summaryMetrics, setSummaryMetrics] = useState<MetricCard[]>([]);
  const [aiAgentMetrics, setAiAgentMetrics] = useState<any>(null);
  const [transactionMetrics, setTransactionMetrics] = useState<any>(null);
  const [userMetrics, setUserMetrics] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  
  // Real-time data
  const [realtimeData, setRealtimeData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchRealtimeData, 5000); // Update every 5 seconds
    setRefreshInterval(interval as any);
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/analytics/dashboard?range=${timeRange}`);
      const data = response.data;
      
      // Process summary metrics
      setSummaryMetrics([
        {
          title: 'Total Revenue',
          value: data.summary.totalRevenue,
          change: data.summary.revenueChange,
          trend: data.summary.revenueChange > 0 ? 'up' : 'down',
          prefix: '$',
        },
        {
          title: 'Active Users',
          value: data.summary.activeUsers,
          change: data.summary.userChange,
          trend: data.summary.userChange > 0 ? 'up' : 'down',
        },
        {
          title: 'AI Requests',
          value: data.summary.aiRequests,
          change: data.summary.aiRequestChange,
          trend: data.summary.aiRequestChange > 0 ? 'up' : 'down',
        },
        {
          title: 'Success Rate',
          value: data.summary.successRate,
          change: data.summary.successRateChange,
          trend: data.summary.successRateChange > 0 ? 'up' : 'down',
          suffix: '%',
        },
      ]);
      
      setAiAgentMetrics(data.aiAgents);
      setTransactionMetrics(data.transactions);
      setUserMetrics(data.users);
      setSystemHealth(data.systemHealth);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeData = async () => {
    try {
      const response = await api.get('/analytics/realtime');
      setRealtimeData(response.data);
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/analytics/export', {
        params: { range: timeRange },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${timeRange}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  };

  const renderMetricCard = (metric: MetricCard) => (
    <Card>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {metric.title}
        </Typography>
        <Box display="flex" alignItems="baseline" mb={1}>
          <Typography variant="h4" component="h2">
            {metric.prefix}{typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}{metric.suffix}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center">
          {metric.trend === 'up' ? (
            <TrendingUp color="success" fontSize="small" />
          ) : metric.trend === 'down' ? (
            <TrendingDown color="error" fontSize="small" />
          ) : null}
          <Typography
            variant="body2"
            color={metric.trend === 'up' ? 'success.main' : 'error.main'}
            ml={0.5}
          >
            {Math.abs(metric.change)}%
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  const renderAIAgentAnalytics = () => {
    if (!aiAgentMetrics) return null;

    const chartData = aiAgentMetrics.timeline.map((item: any) => ({
      time: format(new Date(item.timestamp), 'HH:mm'),
      ...item.agents,
    }));

    const pieData = Object.entries(aiAgentMetrics.distribution).map(([name, value]) => ({
      name,
      value,
    }));

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              AI Agent Request Timeline
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                {Object.keys(aiAgentMetrics.agentTypes).map((agent, index) => (
                  <Line
                    key={agent}
                    type="monotone"
                    dataKey={agent}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Agent Usage Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Agent Performance Metrics
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(aiAgentMetrics.performance).map(([agent, metrics]: [string, any]) => (
                <Grid item xs={12} sm={6} md={3} key={agent}>
                  <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      {agent}
                    </Typography>
                    <Typography variant="h6">
                      {metrics.avgResponseTime.toFixed(2)}s
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Response Time
                    </Typography>
                    <Box mt={1}>
                      <LinearProgress
                        variant="determinate"
                        value={metrics.successRate}
                        color={metrics.successRate > 95 ? 'success' : 'warning'}
                      />
                      <Typography variant="caption">
                        {metrics.successRate.toFixed(1)}% Success Rate
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderTransactionAnalytics = () => {
    if (!transactionMetrics) return null;

    const volumeData = transactionMetrics.volumeTimeline.map((item: any) => ({
      time: format(new Date(item.timestamp), 'HH:mm'),
      volume: item.volume,
      count: item.count,
    }));

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Transaction Volume
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="volume"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                  name="Volume ($)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="count"
                  stroke="#82ca9d"
                  name="Count"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Payment Methods
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transactionMetrics.paymentMethods}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="volume" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Top Products
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Product</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Category</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Sales</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Revenue</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionMetrics.topProducts.map((product: any, index: number) => (
                    <tr key={index}>
                      <td style={{ padding: '8px' }}>{product.name}</td>
                      <td style={{ padding: '8px' }}>{product.category}</td>
                      <td style={{ textAlign: 'right', padding: '8px' }}>{product.sales}</td>
                      <td style={{ textAlign: 'right', padding: '8px' }}>${product.revenue.toFixed(2)}</td>
                      <td style={{ textAlign: 'center', padding: '8px' }}>
                        {product.trend > 0 ? (
                          <Chip
                            size="small"
                            icon={<TrendingUp />}
                            label={`+${product.trend}%`}
                            color="success"
                          />
                        ) : (
                          <Chip
                            size="small"
                            icon={<TrendingDown />}
                            label={`${product.trend}%`}
                            color="error"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderUserAnalytics = () => {
    if (!userMetrics) return null;

    const activityData = userMetrics.activityTimeline.map((item: any) => ({
      time: format(new Date(item.timestamp), 'HH:mm'),
      active: item.activeUsers,
      new: item.newUsers,
    }));

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              User Activity
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="active" stroke="#8884d8" name="Active Users" />
                <Line type="monotone" dataKey="new" stroke="#82ca9d" name="New Users" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              User Segments
            </Typography>
            <Box>
              {Object.entries(userMetrics.segments).map(([segment, data]: [string, any]) => (
                <Box key={segment} mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">{segment}</Typography>
                    <Typography variant="body2">{data.count}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(data.count / userMetrics.totalUsers) * 100}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Feature Usage
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userMetrics.featureUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="feature" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="usage" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderSystemHealth = () => {
    if (!systemHealth) return null;

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'healthy':
          return <CheckCircle color="success" />;
        case 'warning':
          return <Warning color="warning" />;
        case 'error':
          return <ErrorIcon color="error" />;
        default:
          return <Info color="info" />;
      }
    };

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              System Health Overview
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(systemHealth.services).map(([service, status]: [string, any]) => (
                <Grid item xs={12} sm={6} md={3} key={service}>
                  <Box
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: status.status === 'healthy' ? 'success.main' : 'error.main',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">{service}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {status.responseTime}ms
                      </Typography>
                    </Box>
                    {getStatusIcon(status.status)}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Resource Usage
            </Typography>
            <Box>
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  CPU Usage
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={systemHealth.resources.cpu}
                  color={systemHealth.resources.cpu > 80 ? 'error' : 'primary'}
                />
                <Typography variant="caption">{systemHealth.resources.cpu}%</Typography>
              </Box>
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Memory Usage
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={systemHealth.resources.memory}
                  color={systemHealth.resources.memory > 80 ? 'error' : 'primary'}
                />
                <Typography variant="caption">{systemHealth.resources.memory}%</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Disk Usage
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={systemHealth.resources.disk}
                  color={systemHealth.resources.disk > 80 ? 'error' : 'primary'}
                />
                <Typography variant="caption">{systemHealth.resources.disk}%</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Alerts
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {systemHealth.alerts.map((alert: any, index: number) => (
                <Box
                  key={index}
                  sx={{
                    p: 1,
                    mb: 1,
                    bgcolor: alert.severity === 'error' ? 'error.light' : 'warning.light',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {alert.title}
                  </Typography>
                  <Typography variant="caption">
                    {format(new Date(alert.timestamp), 'MMM dd, HH:mm')}
                  </Typography>
                  <Typography variant="body2">{alert.message}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  return (
    <DashboardLayout>
      <Box sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Analytics Dashboard</Typography>
          <Box display="flex" gap={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="1h">Last Hour</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchAnalytics}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExport}
            >
              Export
            </Button>
          </Box>
        </Box>

        {loading ? (
          <LinearProgress />
        ) : (
          <>
            <Grid container spacing={3} mb={3}>
              {summaryMetrics.map((metric, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  {renderMetricCard(metric)}
                </Grid>
              ))}
            </Grid>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                <Tab label="AI Agents" />
                <Tab label="Transactions" />
                <Tab label="Users" />
                <Tab label="System Health" />
              </Tabs>
            </Box>

            <Box>
              {activeTab === 0 && renderAIAgentAnalytics()}
              {activeTab === 1 && renderTransactionAnalytics()}
              {activeTab === 2 && renderUserAnalytics()}
              {activeTab === 3 && renderSystemHealth()}
            </Box>

            {realtimeData && (
              <Box mt={3}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Real-time Activity
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Box textAlign="center">
                        <Typography variant="h3" color="primary">
                          {realtimeData.activeUsers}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Active Users Now
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box textAlign="center">
                        <Typography variant="h3" color="success.main">
                          {realtimeData.requestsPerSecond}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Requests/Second
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box textAlign="center">
                        <Typography variant="h3" color="info.main">
                          {realtimeData.avgResponseTime}ms
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Avg Response Time
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            )}
          </>
        )}
      </Box>
    </DashboardLayout>
  );
};

export default AnalyticsDashboard;