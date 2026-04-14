import { create } from 'zustand'
import api from '../api/client'
import type { User } from '../types'

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('pos_token'),
  user: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const response = await api.post('/auth/login', { email, password })
      const token = response.data.token as string
      localStorage.setItem('pos_token', token)
      set({ token, user: response.data.user, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore
    }
    localStorage.removeItem('pos_token')
    set({ token: null, user: null })
  },

  fetchMe: async () => {
    if (!localStorage.getItem('pos_token')) {
      return
    }

    set({ loading: true })
    try {
      const response = await api.get('/auth/me')
      set({ user: response.data, loading: false })
    } catch {
      localStorage.removeItem('pos_token')
      set({ token: null, user: null, loading: false })
    }
  },
}))
