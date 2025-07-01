import React, { useState } from 'react'
import { NextPage } from 'next'
import {
  Container,
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Link as MuiLink,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  SmartToy,
  CheckCircle,
} from '@mui/icons-material'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/store/auth'
import { useFormik } from 'formik'
import * as yup from 'yup'

const validationSchema = yup.object({
  username: yup
    .string()
    .min(3, 'Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .required('Username is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  agreeToTerms: yup.boolean().oneOf([true], 'You must accept the terms and conditions'),
})

const steps = ['Account Info', 'Verification', 'Complete']

const SignUpPage: NextPage = () => {
  const router = useRouter()
  const { register, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      if (activeStep === 0) {
        setIsLoading(true)
        try {
          await register(values.username, values.email, values.password)
          setActiveStep(1)
        } catch (err) {
          // Error is handled by the store
        } finally {
          setIsLoading(false)
        }
      }
    },
  })

  React.useEffect(() => {
    clearError()
  }, [clearError])

  const handleContinue = () => {
    if (activeStep === 1) {
      setActiveStep(2)
    } else if (activeStep === 2) {
      router.push('/dashboard')
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box component="form" onSubmit={formik.handleSubmit}>
            <TextField
              fullWidth
              id="username"
              name="username"
              label="Username"
              value={formik.values.username}
              onChange={formik.handleChange}
              error={formik.touched.username && Boolean(formik.errors.username)}
              helperText={formik.touched.username && formik.errors.username}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              id="password"
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
              helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  id="agreeToTerms"
                  name="agreeToTerms"
                  checked={formik.values.agreeToTerms}
                  onChange={formik.handleChange}
                />
              }
              label={
                <Typography variant="body2">
                  I agree to the{' '}
                  <Link href="/terms" passHref>
                    <MuiLink>Terms of Service</MuiLink>
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" passHref>
                    <MuiLink>Privacy Policy</MuiLink>
                  </Link>
                </Typography>
              }
              sx={{ mb: 2 }}
            />
            {formik.touched.agreeToTerms && formik.errors.agreeToTerms && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mb: 2 }}>
                {formik.errors.agreeToTerms}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading || !formik.isValid}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>
          </Box>
        )

      case 1:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Email sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              Verify Your Email
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We've sent a verification email to:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 3 }}>
              {formik.values.email}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please check your inbox and click the verification link to activate your account.
            </Typography>
            <Button variant="contained" onClick={handleContinue}>
              I've Verified My Email
            </Button>
          </Box>
        )

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2 }}>
              Welcome to LOGOS!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your account has been created successfully. You're now ready to explore the AI-native ecosystem.
            </Typography>
            <Button variant="contained" size="large" onClick={handleContinue}>
              Go to Dashboard
            </Button>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <SmartToy sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography component="h1" variant="h4" sx={{ fontWeight: 'bold' }}>
              LOGOS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI-Native Ecosystem
            </Typography>
          </Box>

          {activeStep === 0 && (
            <Typography component="h2" variant="h5" align="center" sx={{ mb: 3 }}>
              Create Account
            </Typography>
          )}

          {error && activeStep === 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent()}

          {activeStep === 0 && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link href="/auth/signin" passHref>
                <MuiLink variant="body2">Already have an account? Sign In</MuiLink>
              </Link>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  )
}

export default SignUpPage