import type { DriveFile, FileProcessingStatus } from '@/types/api'

export function fileType(file: Pick<DriveFile, 'name' | 'mimeType'>) {
  const extension = file.name.split('.').pop()
  if (extension && extension !== file.name) return extension.toUpperCase()
  if (file.mimeType && file.mimeType !== 'application/octet-stream') return file.mimeType.split('/').pop()?.toUpperCase() ?? 'Archivo'
  return 'Archivo'
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: index === 0 ? 0 : 1 }).format(value)} ${units[index]}`
}

export function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(date)
}

export const statusLabels: Record<FileProcessingStatus, string> = {
  READY: 'Disponible',
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  FAILED: 'Con error',
  CANCELLED: 'Cancelado',
}
