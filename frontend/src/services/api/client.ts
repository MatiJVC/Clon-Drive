import axios from 'axios'
import { tokenStorage } from '@/features/auth/token-storage'
import { normalizeApiError } from '@/services/api/errors'

export const baseURL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const apiClient = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const hadBearerToken = axios.isAxiosError(error)
      && typeof error.config?.headers?.Authorization === 'string'
      && error.config.headers.Authorization.startsWith('Bearer ')
    if (axios.isAxiosError(error) && error.response?.status === 401 && hadBearerToken) {
      tokenStorage.clear()
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    return Promise.reject(normalizeApiError(error))
  },
)
