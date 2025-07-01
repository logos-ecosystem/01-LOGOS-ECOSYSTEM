import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
} from '@mui/material'
import {
  ShoppingCart,
  Payment,
  LocalShipping,
  CheckCircle,
  AccountBalanceWallet,
  CreditCard,
  Token,
} from '@mui/icons-material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/store/auth'

interface PurchaseDialogProps {
  open: boolean
  onClose: () => void
  item: {
    id: string
    title: string
    price: number
    images: string[]
    seller: {
      id: string
      username: string
    }
    shipping_cost?: number
    processing_time?: string
  }
  walletBalance?: {
    balance_usd: number
    balance_tokens: number
    balance_credits: number
  }
}

const steps = ['Review Order', 'Payment', 'Confirmation']

const PurchaseDialog: React.FC<PurchaseDialogProps> = ({
  open,
  onClose,
  item,
  walletBalance,
}) => {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeStep, setActiveStep] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'tokens'>('wallet')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [cardDetails, setCardDetails] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  })

  const subtotal = item.price * quantity
  const shippingCost = item.shipping_cost || 0
  const total = subtotal + shippingCost

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/marketplace/purchases', {
        item_id: item.id,
        quantity,
        payment_method: paymentMethod,
        notes,
        card_details: paymentMethod === 'card' ? cardDetails : undefined,
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      setActiveStep(2)
    },
  })

  const handleNext = () => {
    if (activeStep === 1) {
      // Process payment
      purchaseMutation.mutate()
    } else {
      setActiveStep((prevStep) => prevStep + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleClose = () => {
    if (activeStep === 2) {
      router.push('/dashboard/purchases')
    } else {
      onClose()
    }
    // Reset state
    setActiveStep(0)
    setPaymentMethod('wallet')
    setQuantity(1)
    setNotes('')
    setCardDetails({ number: '', name: '', expiry: '', cvv: '' })
  }

  const canProceed = () => {
    if (activeStep === 0) return true
    if (activeStep === 1) {
      if (paymentMethod === 'wallet') {
        return walletBalance && walletBalance.balance_usd >= total
      }
      if (paymentMethod === 'tokens') {
        return walletBalance && walletBalance.balance_tokens >= total
      }
      if (paymentMethod === 'card') {
        return cardDetails.number && cardDetails.name && cardDetails.expiry && cardDetails.cvv
      }
    }
    return false
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <List>
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar src={item.images[0]} variant="rounded" />
                </ListItemAvatar>
                <ListItemText
                  primary={item.title}
                  secondary={`Sold by ${item.seller.username}`}
                />
                <Typography variant="h6">
                  ${item.price.toFixed(2)}
                </Typography>
              </ListItem>
            </List>

            <Divider sx={{ my: 2 }} />

            <TextField
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1 }}
              sx={{ mb: 2 }}
              fullWidth
            />

            <TextField
              label="Notes for Seller (Optional)"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Subtotal:</Typography>
              <Typography>${subtotal.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Shipping:</Typography>
              <Typography>
                {shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : 'Free'}
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6">${total.toFixed(2)}</Typography>
            </Box>

            {item.processing_time && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Processing time: {item.processing_time}
              </Alert>
            )}
          </Box>
        )

      case 1:
        return (
          <Box>
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <FormLabel component="legend">Payment Method</FormLabel>
              <RadioGroup
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              >
                <FormControlLabel
                  value="wallet"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalanceWallet />
                      <Box>
                        <Typography>Wallet Balance</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Available: ${walletBalance?.balance_usd.toFixed(2) || '0.00'}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="tokens"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Token />
                      <Box>
                        <Typography>LOGOS Tokens</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Available: {walletBalance?.balance_tokens || 0} tokens
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="card"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CreditCard />
                      <Typography>Credit/Debit Card</Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>

            {paymentMethod === 'card' && (
              <Box>
                <TextField
                  label="Card Number"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Cardholder Name"
                  value={cardDetails.name}
                  onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Expiry (MM/YY)"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="CVV"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>
            )}

            {paymentMethod === 'wallet' && walletBalance && walletBalance.balance_usd < total && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Insufficient wallet balance. Please add funds or choose another payment method.
              </Alert>
            )}

            {paymentMethod === 'tokens' && walletBalance && walletBalance.balance_tokens < total && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Insufficient token balance. Please choose another payment method.
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total to pay:</Typography>
              <Typography variant="h6" color="primary">
                ${total.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2 }}>
              Purchase Successful!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your order has been placed successfully. You will receive a confirmation email shortly.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" onClick={() => router.push('/dashboard/purchases')}>
                View Orders
              </Button>
              <Button variant="outlined" onClick={handleClose}>
                Continue Shopping
              </Button>
            </Box>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCart />
          Complete Purchase
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {purchaseMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to complete purchase. Please try again.
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      {activeStep < 2 && (
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          {activeStep > 0 && (
            <Button onClick={handleBack}>Back</Button>
          )}
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed() || purchaseMutation.isPending}
          >
            {purchaseMutation.isPending ? (
              <CircularProgress size={20} />
            ) : activeStep === 1 ? (
              'Complete Purchase'
            ) : (
              'Continue'
            )}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}

export default PurchaseDialog