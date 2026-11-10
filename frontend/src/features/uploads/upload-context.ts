import { createContext, useContext } from 'react'
import type { FileProcessingStatus } from '@/types/api'

// Estados locales del gestor. No se envían al backend: el estado real del
// archivo vive en `backendStatus` (respuesta de POST /files y GET /files/:id).
export type UploadStatus = 'QUEUED' | 'UPLOADING' | 'PROCESSING' | 'CANCELLING' | 'COMPLETED' | 'ERROR' | 'CANCELLED'

export interface UploadItem {
  id: string
  name: string
  size: number
  folderId?: string
  destinationName: string
  status: UploadStatus
  /** Porcentaje de bytes enviados por HTTP (no mide el procesamiento SQS). */
  progress: number
  fileId?: string
  backendStatus?: FileProcessingStatus
  error?: string
  warning?: string
}

export interface UploadDestination {
  folderId?: string
  name: string
}

export interface UploadContextValue {
  items: UploadItem[]
  enqueue: (files: File[], destination: UploadDestination) => void
  cancel: (id: string) => void
  clearFinished: () => void
}

export const UploadContext = createContext<UploadContextValue | null>(null)

export function useUploads() {
  const value = useContext(UploadContext)
  if (!value) throw new Error('useUploads debe usarse dentro de UploadProvider')
  return value
}

export const TERMINAL_STATUSES: UploadStatus[] = ['COMPLETED', 'ERROR', 'CANCELLED']

