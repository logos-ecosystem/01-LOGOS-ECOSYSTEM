import React, { useState } from 'react'
import {
  Box,
  Typography,
  Rating,
  TextField,
  Button,
  Divider,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material'
import {
  ThumbUp,
  ThumbDown,
  MoreVert,
  Flag,
  CheckCircle,
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import axios from 'axios'

interface Review {
  id: string
  user: {
    id: string
    username: string
    avatar?: string
    is_verified: boolean
  }
  rating: number
  title: string
  content: string
  helpful_count: number
  not_helpful_count: number
  user_vote?: 'helpful' | 'not_helpful'
  created_at: string
  updated_at: string
  is_verified_purchase: boolean
}

interface ReviewsListProps {
  itemId: string
  reviews: Review[]
  totalReviews: number
  averageRating: number
  canReview: boolean
  onReviewSubmit?: () => void
}

interface RatingDistribution {
  5: number
  4: number
  3: number
  2: number
  1: number
}

const ReviewsList: React.FC<ReviewsListProps> = ({
  itemId,
  reviews,
  totalReviews,
  averageRating,
  canReview,
  onReviewSubmit,
}) => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedReview, setSelectedReview] = useState<string | null>(null)

  const submitReviewMutation = useMutation({
    mutationFn: async (data: { rating: number; title: string; content: string }) => {
      const response = await axios.post(`/api/marketplace/items/${itemId}/reviews`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-item', itemId] })
      setShowReviewForm(false)
      setRating(0)
      setTitle('')
      setContent('')
      onReviewSubmit?.()
    },
  })

  const voteReviewMutation = useMutation({
    mutationFn: async ({ reviewId, vote }: { reviewId: string; vote: 'helpful' | 'not_helpful' }) => {
      const response = await axios.post(`/api/marketplace/reviews/${reviewId}/vote`, { vote })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-item', itemId] })
    },
  })

  const reportReviewMutation = useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: string; reason: string }) => {
      const response = await axios.post(`/api/marketplace/reviews/${reviewId}/report`, { reason })
      return response.data
    },
    onSuccess: () => {
      setAnchorEl(null)
    },
  })

  const calculateRatingDistribution = (): RatingDistribution => {
    const distribution: RatingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach(review => {
      distribution[review.rating as keyof RatingDistribution]++
    })
    return distribution
  }

  const ratingDistribution = calculateRatingDistribution()

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, reviewId: string) => {
    setAnchorEl(event.currentTarget)
    setSelectedReview(reviewId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedReview(null)
  }

  const handleReport = () => {
    if (selectedReview) {
      reportReviewMutation.mutate({ reviewId: selectedReview, reason: 'inappropriate' })
    }
  }

  const handleSubmitReview = () => {
    if (rating > 0 && title && content) {
      submitReviewMutation.mutate({ rating, title, content })
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Customer Reviews
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
              {averageRating.toFixed(1)}
            </Typography>
            <Rating value={averageRating} readOnly precision={0.1} />
            <Typography variant="body2" color="text.secondary">
              {totalReviews} reviews
            </Typography>
          </Box>
          
          <Box sx={{ flex: 1 }}>
            {([5, 4, 3, 2, 1] as const).map(star => {
              const count = ratingDistribution[star]
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
              
              return (
                <Box key={star} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ minWidth: 20 }}>
                    {star}★
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right' }}>
                    {count}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Box>

        {canReview && !showReviewForm && (
          <Button
            variant="outlined"
            onClick={() => setShowReviewForm(true)}
            sx={{ mb: 3 }}
          >
            Write a Review
          </Button>
        )}

        {showReviewForm && (
          <Box sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Write Your Review
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Rating
              </Typography>
              <Rating
                value={rating}
                onChange={(_, value) => setRating(value || 0)}
                size="large"
              />
            </Box>
            
            <TextField
              fullWidth
              label="Review Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Review Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleSubmitReview}
                disabled={!rating || !title || !content || submitReviewMutation.isPending}
              >
                {submitReviewMutation.isPending ? <CircularProgress size={20} /> : 'Submit Review'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowReviewForm(false)
                  setRating(0)
                  setTitle('')
                  setContent('')
                }}
              >
                Cancel
              </Button>
            </Box>
            
            {submitReviewMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Failed to submit review. Please try again.
              </Alert>
            )}
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      <List>
        {reviews.map((review) => (
          <ListItem key={review.id} alignItems="flex-start" sx={{ px: 0 }}>
            <ListItemAvatar>
              <Avatar src={review.user.avatar}>
                {review.user.username[0].toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2">
                      {review.user.username}
                    </Typography>
                    {review.user.is_verified && (
                      <CheckCircle sx={{ fontSize: 16, color: 'primary.main' }} />
                    )}
                    {review.is_verified_purchase && (
                      <Chip label="Verified Purchase" size="small" color="success" />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Rating value={review.rating} readOnly size="small" />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {review.title}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                  </Typography>
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {review.content}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                      size="small"
                      startIcon={<ThumbUp />}
                      onClick={() => voteReviewMutation.mutate({ reviewId: review.id, vote: 'helpful' })}
                      disabled={review.user_vote === 'helpful'}
                    >
                      Helpful ({review.helpful_count})
                    </Button>
                    <Button
                      size="small"
                      startIcon={<ThumbDown />}
                      onClick={() => voteReviewMutation.mutate({ reviewId: review.id, vote: 'not_helpful' })}
                      disabled={review.user_vote === 'not_helpful'}
                    >
                      Not Helpful ({review.not_helpful_count})
                    </Button>
                    
                    {user && user.id !== review.user.id && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, review.id)}
                      >
                        <MoreVert />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleReport}>
          <Flag sx={{ mr: 1 }} /> Report Review
        </MenuItem>
      </Menu>

      {reviews.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No reviews yet. Be the first to review this item!
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default ReviewsList