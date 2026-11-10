import { File, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo, Presentation } from 'lucide-react'
import type { DriveFile } from '@/types/api'

export function FileTypeIcon({ file, className }: { file: Pick<DriveFile, 'name' | 'mimeType'>; className?: string }) {
  const mime = file.mimeType.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (mime.startsWith('image/')) return <FileImage className={className} />
  if (mime.startsWith('audio/')) return <FileAudio className={className} />
  if (mime.startsWith('video/')) return <FileVideo className={className} />
  if (mime === 'application/pdf' || extension === 'pdf') return <FileText className={className} />
  if (mime.includes('word') || ['doc', 'docx', 'odt', 'rtf'].includes(extension)) return <FileText className={className} />
  if (mime.includes('presentation') || mime.includes('powerpoint') || ['ppt', 'pptx', 'odp'].includes(extension)) return <Presentation className={className} />
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv') || ['xls', 'xlsx', 'ods', 'csv'].includes(extension)) return <FileSpreadsheet className={className} />
  if (mime.includes('zip') || mime.includes('compressed') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return <FileArchive className={className} />
  if (mime.startsWith('text/')) return <FileText className={className} />
  return <File className={className} />
}
