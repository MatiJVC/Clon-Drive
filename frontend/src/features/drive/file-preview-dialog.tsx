import { useQuery } from '@tanstack/react-query'
import { Download, LoaderCircle, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { queryKeys } from '@/app/query-keys'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/features/drive/drive-utils'
import { FileTypeIcon } from '@/features/drive/file-type-icon'
import { filesApi } from '@/services/api/files'
import { ApiError } from '@/services/api/errors'
import type { DriveFile } from '@/types/api'

type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'none'

const TEXT_EXTENSIONS = ['txt', 'md', 'csv', 'json', 'log', 'xml', 'yml', 'yaml', 'ini', 'sql', 'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'sh', 'css', 'html']
const MAX_TEXT_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_BYTES = 50 * 1024 * 1024

function previewKind(file: Pick<DriveFile, 'name' | 'mimeType' | 'size'>): PreviewKind {
  const mime = file.mimeType.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (mime.startsWith('image/') && file.size <= MAX_IMAGE_BYTES) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime === 'application/pdf' || extension === 'pdf') return 'pdf'
  if ((mime.startsWith('text/') || mime.includes('json') || TEXT_EXTENSIONS.includes(extension)) && file.size <= MAX_TEXT_BYTES) return 'text'
  return 'none'
}

// Visor a pantalla completa, como el de Google Drive.
// - Imágenes y texto: se descargan con el token normal (axios) y se muestran.
// - Video, audio y PDF: se piden con una URL temporal del backend para que el
//   navegador pueda hacer streaming (adelantar el video sin bajarlo entero).
export function FilePreviewDialog({ file, onClose, onDownload }: { file: DriveFile; onClose: () => void; onDownload: () => void }) {
  const kind = previewKind(file)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return <div className="fixed inset-0 z-50 flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label={`Vista previa de ${file.name}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <header className="flex h-16 shrink-0 items-center gap-3 bg-[#202124] px-4 text-white shadow-md">
      <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Cerrar vista previa"><X className="size-5" /></Button>
      <FileTypeIcon file={file} className="size-5 shrink-0" />
      <h2 className="min-w-0 flex-1 truncate text-base font-medium" title={file.name}>{file.name}</h2>
      <span className="hidden text-sm text-white/70 sm:block">{formatBytes(file.size)}</span>
      <Button variant="ghost" className="rounded-full text-white hover:bg-white/10 hover:text-white" onClick={onDownload}><Download className="size-4" />Descargar</Button>
    </header>
    <div className="flex min-h-0 flex-1 items-center justify-center p-4 md:px-10 md:py-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      {kind === 'image' || kind === 'text' ? <BlobPreview file={file} kind={kind} /> : kind === 'none' ? <NoPreview file={file} onDownload={onDownload} /> : <StreamPreview file={file} kind={kind} />}
    </div>
  </div>
}

function BlobPreview({ file, kind }: { file: DriveFile; kind: 'image' | 'text' }) {
  const query = useQuery({
    queryKey: [...queryKeys.files.detail(file.id), 'preview-blob'],
    queryFn: ({ signal }) => filesApi.download(file.id, signal).then((response) => response.data),
    staleTime: 5 * 60_000,
    gcTime: 60_000,
    retry: false,
  })
  const objectUrl = useMemo(() => (kind === 'image' && query.data ? URL.createObjectURL(query.data) : null), [kind, query.data])
  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }, [objectUrl])
  const text = useQuery({
    queryKey: [...queryKeys.files.detail(file.id), 'preview-text'],
    queryFn: () => query.data!.text(),
    enabled: kind === 'text' && !!query.data,
  })

  if (query.isError) return <PreviewError error={query.error} />
  if (kind === 'image') return objectUrl ? <img src={objectUrl} alt={file.name} className="max-h-full max-w-full rounded object-contain shadow-2xl" /> : <Loading />
  if (!text.data && text.data !== '') return <Loading />
  return <pre className="h-full w-full max-w-5xl overflow-auto whitespace-pre-wrap break-words rounded-lg bg-card p-6 font-mono text-sm text-foreground shadow-2xl">{text.data}</pre>
}

function StreamPreview({ file, kind }: { file: DriveFile; kind: 'video' | 'audio' | 'pdf' }) {
  const link = useQuery({
    queryKey: [...queryKeys.files.detail(file.id), 'preview-url'],
    queryFn: ({ signal }) => filesApi.previewUrl(file.id, signal),
    staleTime: 10 * 60_000, // el enlace dura 15 minutos
    gcTime: 0,
    retry: false,
  })
  if (link.isError) return <PreviewError error={link.error} />
  if (!link.data) return <Loading />
  if (kind === 'video') return <video src={link.data} controls autoPlay className="max-h-full max-w-full rounded bg-black shadow-2xl" />
  if (kind === 'audio') return <div className="flex w-full max-w-xl flex-col items-center gap-6 rounded-2xl bg-card p-8 shadow-2xl"><FileTypeIcon file={file} className="size-16 text-primary" /><p className="max-w-full truncate text-center font-medium">{file.name}</p><audio src={link.data} controls autoPlay className="w-full" /></div>
  return <iframe src={link.data} title={file.name} className="h-full w-full max-w-5xl rounded bg-white shadow-2xl" />
}

function NoPreview({ file, onDownload }: { file: DriveFile; onDownload: () => void }) {
  return <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl bg-card p-8 text-center shadow-2xl">
    <FileTypeIcon file={file} className="size-16 text-muted-foreground" />
    <div><p className="font-medium">No hay vista previa disponible</p><p className="mt-1 text-sm text-muted-foreground">Este tipo de archivo no se puede mostrar en el navegador. Descárgalo para abrirlo.</p></div>
    <Button className="rounded-full" onClick={onDownload}><Download className="size-4" />Descargar</Button>
  </div>
}

function Loading() {
  return <div className="flex items-center gap-3 text-white/80"><LoaderCircle className="size-6 animate-spin" />Cargando vista previa…</div>
}

function PreviewError({ error }: { error: unknown }) {
  return <div className="max-w-md rounded-2xl bg-card p-6 text-center text-sm text-destructive shadow-2xl" role="alert">{error instanceof ApiError ? error.message : 'No fue posible cargar la vista previa.'}</div>
}
