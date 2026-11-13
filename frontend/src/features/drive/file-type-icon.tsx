import { AlignLeft, Archive, Code, File, FileText, Image, Music, Play, Presentation, Sheet, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DriveFile } from '@/types/api'

// Ícono por tipo de archivo: un cuadrado de color con un símbolo blanco,
// para distinguir de un vistazo PDF, Word, Excel, PowerPoint, etc.
interface IconStyle { label: string; color: string; Glyph: LucideIcon }

const STYLES = {
  pdf: { label: 'PDF', color: '#d93025', Glyph: FileText },
  word: { label: 'Documento de Word', color: '#1a73e8', Glyph: AlignLeft },
  sheet: { label: 'Hoja de cálculo', color: '#188038', Glyph: Sheet },
  slides: { label: 'Presentación', color: '#e37400', Glyph: Presentation },
  image: { label: 'Imagen', color: '#8430ce', Glyph: Image },
  video: { label: 'Video', color: '#c5221f', Glyph: Play },
  audio: { label: 'Audio', color: '#007b83', Glyph: Music },
  archive: { label: 'Archivo comprimido', color: '#795548', Glyph: Archive },
  code: { label: 'Código', color: '#3c4043', Glyph: Code },
  text: { label: 'Texto', color: '#5f6368', Glyph: AlignLeft },
  other: { label: 'Archivo', color: '#80868b', Glyph: File },
} satisfies Record<string, IconStyle>

const CODE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 'rb', 'sh', 'html', 'css', 'json', 'xml', 'yml', 'yaml', 'sql']

function iconStyle(file: Pick<DriveFile, 'name' | 'mimeType'>): IconStyle {
  const mime = file.mimeType.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (mime === 'application/pdf' || extension === 'pdf') return STYLES.pdf
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'raw', 'bmp', 'svg', 'heic'].includes(extension)) return STYLES.image
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) return STYLES.video
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension)) return STYLES.audio
  if (mime.includes('presentation') || mime.includes('powerpoint') || ['ppt', 'pptx', 'odp', 'key'].includes(extension)) return STYLES.slides
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv') || ['xls', 'xlsx', 'ods', 'csv'].includes(extension)) return STYLES.sheet
  if (mime.includes('word') || mime.includes('opendocument.text') || ['doc', 'docx', 'odt', 'rtf'].includes(extension)) return STYLES.word
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return STYLES.archive
  if (CODE_EXTENSIONS.includes(extension)) return STYLES.code
  if (mime.startsWith('text/') || ['txt', 'md', 'log'].includes(extension)) return STYLES.text
  return STYLES.other
}

export function FileTypeIcon({ file, className }: { file: Pick<DriveFile, 'name' | 'mimeType'>; className?: string }) {
  const { label, color, Glyph } = iconStyle(file)
  return <span role="img" aria-label={label} title={label} className={cn('inline-grid shrink-0 place-items-center rounded-[22%]', className)} style={{ backgroundColor: color }}>
    <Glyph className="size-[66%] text-white" strokeWidth={2.5} aria-hidden="true" />
  </span>
}
