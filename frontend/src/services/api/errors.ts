import axios from 'axios'
import type { ApiErrorBody } from '@/types/api'

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly details?: ApiErrorBody) {
    super(message)
    this.name = 'ApiError'
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error)) return new ApiError('La solicitud fue cancelada')
  if (!axios.isAxiosError<ApiErrorBody>(error)) return new ApiError('Ocurrió un error inesperado')

  const body = error.response?.data
  const rawMessage = body?.message
  const fallback = error.code === 'ECONNABORTED'
    ? 'La solicitud tardó demasiado. Inténtalo nuevamente.'
    : error.response
      ? error.response.status >= 500
        ? 'El servidor no está disponible temporalmente. Inténtalo más tarde.'
        : 'La API rechazó la solicitud'
      : 'No fue posible conectar con la API. Revisa tu conexión.'
  const message = Array.isArray(rawMessage)
    ? rawMessage.join('. ')
    : rawMessage ?? fallback
  return new ApiError(message, error.response?.status, body)
}
