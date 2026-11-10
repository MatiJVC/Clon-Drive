import { createContext } from 'react'
import type { Credentials } from '@/services/api/auth'
import type { User } from '@/types/api'

export type AuthStatus = 'unauthenticated' | 'checking' | 'authenticated' | 'verification-error'

export interface AuthContextValue {
  user: User | null
  status: AuthStatus
  isAuthenticated: boolean
  login: (credentials: Credentials) => Promise<User>
  register: (credentials: Credentials) => Promise<User>
  logout: () => Promise<void>
  retryVerification: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
