import { apiClient } from '@/services/api/client'
import type { AuthSession, User } from '@/types/api'

export interface Credentials { username: string; password: string }

export const authApi = {
  async register(credentials: Credentials, signal?: AbortSignal) {
    const { data } = await apiClient.post<AuthSession>('/auth/register', credentials, { signal })
    return data
  },
  async login(credentials: Credentials, signal?: AbortSignal) {
    const { data } = await apiClient.post<AuthSession>('/auth/login', credentials, { signal })
    return data
  },
  async me(signal?: AbortSignal) {
    const { data } = await apiClient.get<User>('/auth/me', { signal })
    return data
  },
}
