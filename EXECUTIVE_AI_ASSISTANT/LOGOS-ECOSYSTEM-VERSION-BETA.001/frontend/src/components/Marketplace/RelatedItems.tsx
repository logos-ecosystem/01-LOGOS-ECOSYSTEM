import React from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Rating,
  Chip,
  IconButton,
  Skeleton,
} from '@mui/material'
import {
  ShoppingCart,
  Favorite,
  FavoriteBorder,
} from '@mui/icons-material'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useAuthStore } from '@/store/auth'

interface MarketplaceItem {
  id: string
  title: string
  description: string
  price: number
  images: string[]
  category: string
  tags: string[]
  seller: {
    id: string
    username: string
    avatar?: string
    rating: number
  }
  rating: number
  reviews_count: number
  is_featured: boolean
  is_favorite?: boolean
  created_at: string
}

interface RelatedItemsProps {
  itemId: string
  category: string
  tags: string[]
  sellerId: string
}

const RelatedItems: React.FC<RelatedItemsProps> = ({
  itemId,
  category,
  tags,
  sellerId,
}) => {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: relatedItems, isPending } = useQuery({
    queryKey: ['related-items', itemId],
    queryFn: async () => {
      const response = await axios.get<MarketplaceItem[]>(`/api/marketplace/items/${itemId}/related`, {
        params: {
          category,
          tags: tags.join(','),
          seller_id: sellerId,
          limit: 8,
        },
      })
      return response.data
    },
  })

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ itemId, isFavorite }: { itemId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await axios.delete(`/api/marketplace/favorites/${itemId}`)
      } else {
        await axios.post('/api/marketplace/favorites', { item_id: itemId })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['related-items', itemId] })
    },
  })

  const handleItemClick = (itemId: string) => {
    router.push(`/marketplace/item/${itemId}`)
  }

  const handleToggleFavorite = (e: React.MouseEvent, item: MarketplaceItem) => {
    e.stopPropagation()
    if (user) {
      toggleFavoriteMutation.mutate({ itemId: item.id, isFavorite: item.is_favorite || false })
    } else {
      router.push('/auth/signin')
    }
  }

  const handleAddToCart = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    // TODO: Implement add to cart functionality
    console.log('Add to cart:', itemId)
  }

  if (isPending) {
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Related Items
        </Typography>
        <Grid container spacing={2}>
          {[...Array(4)].map((_, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  if (!relatedItems || relatedItems.length === 0) {
    return null
  }

  const sameSeller = relatedItems.filter(item => item.seller.id === sellerId)
  const sameCategory = relatedItems.filter(item => item.seller.id !== sellerId)

  return (
    <Box>
      {sameSeller.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            More from this Seller
          </Typography>
          <Grid container spacing={2}>
            {sameSeller.map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => handleItemClick(item.id)}
                >
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={item.images[0] || '/placeholder.png'}
                      alt={item.title}
                    />
                    {item.is_featured && (
                      <Chip
                        label="Featured"
                        size="small"
                        color="primary"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                        }}
                      />
                    )}
                    <IconButton
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'background.paper',
                        '&:hover': {
                          bgcolor: 'background.paper',
                        },
                      }}
                      onClick={(e) => handleToggleFavorite(e, item)}
                    >
                      {item.is_favorite ? (
                        <Favorite color="error" />
                      ) : (
                        <FavoriteBorder />
                      )}
                    </IconButton>
                  </Box>
                  
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" noWrap>
                      {item.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Rating value={item.rating} readOnly size="small" />
                      <Typography variant="caption" color="text.secondary">
                        ({item.reviews_count})
                      </Typography>
                    </Box>
                    <Typography variant="h6" color="primary">
                      ${item.price.toFixed(2)}
                    </Typography>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<ShoppingCart />}
                      onClick={(e) => handleAddToCart(e, item.id)}
                      fullWidth
                    >
                      Add to Cart
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {sameCategory.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Similar Items
          </Typography>
          <Grid container spacing={2}>
            {sameCategory.map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => handleItemClick(item.id)}
                >
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={item.images[0] || '/placeholder.png'}
                      alt={item.title}
                    />
                    {item.is_featured && (
                      <Chip
                        label="Featured"
                        size="small"
                        color="primary"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                        }}
                      />
                    )}
                    <IconButton
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'background.paper',
                        '&:hover': {
                          bgcolor: 'background.paper',
                        },
                      }}
                      onClick={(e) => handleToggleFavorite(e, item)}
                    >
                      {item.is_favorite ? (
                        <Favorite color="error" />
                      ) : (
                        <FavoriteBorder />
                      )}
                    </IconButton>
                  </Box>
                  
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" noWrap>
                      {item.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Rating value={item.rating} readOnly size="small" />
                      <Typography variant="caption" color="text.secondary">
                        ({item.reviews_count})
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      by {item.seller.username}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      ${item.price.toFixed(2)}
                    </Typography>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<ShoppingCart />}
                      onClick={(e) => handleAddToCart(e, item.id)}
                      fullWidth
                    >
                      Add to Cart
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  )
}

export default RelatedItems