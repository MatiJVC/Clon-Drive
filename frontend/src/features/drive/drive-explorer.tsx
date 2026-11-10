import { Check, ChevronRight, Folder, Grid2X2, List, RefreshCw, Share2, X } from 'lucide-react'
import { type KeyboardEvent, type MouseEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DeleteDialog } from '@/features/drive/delete-dialog'
import { fileIcon, fileType, formatBytes, formatDate, statusLabels } from '@/features/drive/drive-utils'
import { useDriveOperations } from '@/features/drive/drive-operations'
import type { ExplorerItem } from '@/features/drive/explorer-types'
import { ItemActionsMenu, type ItemAction } from '@/features/drive/item-actions-menu'
import { NameDialog } from '@/features/drive/name-dialog'
import type { OperationNotice } from '@/features/drive/operation-feedback'
import { useExplorerSelection } from '@/features/drive/use-explorer-selection'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api/errors'
import type { AccessLevel, FileProcessingStatus } from '@/types/api'

type ViewMode = 'grid' | 'list'
const VIEW_KEY = 'clon-drive.explorer-view'

function initialView(): ViewMode {
  const saved = window.localStorage.getItem(VIEW_KEY)
  return saved === 'list' ? 'list' : 'grid'
}

export function DriveExplorer({ items, isFetching, onRefresh, onOpenFolder, onNotice }: { items: ExplorerItem[]; isFetching: boolean; onRefresh: () => void; onOpenFolder: (id: string) => void; onNotice: (notice: OperationNotice) => void }) {
  const [view, setViewState] = useState<ViewMode>(initialView)
  const [renameTarget, setRenameTarget] = useState<ExplorerItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExplorerItem | null>(null)
  const { selected, select, clear } = useExplorerSelection(items.map((item) => item.id))
  const operations = useDriveOperations()

  function setView(next: ViewMode) {
    setViewState(next)
    window.localStorage.setItem(VIEW_KEY, next)
  }

  function selectItem(item: ExplorerItem, event: MouseEvent | KeyboardEvent) {
    select(item.id, { ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey })
  }

  function handleKey(event: KeyboardEvent, item: ExplorerItem) {
    if (event.key === 'Enter' && item.kind === 'folder') {
      event.preventDefault()
      onOpenFolder(item.id)
    } else if (event.key === ' ') {
      event.preventDefault()
      selectItem(item, event)
    }
  }

  function handleAction(action: ItemAction, item: ExplorerItem) {
    if (action === 'open' && item.kind === 'folder') onOpenFolder(item.id)
    if (action === 'rename') { operations.renameItem.reset(); setRenameTarget(item) }
    if (action === 'delete') { operations.removeItem.reset(); setDeleteTarget(item) }
    if (action === 'download' && item.kind === 'file') {
      operations.downloadFile.mutateAsync(item)
        .then((filename) => onNotice({ kind: 'success', message: `Descarga iniciada: ${filename}` }))
        .catch((error: unknown) => onNotice({ kind: 'error', message: error instanceof ApiError ? error.message : 'No fue posible descargar el archivo.' }))
    }
  }

  async function rename(name: string) {
    if (!renameTarget) return
    const currentName = renameTarget.kind === 'folder' ? renameTarget.folder.name : renameTarget.file.name
    if (name === currentName) { setRenameTarget(null); return }
    try {
      await operations.renameItem.mutateAsync({ item: renameTarget, name })
      setRenameTarget(null)
      clear()
      onNotice({ kind: 'success', message: 'Nombre actualizado correctamente.' })
    } catch { /* el diálogo presenta el error de la mutación */ }
  }

  async function remove() {
    if (!deleteTarget) return
    try {
      await operations.removeItem.mutateAsync(deleteTarget)
      const kind = deleteTarget.kind
      setDeleteTarget(null)
      clear()
      onNotice({ kind: 'success', message: `${kind === 'folder' ? 'Carpeta' : 'Archivo'} eliminado correctamente.` })
    } catch { /* el diálogo presenta el error de la mutación */ }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-2.5">
        <div className="flex min-h-9 items-center gap-2 px-2 text-sm text-muted-foreground" aria-live="polite">
          {selected.size > 0 ? <><span className="font-medium text-foreground">{selected.size} seleccionado{selected.size === 1 ? '' : 's'}</span><Button variant="ghost" size="sm" onClick={clear}><X className="size-4" />Limpiar</Button></> : <span>{items.length} elemento{items.length === 1 ? '' : 's'}</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isFetching} aria-label="Actualizar contenido"><RefreshCw className={cn('size-4', isFetching && 'animate-spin')} /></Button>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')} aria-label="Vista de lista" aria-pressed={view === 'list'}><List className="size-4" /></Button>
          <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('grid')} aria-label="Vista de cuadrícula" aria-pressed={view === 'grid'}><Grid2X2 className="size-4" /></Button>
        </div>
      </div>

      {view === 'grid'
        ? <GridView items={items} selected={selected} onSelect={selectItem} onKeyDown={handleKey} onOpenFolder={onOpenFolder} onAction={handleAction} />
        : <ListView items={items} selected={selected} onSelect={selectItem} onKeyDown={handleKey} onOpenFolder={onOpenFolder} onAction={handleAction} />}
      {renameTarget && <NameDialog title="Cambiar nombre" description={`Edita el nombre del ${renameTarget.kind === 'folder' ? 'directorio' : 'archivo'}.`} initialName={renameTarget.kind === 'folder' ? renameTarget.folder.name : renameTarget.file.name} submitLabel="Guardar" pending={operations.renameItem.isPending} serverError={operations.renameItem.error instanceof ApiError ? operations.renameItem.error.message : null} onClose={() => setRenameTarget(null)} onValueChange={() => operations.renameItem.reset()} onSubmit={rename} />}
      {deleteTarget && <DeleteDialog item={deleteTarget} pending={operations.removeItem.isPending} error={operations.removeItem.error instanceof ApiError ? operations.removeItem.error.message : null} onClose={() => setDeleteTarget(null)} onConfirm={() => void remove()} />}
    </div>
  )
}

interface ViewProps {
  items: ExplorerItem[]
  selected: Set<string>
  onSelect: (item: ExplorerItem, event: MouseEvent | KeyboardEvent) => void
  onKeyDown: (event: KeyboardEvent, item: ExplorerItem) => void
  onOpenFolder: (id: string) => void
  onAction: (action: ItemAction, item: ExplorerItem) => void
}

function GridView({ items, selected, onSelect, onKeyDown, onOpenFolder, onAction }: ViewProps) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" role="listbox" aria-label="Contenido del directorio" aria-multiselectable="true">
    {items.map((item) => {
      const active = selected.has(item.id)
      const Icon = item.kind === 'folder' ? Folder : fileIcon(item.file)
      const name = item.kind === 'folder' ? item.folder.name : item.file.name
      return <div key={`${item.kind}-${item.id}`} role="option" aria-selected={active} tabIndex={0} onClick={(event) => onSelect(item, event)} onDoubleClick={() => item.kind === 'folder' && onOpenFolder(item.id)} onKeyDown={(event) => onKeyDown(event, item)} className={cn('group relative flex min-h-40 cursor-default flex-col rounded-xl border bg-card p-3 outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring', active && 'border-primary bg-accent/70 ring-1 ring-primary')}>
        <div className="flex items-start justify-between">
          <div className={cn('grid size-11 place-items-center rounded-lg', item.kind === 'folder' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-muted text-muted-foreground')}><Icon className="size-6" /></div>
          <div className="flex items-center gap-1">{active && <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3.5" /></span>}<ItemActionsMenu item={item} onAction={onAction} /></div>
        </div>
        <p className="mt-auto line-clamp-2 break-words pt-3 text-sm font-medium" title={name}>{name}</p>
        <div className="mt-2 flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
          {item.ownerUsername && <><Share2 className="size-3.5" /><span className="truncate">{item.ownerUsername}</span></>}
          {!item.ownerUsername && item.kind === 'file' && <span>{fileType(item.file)} · {formatBytes(item.file.size)}</span>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <AccessBadge access={item.access} />
          {item.kind === 'file' && item.file.status !== 'READY' && <FileStatus status={item.file.status} />}
        </div>
        {item.kind === 'folder' && <Button className="absolute bottom-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); onOpenFolder(item.id) }} aria-label={`Abrir ${name}`}><ChevronRight className="size-4" /></Button>}
      </div>
    })}
  </div>
}

function ListView({ items, selected, onSelect, onKeyDown, onOpenFolder, onAction }: ViewProps) {
  return <div className="rounded-xl border bg-card" role="listbox" aria-label="Contenido del directorio" aria-multiselectable="true">
    <div className="hidden grid-cols-[minmax(0,2fr)_minmax(100px,0.7fr)_minmax(90px,0.5fr)_minmax(130px,0.8fr)_140px] gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
      <span>Nombre</span><span>Tipo</span><span>Tamaño</span><span>Modificado</span><span>Acceso y acciones</span>
    </div>
    {items.map((item) => {
      const active = selected.has(item.id)
      const Icon = item.kind === 'folder' ? Folder : fileIcon(item.file)
      const name = item.kind === 'folder' ? item.folder.name : item.file.name
      const date = item.kind === 'folder' ? item.folder.updatedAt : item.file.updatedAt
      return <div key={`${item.kind}-${item.id}`} role="option" aria-selected={active} tabIndex={0} onClick={(event) => onSelect(item, event)} onDoubleClick={() => item.kind === 'folder' && onOpenFolder(item.id)} onKeyDown={(event) => onKeyDown(event, item)} className={cn('group grid min-h-16 cursor-default grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-3 outline-none last:border-b-0 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[minmax(0,2fr)_minmax(100px,0.7fr)_minmax(90px,0.5fr)_minmax(130px,0.8fr)_140px] md:gap-4 md:px-4', active && 'bg-accent/70')}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn('grid size-9 shrink-0 place-items-center rounded-lg', item.kind === 'folder' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-muted text-muted-foreground')}><Icon className="size-5" /></div>
          <div className="min-w-0"><p className="truncate text-sm font-medium" title={name}>{name}</p><p className="truncate text-xs text-muted-foreground md:hidden">{item.kind === 'folder' ? 'Carpeta' : `${fileType(item.file)} · ${formatBytes(item.file.size)}`}</p>{item.kind === 'file' && item.file.status !== 'READY' && <div className="mt-1 hidden md:block"><FileStatus status={item.file.status} /></div>}</div>
        </div>
        <span className="hidden text-sm text-muted-foreground md:block">{item.kind === 'folder' ? 'Carpeta' : fileType(item.file)}</span>
        <span className="hidden text-sm text-muted-foreground md:block">{item.kind === 'file' ? formatBytes(item.file.size) : '—'}</span>
        <span className="hidden text-sm text-muted-foreground md:block">{formatDate(date)}</span>
        <div className="flex items-center justify-end gap-1">
          <AccessBadge access={item.access} />
          <ItemActionsMenu item={item} onAction={onAction} />
        </div>
        {item.kind === 'file' && item.file.status !== 'READY' && <div className="col-span-full -mt-2 pb-2 md:hidden"><FileStatus status={item.file.status} /></div>}
      </div>
    })}
  </div>
}

export function AccessBadge({ access }: { access: AccessLevel }) {
  const label = access === 'OWNER' ? 'Propietario' : access === 'EDIT' ? 'Puede editar' : 'Solo lectura'
  return <span className="inline-flex whitespace-nowrap rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">{label}</span>
}

export function FileStatus({ status }: { status: FileProcessingStatus }) {
  const tone = status === 'FAILED' ? 'bg-destructive/10 text-destructive' : status === 'READY' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
  return <span className={cn('inline-flex rounded-full px-2 py-1 text-[11px] font-medium', tone)}>{statusLabels[status]}</span>
}
