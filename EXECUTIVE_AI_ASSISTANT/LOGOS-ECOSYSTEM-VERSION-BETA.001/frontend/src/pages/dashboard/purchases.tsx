import React, { useState } from 'react'
import { NextPage } from 'next'
import {
  Container,
  Box,
  Typography,
  Tab,
  Tabs,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Skeleton,
  Alert,
} from '@mui/material'
import {
  ShoppingBag,
  LocalShipping,
  CheckCircle,
  Cancel,
  MoreVert,
  Search,
  Receipt,
  Message,
  Star,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/router'
import { DashboardLayout } from '@/components/Layout/DashboardLayout'
import { withAuth } from '@/components/Auth/withAuth'

interface Purchase {
  id: string
  item: {
    id: string
    title: string
    price: number
    images: string[]
    seller: {
      id: string
      username: string
      avatar?: string
    }
  }
  quantity: number
  total_price: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  tracking_number?: string
  notes?: string
  created_at: string
  updated_at: string
}

const PurchasesPage: NextPage = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedPurchase, setSelectedPurchase] = useState<string | null>(null)

  const { data: purchases, isPending: isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const response = await axios.get<Purchase[]>('/api/marketplace/purchases')
      return response.data
    },
  })

  const statusTabs = [
    { label: 'All Orders', value: 'all' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'processing':
        return 'info'
      case 'shipped':
        return 'primary'
      case 'delivered':
        return 'success'
      case 'cancelled':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <ShoppingBag />
      case 'shipped':
        return <LocalShipping />
      case 'delivered':
        return <CheckCircle />
      case 'cancelled':
        return <Cancel />
      default:
        return <ShoppingBag />
    }
  }

  const filteredPurchases = purchases?.filter(purchase => {
    const matchesTab = activeTab === 0 || purchase.status === statusTabs[activeTab].value
    const matchesSearch = purchase.item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.item.seller.username.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesTab && matchesSearch
  }) || []

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, purchaseId: string) => {
    setAnchorEl(event.currentTarget)
    setSelectedPurchase(purchaseId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedPurchase(null)
  }

  const handleViewDetails = () => {
    if (selectedPurchase) {
      router.push(`/dashboard/purchases/${selectedPurchase}`)
    }
    handleMenuClose()
  }

  const handleContactSeller = () => {
    // TODO: Implement contact seller functionality
    handleMenuClose()
  }

  const handleViewItem = (itemId: string) => {
    router.push(`/marketplace/item/${itemId}`)
  }

  return (
    <DashboardLayout>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 1 }}>
            My Purchases
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track and manage your marketplace orders
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Card sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {statusTabs.map((tab, index) => (
              <Tab key={tab.value} label={tab.label} />
            ))}
          </Tabs>
        </Card>

        {isLoading ? (
          <Grid container spacing={3}>
            {[...Array(3)].map((_, index) => (
              <Grid item xs={12} key={index}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Skeleton variant="rectangular" width={100} height={100} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="40%" />
                        <Skeleton variant="text" width="30%" />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : filteredPurchases.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <ShoppingBag sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No orders found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm ? 'Try adjusting your search terms' : 'Start shopping in the marketplace'}
              </Typography>
              <Button
                variant="contained"
                onClick={() => router.push('/marketplace')}
              >
                Browse Marketplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {filteredPurchases.map((purchase) => (
              <Grid item xs={12} key={purchase.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Avatar
                        src={purchase.item.images[0]}
                        variant="rounded"
                        sx={{ width: 100, height: 100 }}
                      />
                      
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography
                            variant="h6"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => handleViewItem(purchase.item.id)}
                          >
                            {purchase.item.title}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, purchase.id)}
                          >
                            <MoreVert />
                          </IconButton>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Chip
                            icon={getStatusIcon(purchase.status)}
                            label={purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                            color={getStatusColor(purchase.status) as any}
                            size="small"
                          />
                          <Typography variant="body2" color="text.secondary">
                            Order #{purchase.id.slice(0, 8)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatDistanceToNow(new Date(purchase.created_at), { addSuffix: true })}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Typography variant="body2">
                            Quantity: {purchase.quantity}
                          </Typography>
                          <Typography variant="body2">
                            Total: ${purchase.total_price.toFixed(2)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Sold by {purchase.item.seller.username}
                          </Typography>
                        </Box>
                        
                        {purchase.tracking_number && (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            Tracking: {purchase.tracking_number}
                          </Alert>
                        )}
                        
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          {purchase.status === 'delivered' && (
                            <Button
                              size="small"
                              startIcon={<Star />}
                              variant="outlined"
                            >
                              Leave Review
                            </Button>
                          )}
                          {purchase.status === 'shipped' && (
                            <Button
                              size="small"
                              startIcon={<LocalShipping />}
                              variant="outlined"
                            >
                              Track Package
                            </Button>
                          )}
                          <Button
                            size="small"
                            startIcon={<Receipt />}
                            variant="outlined"
                            onClick={() => router.push(`/dashboard/purchases/${purchase.id}`)}
                          >
                            View Details
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleViewDetails}>
            <Receipt sx={{ mr: 1 }} /> View Details
          </MenuItem>
          <MenuItem onClick={handleContactSeller}>
            <Message sx={{ mr: 1 }} /> Contact Seller
          </MenuItem>
        </Menu>
      </Container>
    </DashboardLayout>
  )
}

export default withAuth(PurchasesPage)