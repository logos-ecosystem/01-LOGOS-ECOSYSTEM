import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Rating,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Verified as VerifiedIcon,
  ShoppingCart as ShoppingCartIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MarketplaceItem } from '../../types/marketplace';
import { marketplaceApi } from '../../services/api/marketplace';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/formatters';

interface ItemCardProps {
  item: MarketplaceItem;
  loading?: boolean;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, loading = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const toggleFavoriteMutation = useMutation({
    mutationFn: () => marketplaceApi.toggleFavorite(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['marketplace-items']);
      queryClient.invalidateQueries(['user-favorites']);
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: () => marketplaceApi.addToCart(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      // Show success notification
    },
  });

  const handleCardClick = () => {
    navigate(`/marketplace/item/${item.id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user) {
      toggleFavoriteMutation.mutate();
    } else {
      navigate('/login', { state: { returnTo: `/marketplace/item/${item.id}` } });
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user) {
      addToCartMutation.mutate();
    } else {
      navigate('/login', { state: { returnTo: `/marketplace/item/${item.id}` } });
    }
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Skeleton variant="rectangular" height={200} />
        <CardContent sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" sx={{ fontSize: '1.5rem' }} />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="60%" />
        </CardContent>
        <CardActions>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="rectangular" width={100} height={36} sx={{ ml: 'auto' }} />
        </CardActions>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
      onClick={handleCardClick}
    >
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          height="200"
          image={item.images?.[0] || '/placeholder-image.jpg'}
          alt={item.title}
          sx={{ objectFit: 'cover' }}
        />
        {item.verified && (
          <Chip
            icon={<VerifiedIcon />}
            label="Verified"
            size="small"
            color="primary"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(25, 118, 210, 0.9)',
            }}
          />
        )}
        {item.discount && (
          <Chip
            label={`-${item.discount}%`}
            size="small"
            color="error"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              fontWeight: 'bold',
            }}
          />
        )}
      </Box>

      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography
          gutterBottom
          variant="h6"
          component="h2"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: '3.6em',
          }}
        >
          {item.title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Rating value={item.rating || 0} readOnly size="small" precision={0.5} />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({item.reviewCount || 0})
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          by {item.seller.name}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="h6" color="primary">
            {formatCurrency(item.price)}
          </Typography>
          {item.originalPrice && item.originalPrice > item.price && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textDecoration: 'line-through' }}
            >
              {formatCurrency(item.originalPrice)}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
          {item.tags?.slice(0, 3).map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
            <IconButton
              size="small"
              onClick={handleFavoriteClick}
              color={item.isFavorite ? 'error' : 'default'}
              disabled={toggleFavoriteMutation.isPending}
            >
              {item.isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
          </Tooltip>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <VisibilityIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {item.views || 0}
            </Typography>
          </Box>
        </Box>
        <Button
          size="small"
          variant="contained"
          startIcon={<ShoppingCartIcon />}
          onClick={handleAddToCart}
          disabled={addToCartMutation.isPending || !item.inStock}
        >
          {item.inStock ? 'Add to Cart' : 'Out of Stock'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default ItemCard;