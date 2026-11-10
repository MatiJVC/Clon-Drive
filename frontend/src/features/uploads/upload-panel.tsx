import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, File, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/features/drive/drive-utils'
import { TERMINAL_STATUSES, useUploads, type UploadItem } from '@/features/uploads/upload-context'
import { cn } from '@/lib/utils'

const statusText: Record<UploadItem['status'], string> = {
  QUEUED: 'En espera',
  UPLOADING: 'Subiendo',
  PROCESSING: 'Procesando archivo',
  CANCELLING: 'Cancelando…',
  COMPLETED: 'Carga completada',
  ERROR: 'Error',
  CANCELLED: 'Carga cancelada',
}

function describe(item: UploadItem) {
  if (item.status === 'UPLOADING') return `${item.progress}% · ${formatBytes(item.size)}`
  if (item.status === 'PROCESSING' && item.backendStatus === 'PENDING') return 'Pendiente de procesamiento'
  if (item.status === 'ERROR') return item.error ?? statusText.ERROR
  return item.warning ?? `${statusText[item.status]} · ${formatBytes(item.size)}`
}

// Panel flotante de cargas al estilo Google Drive.
export function UploadPanel() {
  const { items, cancel, clearFinished } = useUploads()
  const [minimized, setMinimized] = useState(false)
  if (items.length === 0) return null

  const pending = items.filter((item) => !TERMINAL_STATUSES.includes(item.status)).length
  const done = items.filter((item) => item.status === 'COMPLETED').length
  const title = pending > 0 ? `Subiendo ${pending} elemento${pending === 1 ? '' : 's'}` : `${done} carga${done === 1 ? '' : 's'} completada${done === 1 ? '' : 's'}`

  return <section className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-card shadow-xl" aria-label="Cargas">
    <header className="flex h-14 items-center gap-1 bg-[var(--drive-search)] pl-5 pr-2">
      <h2 className="flex-1 truncate text-base font-normal">{title}</h2>
      <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={() => setMinimized((value) => !value)} aria-label={minimized ? 'Expandir' : 'Minimizar'}>
        {minimized ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
      </Button>
      <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={clearFinished} disabled={pending > 0} aria-label="Cerrar" title={pending > 0 ? 'Hay cargas en curso' : 'Cerrar'}>
        <X className="size-5" />
      </Button>
    </header>
    {!minimized && <ul className="max-h-72 overflow-y-auto py-1">
      {items.map((item) => <UploadRow key={item.id} item={item} onCancel={() => cancel(item.id)} />)}
    </ul>}
  </section>
}

function UploadRow({ item, onCancel }: { item: UploadItem; onCancel: () => void }) {
  const cancellable = item.status === 'QUEUED' || item.status === 'UPLOADING' || (item.status === 'PROCESSING' && !!item.fileId)
  return <li className="group flex items-center gap-3 px-5 py-2">
    <File className="size-5 shrink-0 text-muted-foreground" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm" title={item.name}>{item.name}</p>
      <p className={cn('truncate text-xs text-muted-foreground', item.status === 'ERROR' && 'text-destructive')} title={`Destino: ${item.destinationName}`}>{describe(item)}</p>
      {item.status === 'UPLOADING' && <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${item.progress}%` }} /></div>}
    </div>
    <div className="relative grid size-8 shrink-0 place-items-center">
      <StatusIcon item={item} className={cn(cancellable && 'group-hover:invisible')} />
      {cancellable && <Button variant="ghost" size="icon" className="absolute inset-0 size-8 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={onCancel} aria-label={`Cancelar ${item.name}`}><X className="size-4" /></Button>}
    </div>
  </li>
}

function StatusIcon({ item, className }: { item: UploadItem; className?: string }) {
  if (item.status === 'COMPLETED') return <CheckCircle2 className={cn('size-5 text-green-600 dark:text-green-400', className)} aria-label="Completado" />
  if (item.status === 'ERROR') return <AlertCircle className={cn('size-5 text-destructive', className)} aria-label="Error" />
  if (item.status === 'CANCELLED') return <X className={cn('size-5 text-muted-foreground', className)} aria-label="Cancelado" />
  if (item.status === 'QUEUED') return <span className={cn('size-4 rounded-full border-2 border-muted-foreground/40', className)} aria-label="En espera" />
  return <Loader2 className={cn('size-5 animate-spin text-primary', className)} aria-label={statusText[item.status]} />
}

