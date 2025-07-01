import React, { useState } from 'react';
import { NextPage } from 'next';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Tooltip,
  Badge,
  LinearProgress,
  Alert,
  Skeleton,
  useTheme,
  alpha
} from '@mui/material';
import {
  Add,
  Search,
  GridView,
  ViewList,
  MoreVert,
  PlayArrow,
  Stop,
  Settings,
  Analytics,
  Code,
  CloudUpload,
  ContentCopy,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  SmartToy,
  Psychology,
  AutoAwesome,
  Speed,
  Api
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import withAuth from '@/components/Auth/withAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI } from '@/services/api/products';
import { format } from 'date-fns';
import { ProductStatus, ProductType } from '@/types/product';

const ProductsManagement: NextPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ProductType | ''>('');
  const [filterStatus, setFilterStatus] = useState<ProductStatus | ''>('');
  const [menuAnchor, setMenuAnchor] = useState<{
    element: HTMLElement | null;
    productId: string;
  }>({ element: null, productId: '' });

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', filterType, filterStatus],
    queryFn: () => productsAPI.getProducts({
      type: filterType || undefined,
      status: filterStatus || undefined,
      limit: 50
    })
  });

  // Product actions mutations
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ productId, newStatus }: { productId: string; newStatus: ProductStatus }) => {
      return productsAPI.updateProduct(productId, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const duplicateProductMutation = useMutation({
    mutationFn: async ({ productId, name }: { productId: string; name: string }) => {
      return productsAPI.duplicateProduct(productId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: productsAPI.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const getProductIcon = (type: ProductType) => {
    const icons = {
      'expert-bot': <SmartToy />,
      'ai-assistant': <Psychology />,
      'automation-agent': <AutoAwesome />,
      'analytics-bot': <Analytics />,
      'custom-solution': <Code />
    };
    return icons[type] || <SmartToy />;
  };

  const getStatusColor = (status: ProductStatus) => {
    const colors = {
      active: 'success',
      inactive: 'default',
      suspended: 'warning',
      pending: 'info',
      error: 'error',
      maintenance: 'warning'
    };
    return colors[status] || 'default';
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'degraded':
        return <Warning color="warning" />;
      case 'down':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, productId: string) => {
    setMenuAnchor({ element: event.currentTarget, productId });
  };

  const handleMenuClose = () => {
    setMenuAnchor({ element: null, productId: '' });
  };

  const handleProductAction = (action: string) => {
    const productId = menuAnchor.productId;
    handleMenuClose();

    switch (action) {
      case 'configure':
        router.push(`/dashboard/products/${productId}/configure`);
        break;
      case 'metrics':
        router.push(`/dashboard/products/${productId}/metrics`);
        break;
      case 'logs':
        router.push(`/dashboard/products/${productId}/logs`);
        break;
      case 'duplicate':
        const newName = prompt('Nombre para el producto duplicado:');
        if (newName) {
          duplicateProductMutation.mutate({ productId, name: newName });
        }
        break;
      case 'delete':
        if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
          deleteProductMutation.mutate(productId);
        }
        break;
    }
  };

  const filteredProducts = productsData?.products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const productTypeOptions: { value: ProductType | ''; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'expert-bot', label: 'Expert Bot' },
    { value: 'ai-assistant', label: 'AI Assistant' },
    { value: 'automation-agent', label: 'Automation Agent' },
    { value: 'analytics-bot', label: 'Analytics Bot' },
    { value: 'custom-solution', label: 'Custom Solution' }
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <Container maxWidth="xl">
          <Box sx={{ py: 4 }}>
            <Skeleton variant="text" width={300} height={40} />
            <Grid container spacing={3} sx={{ mt: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Skeleton variant="rectangular" height={250} />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1">
              Mis Productos LOGOS AI
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/dashboard/products/new')}
            >
              Crear Producto
            </Button>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Gestiona y configura tus bots y servicios de inteligencia artificial
          </Typography>
        </Box>

        {/* Filters and Search */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Tipo"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ProductType | '')}
              >
                {productTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Estado"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ProductStatus | '')}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="active">Activo</MenuItem>
                <MenuItem value="inactive">Inactivo</MenuItem>
                <MenuItem value="suspended">Suspendido</MenuItem>
                <MenuItem value="pending">Pendiente</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="maintenance">Mantenimiento</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newMode) => newMode && setViewMode(newMode)}
                aria-label="view mode"
                fullWidth
              >
                <ToggleButton value="grid" aria-label="grid view">
                  <GridView />
                </ToggleButton>
                <ToggleButton value="list" aria-label="list view">
                  <ViewList />
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Paper>

        {/* Products Grid/List */}
        {filteredProducts.length > 0 ? (
          <Grid container spacing={3}>
            {filteredProducts.map((product) => (
              <Grid item xs={12} sm={viewMode === 'grid' ? 6 : 12} md={viewMode === 'grid' ? 4 : 12} key={product.id}>
                <Card
                  sx={{
                    height: viewMode === 'grid' ? '100%' : 'auto',
                    display: 'flex',
                    flexDirection: viewMode === 'grid' ? 'column' : 'row',
                    position: 'relative',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[8]
                    }
                  }}
                >
                  {viewMode === 'list' && (
                    <Box
                      sx={{
                        width: 200,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 80,
                          height: 80,
                          bgcolor: theme.palette.primary.main
                        }}
                      >
                        {getProductIcon(product.type)}
                      </Avatar>
                    </Box>
                  )}
                  
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      {viewMode === 'grid' && (
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            mr: 2
                          }}
                        >
                          {getProductIcon(product.type)}
                        </Avatar>
                      )}
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {product.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={product.type}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={product.status}
                            size="small"
                            color={getStatusColor(product.status) as any}
                          />
                          <Tooltip title={`${product.deployment.health.uptime}% uptime`}>
                            <Chip
                              icon={getHealthIcon(product.deployment.health.status) as any}
                              label={product.deployment.health.status}
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, product.id)}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Typography variant="body2" color="text.secondary" paragraph>
                      {product.description}
                    </Typography>

                    {/* Metrics Summary */}
                    <Grid container spacing={2}>
                      <Grid item xs={viewMode === 'grid' ? 12 : 3}>
                        <Box sx={{ textAlign: viewMode === 'grid' ? 'left' : 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            API Calls
                          </Typography>
                          <Typography variant="h6">
                            {product.metrics.usage.totalRequests.toLocaleString()}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={viewMode === 'grid' ? 12 : 3}>
                        <Box sx={{ textAlign: viewMode === 'grid' ? 'left' : 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            Latencia
                          </Typography>
                          <Typography variant="h6">
                            {product.metrics.performance.latency}ms
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={viewMode === 'grid' ? 12 : 3}>
                        <Box sx={{ textAlign: viewMode === 'grid' ? 'left' : 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            Costo Mensual
                          </Typography>
                          <Typography variant="h6">
                            ${product.metrics.costs.currentMonth}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={viewMode === 'grid' ? 12 : 3}>
                        <Box sx={{ textAlign: viewMode === 'grid' ? 'left' : 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            Última Actualización
                          </Typography>
                          <Typography variant="body2">
                            {format(new Date(product.updatedAt), 'dd/MM/yyyy')}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* API Endpoint */}
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Endpoint
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            flexGrow: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {product.deployment.endpoint}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => navigator.clipboard.writeText(product.deployment.endpoint)}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ justifyContent: viewMode === 'grid' ? 'space-between' : 'flex-end' }}>
                    <Button
                      size="small"
                      startIcon={product.status === 'active' ? <Stop /> : <PlayArrow />}
                      onClick={() => toggleStatusMutation.mutate({
                        productId: product.id,
                        newStatus: product.status === 'active' ? 'inactive' : 'active'
                      })}
                    >
                      {product.status === 'active' ? 'Detener' : 'Activar'}
                    </Button>
                    <Box>
                      <Button
                        size="small"
                        startIcon={<Settings />}
                        onClick={() => router.push(`/dashboard/products/${product.id}/configure`)}
                      >
                        Configurar
                      </Button>
                      <Button
                        size="small"
                        startIcon={<Analytics />}
                        onClick={() => router.push(`/dashboard/products/${product.id}/metrics`)}
                      >
                        Métricas
                      </Button>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper sx={{ p: 8, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              No tienes productos configurados
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Crea tu primer bot o servicio de IA para comenzar
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<CloudUpload />}
              onClick={() => router.push('/dashboard/products/new')}
            >
              Crear Primer Producto
            </Button>
          </Paper>
        )}

        {/* Product Actions Menu */}
        <Menu
          anchorEl={menuAnchor.element}
          open={Boolean(menuAnchor.element)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => handleProductAction('configure')}>
            <Settings sx={{ mr: 1 }} /> Configurar
          </MenuItem>
          <MenuItem onClick={() => handleProductAction('metrics')}>
            <Analytics sx={{ mr: 1 }} /> Ver Métricas
          </MenuItem>
          <MenuItem onClick={() => handleProductAction('logs')}>
            <Api sx={{ mr: 1 }} /> Ver Logs
          </MenuItem>
          <MenuItem onClick={() => handleProductAction('duplicate')}>
            <ContentCopy sx={{ mr: 1 }} /> Duplicar
          </MenuItem>
          <MenuItem onClick={() => handleProductAction('delete')} sx={{ color: 'error.main' }}>
            <ErrorIcon sx={{ mr: 1 }} /> Eliminar
          </MenuItem>
        </Menu>
      </Container>
    </DashboardLayout>
  );
};

export default withAuth(ProductsManagement);