import React from 'react'
import { NextPage } from 'next'
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Button,
  IconButton,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  AccountBalanceWallet,
  ShoppingCart,
  Store,
  Analytics as AnalyticsIcon,
  ArrowForward,
  Refresh,
  ControlCamera,
  SmartToy,
  CreditCard,
  Support,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import withAuth from '@/components/Auth/withAuth'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DashboardStats {
  wallet_balance: number
  total_sales: number
  total_purchases: number
  active_listings: number
  sales_trend: number
  purchase_trend: number
  ai_tokens_used: number
  ai_tokens_remaining: number
}

interface RecentActivity {
  id: string
  type: 'sale' | 'purchase' | 'listing' | 'wallet'
  title: string
  description: string
  amount?: number
  timestamp: string
  icon?: string
}

interface ChartData {
  date: string
  sales: number
  purchases: number
}

const DashboardPage: NextPage = () => {
  const router = useRouter()

  const { data: stats, isPending: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await axios.get<DashboardStats>('/api/dashboard/stats')
      return response.data
    },
  })

  const { data: recentActivity, isPending: activityLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await axios.get<RecentActivity[]>('/api/dashboard/activity')
      return response.data
    },
  })

  const { data: chartData, isPending: chartLoading } = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: async () => {
      const response = await axios.get<ChartData[]>('/api/dashboard/chart')
      return response.data
    },
  })

  const statCards = [
    {
      title: 'Wallet Balance',
      value: `$${stats?.wallet_balance.toFixed(2) || '0.00'}`,
      icon: <AccountBalanceWallet />,
      color: '#2196f3',
      trend: null,
      action: () => router.push('/dashboard/wallet'),
    },
    {
      title: 'Total Sales',
      value: `$${stats?.total_sales.toFixed(2) || '0.00'}`,
      icon: <TrendingUp />,
      color: '#4caf50',
      trend: stats?.sales_trend || 0,
      action: () => router.push('/dashboard/sales'),
    },
    {
      title: 'Total Purchases',
      value: `$${stats?.total_purchases.toFixed(2) || '0.00'}`,
      icon: <ShoppingCart />,
      color: '#ff9800',
      trend: stats?.purchase_trend || 0,
      action: () => router.push('/dashboard/purchases'),
    },
    {
      title: 'Active Listings',
      value: stats?.active_listings || 0,
      icon: <Store />,
      color: '#9c27b0',
      trend: null,
      action: () => router.push('/dashboard/items'),
    },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <TrendingUp />
      case 'purchase':
        return <ShoppingCart />
      case 'listing':
        return <Store />
      case 'wallet':
        return <AccountBalanceWallet />
      default:
        return <AnalyticsIcon />
    }
  }

  return (
    <DashboardLayout>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4">Dashboard Overview</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<ControlCamera />}
              onClick={() => router.push('/dashboard/control-panel')}
            >
              Panel de Control
            </Button>
            <IconButton onClick={() => refetchStats()}>
              <Refresh />
            </IconButton>
          </Box>
        </Box>

        {/* Quick Access Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={() => router.push('/dashboard/products')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SmartToy sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h6">Mis Productos AI</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Gestiona tus bots
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={() => router.push('/dashboard/subscription')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CreditCard sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h6">Suscripción</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Plan y pagos
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={() => router.push('/dashboard/support')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Support sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h6">Soporte</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Centro de ayuda
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s',
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={() => router.push('/dashboard/analytics')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AnalyticsIcon sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h6">Analytics</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Métricas y datos
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {statCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
                onClick={stat.action}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Avatar sx={{ bgcolor: stat.color, width: 48, height: 48 }}>
                      {stat.icon}
                    </Avatar>
                    {stat.trend !== null && (
                      <Chip
                        label={`${stat.trend > 0 ? '+' : ''}${stat.trend}%`}
                        color={stat.trend > 0 ? 'success' : 'error'}
                        size="small"
                        icon={stat.trend > 0 ? <TrendingUp /> : <TrendingDown />}
                      />
                    )}
                  </Box>
                  <Typography variant="h5" sx={{ mb: 1 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Sales & Purchases Overview
                </Typography>
                {chartLoading ? (
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">Loading chart...</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stackId="1"
                        stroke="#4caf50"
                        fill="#4caf50"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="purchases"
                        stackId="1"
                        stroke="#ff9800"
                        fill="#ff9800"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">AI Token Usage</Typography>
                  <Button
                    size="small"
                    endIcon={<ArrowForward />}
                    onClick={() => router.push('/dashboard/ai-chat')}
                  >
                    AI Chat
                  </Button>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Used</Typography>
                    <Typography variant="body2">
                      {stats?.ai_tokens_used || 0} / {(stats?.ai_tokens_used || 0) + (stats?.ai_tokens_remaining || 0)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={
                      stats
                        ? (stats.ai_tokens_used / (stats.ai_tokens_used + stats.ai_tokens_remaining)) * 100
                        : 0
                    }
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {stats?.ai_tokens_remaining || 0} tokens remaining
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Recent Activity</Typography>
                  <Button size="small" endIcon={<ArrowForward />}>
                    View All
                  </Button>
                </Box>
                {activityLoading ? (
                  <Typography color="text.secondary">Loading activity...</Typography>
                ) : (
                  <List>
                    {recentActivity?.slice(0, 5).map((activity) => (
                      <ListItem key={activity.id} sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {getActivityIcon(activity.type)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={activity.title}
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {activity.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                • {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                              </Typography>
                            </Box>
                          }
                        />
                        {activity.amount && (
                          <Typography variant="subtitle1" color={activity.type === 'sale' ? 'success.main' : 'text.primary'}>
                            ${activity.amount.toFixed(2)}
                          </Typography>
                        )}
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </DashboardLayout>
  )
}

export default withAuth(DashboardPage)