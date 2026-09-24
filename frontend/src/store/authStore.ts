import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { client } from '@/lib/client'
import { setAccessToken } from '@/lib/api'
import { mockLogout } from '@/lib/mockBackend'
import type { User } from '@/lib/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email, password) => {
        const { user, accessToken } = await client.login(email, password)
        setAccessToken(accessToken)
        set({ user, isAuthenticated: true })
      },
      register: async (name, email, password) => {
        const { user, accessToken } = await client.register(name, email, password)
        setAccessToken(accessToken)
        set({ user, isAuthenticated: true })
      },
      logout: () => {
        setAccessToken(null)
        mockLogout()
        set({ user: null, isAuthenticated: false })
      },
    }),
    { name: 'task-board-auth' },
  ),
)
