import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

interface User {
  id: string
  username: string
  email: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await axios.post('/api/auth/login', {
            email,
            password,
          })
          const { access_token, user } = response.data
          
          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          
          set({
            user,
            token: access_token,
            isLoading: false,
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'Login failed',
            isLoading: false,
          })
          throw error
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await axios.post('/api/auth/register', {
            username,
            email,
            password,
          })
          const { access_token, user } = response.data
          
          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          
          set({
            user,
            token: access_token,
            isLoading: false,
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'Registration failed',
            isLoading: false,
          })
          throw error
        }
      },

      logout: () => {
        delete axios.defaults.headers.common['Authorization']
        set({ user: null, token: null })
      },

      checkAuth: async () => {
        const { token } = get()
        if (!token) {
          set({ isLoading: false })
          return
        }

        set({ isLoading: true })
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const response = await axios.get('/api/auth/me')
          set({
            user: response.data,
            isLoading: false,
          })
        } catch (error) {
          delete axios.defaults.headers.common['Authorization']
          set({
            user: null,
            token: null,
            isLoading: false,
          })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
)