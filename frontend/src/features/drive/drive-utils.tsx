import { File, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo, Presentation } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import type { DriveFile, FileProcessingStatus } from '@/types/api'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

export function fileIcon(file: Pick<DriveFile, 'name' | 'mimeType'>): Icon {
  const mime = file.mimeType.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (mime.startsWith('image/')) return FileImage
  if (mime.startsWith('audio/')) return FileAudio
  if (mime.startsWith('video/')) return FileVideo
  if (mime === 'application/pdf' || extension === 'pdf') return FileText
  if (mime.includes('word') || ['doc', 'docx', 'odt', 'rtf'].includes(extension)) return FileText
  if (mime.includes('presentation') || mime.includes('powerpoint') || ['ppt', 'pptx', 'odp'].includes(extension)) return Presentation
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv') || ['xls', 'xlsx', 'ods', 'csv'].includes(extension)) return FileSpreadsheet
  if (mime.includes('zip') || mime.includes('compressed') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return FileArchive
  if (mime.startsWith('text/')) return FileText
  return File
}

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
