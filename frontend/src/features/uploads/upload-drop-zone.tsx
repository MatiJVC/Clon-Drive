import { ArrowUp, Cloud, Folder, HardDrive } from 'lucide-react'
import { type PropsWithChildren, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { useUploads, type UploadDestination } from '@/features/uploads/upload-context'

interface DropTarget extends UploadDestination { isFolder: boolean }

// Las carpetas que aceptan archivos se marcan con estos atributos en el explorador.
export const DROP_FOLDER_ID = 'data-drop-folder-id'
export const DROP_FOLDER_NAME = 'data-drop-folder-name'
// Área que se resalta al arrastrar sobre un espacio en blanco (la lista, sin filtros).
export const DROP_SURFACE = '-mx-2 rounded-2xl px-2 pb-2 outline outline-2 -outline-offset-2 outline-transparent transition-colors group-data-[drop=root]:bg-accent/40 group-data-[drop=root]:outline-primary'

function folderUnder(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  const element = target.closest<HTMLElement>(`[${DROP_FOLDER_ID}]`)
  const id = element?.getAttribute(DROP_FOLDER_ID)
  return id ? { folderId: id, name: element?.getAttribute(DROP_FOLDER_NAME) ?? 'carpeta' } : null
}

interface UploadDropZoneProps extends PropsWithChildren {
  /** Directorio actual (undefined = raíz). */
  folderId?: string
  folderName: string
  /** Solo el dueño puede subir: con acceso READ/EDIT el drop queda deshabilitado. */
  enabled: boolean
  onTargetChange?: (folderId: string | null) => void
  className?: string
}

export function UploadDropZone({ folderId, folderName, enabled, onTargetChange, className, children }: UploadDropZoneProps) {
  const { enqueue } = useUploads()
  const [target, setTarget] = useState<DropTarget | null>(null)

  function resolve(eventTarget: EventTarget | null): DropTarget {
    const folder = folderUnder(eventTarget)
    return folder ? { ...folder, isFolder: true } : { folderId, name: folderName, isFolder: false }
  }

  function updateTarget(next: DropTarget | null) {
    setTarget((current) => current?.folderId === next?.folderId && current?.isFolder === next?.isFolder ? current : next)
    onTargetChange?.(next?.isFolder ? next.folderId ?? null : null)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    disabled: !enabled,
    onDragOver: (event) => updateTarget(resolve(event.target)),
    onDragLeave: () => updateTarget(null),
    onDrop: (accepted, _rejected, event) => {
      const destination = resolve(event && 'target' in event ? event.target : null)
      updateTarget(null)
      enqueue(accepted, { folderId: destination.folderId, name: destination.name })
    },
  })

  const active = isDragActive && target
  return <div data-drop={active && !target.isFolder ? 'root' : undefined} {...getRootProps({ className: cn('group relative', className) })}>
    <input {...getInputProps()} />
    {children}
    {active && <DropHint name={target.name} isFolder={target.isFolder} />}
  </div>
}

function DropHint({ name, isFolder }: { name: string; isFolder: boolean }) {
  const Icon = isFolder ? Folder : HardDrive
  return <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
    <span className="relative grid place-items-center">
      <Cloud className="size-14 fill-[#0b57d0] text-[#0b57d0]" />
      <ArrowUp className="absolute size-5 translate-y-0.5 text-white" strokeWidth={3} />
    </span>
    <div className="flex min-w-56 flex-col items-center gap-1 rounded-full bg-[#0b57d0] px-8 py-3 text-sm text-white shadow-lg">
      <span>Suelta los archivos para subirlos a</span>
      <span className="flex max-w-72 items-center gap-2 font-medium"><Icon className="size-4 shrink-0" /><span className="truncate">{name}</span></span>
    </div>
  </div>
}

