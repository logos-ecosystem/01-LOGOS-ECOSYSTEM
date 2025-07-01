import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/store/auth'
import { Box, CircularProgress } from '@mui/material'

export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const AuthenticatedComponent = (props: P) => {
    const router = useRouter()
    const { user, isLoading, checkAuth } = useAuthStore()

    useEffect(() => {
      checkAuth()
    }, [checkAuth])

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/auth/signin')
      }
    }, [isLoading, user, router])

    if (isLoading) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}
        >
          <CircularProgress />
        </Box>
      )
    }

    if (!user) {
      return null
    }

    return <Component {...props} />
  }

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name || 'Component'})`

  return AuthenticatedComponent
}