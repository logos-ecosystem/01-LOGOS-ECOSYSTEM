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
  Divider,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  SmartToy,
} from '@mui/icons-material'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/store/auth'
import { useFormik } from 'formik'
import * as yup from 'yup'

const validationSchema = yup.object({
  email: yup.string().email('Invalid email address').required('Email is required'),
  password: yup.string().required('Password is required'),
})

const SignInPage: NextPage = () => {
  const router = useRouter()
  const { login, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true)
      try {
        await login(values.email, values.password)
        router.push('/dashboard')
      } catch (err) {
        // Error is handled by the store
      } finally {
        setIsLoading(false)
      }
    },
  })

  React.useEffect(() => {
    clearError()
  }, [clearError])

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

          <Typography component="h2" variant="h5" align="center" sx={{ mb: 3 }}>
            Sign In
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={formik.handleSubmit}>
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
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mb: 2 }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Link href="/auth/forgot-password" passHref>
                <MuiLink variant="body2">Forgot password?</MuiLink>
              </Link>
              <Link href="/auth/signup" passHref>
                <MuiLink variant="body2">Don't have an account? Sign Up</MuiLink>
              </Link>
            </Box>

            <Divider sx={{ my: 3 }}>OR</Divider>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={() => {
                // Demo account login
                formik.setValues({
                  email: 'demo@logos.ai',
                  password: 'demo123',
                })
                formik.handleSubmit()
              }}
            >
              Sign In with Demo Account
            </Button>
          </Box>
        </Paper>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
          By signing in, you agree to our{' '}
          <Link href="/terms" passHref>
            <MuiLink>Terms of Service</MuiLink>
          </Link>{' '}
          and{' '}
          <Link href="/privacy" passHref>
            <MuiLink>Privacy Policy</MuiLink>
          </Link>
        </Typography>
      </Box>
    </Container>
  )
}

export default SignInPage