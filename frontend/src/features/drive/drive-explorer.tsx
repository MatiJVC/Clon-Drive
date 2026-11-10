import { ArrowUp, Check, Download, Folder, FolderOpen, Grid2X2, List, Pencil, RefreshCw, Share2, Trash2, X } from 'lucide-react'
import { type KeyboardEvent, type MouseEvent, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DeleteDialog } from '@/features/drive/delete-dialog'
import { FileTypeIcon } from '@/features/drive/file-type-icon'
import { formatBytes, formatDate, statusLabels } from '@/features/drive/drive-utils'
import { useDriveOperations } from '@/features/drive/drive-operations'
import type { ExplorerItem } from '@/features/drive/explorer-types'
import { FileThumbnail } from '@/features/drive/file-thumbnail'
import { ItemActionsMenu, type ItemAction } from '@/features/drive/item-actions-menu'
import { NameDialog } from '@/features/drive/name-dialog'
import type { OperationNotice } from '@/features/drive/operation-feedback'
import { useExplorerSelection } from '@/features/drive/use-explorer-selection'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api/errors'
import type { AccessLevel, FileProcessingStatus } from '@/types/api'

type ViewMode = 'grid' | 'list'
type TypeFilter = 'all' | 'folder' | 'document' | 'image' | 'audio' | 'video' | 'pdf' | 'other'
type PeopleFilter = 'all' | 'owned' | 'shared'
type ModifiedFilter = 'all' | '7' | '30'
const VIEW_KEY = 'clon-drive.explorer-view'

function initialView(): ViewMode {
  return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
}

interface DriveExplorerProps {
  items: ExplorerItem[]
  isFetching: boolean
  onRefresh: () => void
  onOpenFolder: (id: string) => void
  onNotice: (notice: OperationNotice) => void
  sharedView?: boolean
}

export function DriveExplorer({ items, isFetching, onRefresh, onOpenFolder, onNotice, sharedView = false }: DriveExplorerProps) {
  const [view, setViewState] = useState<ViewMode>(initialView)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>('all')
  const [modifiedFilter, setModifiedFilter] = useState<ModifiedFilter>('all')
  const [renameTarget, setRenameTarget] = useState<ExplorerItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExplorerItem | null>(null)
  const filteredItems = useMemo(() => items.filter((item) => matchesFilters(item, typeFilter, peopleFilter, modifiedFilter)), [items, typeFilter, peopleFilter, modifiedFilter])
  const { selected, select, clear } = useExplorerSelection(filteredItems.map((item) => item.id))
  const operations = useDriveOperations()
  const selectedItem = selected.size === 1 ? filteredItems.find((item) => selected.has(item.id)) : undefined

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
    if (name === itemName(renameTarget)) { setRenameTarget(null); return }
    try {
      await operations.renameItem.mutateAsync({ item: renameTarget, name })
      setRenameTarget(null)
      clear()
      onNotice({ kind: 'success', message: 'Nombre actualizado correctamente.' })
    } catch { /* el diálogo presenta el error */ }
  }

  async function remove() {
    if (!deleteTarget) return
    try {
      await operations.removeItem.mutateAsync(deleteTarget)
      const kind = deleteTarget.kind
      setDeleteTarget(null)
      clear()
      onNotice({ kind: 'success', message: `${kind === 'folder' ? 'Carpeta' : 'Archivo'} eliminado correctamente.` })
    } catch { /* el diálogo presenta el error */ }
  }

  const viewProps: ViewProps = { items: filteredItems, selected, onSelect: selectItem, onKeyDown: handleKey, onOpenFolder, onAction: handleAction, sharedView }
  const filters = {
    typeFilter,
    peopleFilter,
    modifiedFilter,
    setTypeFilter: (value: TypeFilter) => { clear(); setTypeFilter(value) },
    setPeopleFilter: (value: PeopleFilter) => { clear(); setPeopleFilter(value) },
    setModifiedFilter: (value: ModifiedFilter) => { clear(); setModifiedFilter(value) },
  }
  return <div>
    <ExplorerToolbar view={view} setView={setView} selected={selected} selectedItem={selectedItem} clear={clear} isFetching={isFetching} onRefresh={onRefresh} onAction={handleAction} filters={filters} />
    {filteredItems.length === 0
      ? <div className="grid min-h-40 place-items-center text-center"><div><p className="font-medium">No hay elementos que coincidan</p><p className="mt-1 text-sm text-muted-foreground">Prueba con otros filtros.</p></div></div>
      : view === 'grid' ? <GridView {...viewProps} /> : <ListView {...viewProps} />}
    {renameTarget && <NameDialog title="Cambiar nombre" description={`Edita el nombre del ${renameTarget.kind === 'folder' ? 'directorio' : 'archivo'}.`} initialName={itemName(renameTarget)} submitLabel="Guardar" pending={operations.renameItem.isPending} serverError={operations.renameItem.error instanceof ApiError ? operations.renameItem.error.message : null} onClose={() => setRenameTarget(null)} onValueChange={() => operations.renameItem.reset()} onSubmit={rename} />}
    {deleteTarget && <DeleteDialog item={deleteTarget} pending={operations.removeItem.isPending} error={operations.removeItem.error instanceof ApiError ? operations.removeItem.error.message : null} onClose={() => setDeleteTarget(null)} onConfirm={() => void remove()} />}
  </div>
}

interface FilterState {
  typeFilter: TypeFilter
  peopleFilter: PeopleFilter
  modifiedFilter: ModifiedFilter
  setTypeFilter: (value: TypeFilter) => void
  setPeopleFilter: (value: PeopleFilter) => void
  setModifiedFilter: (value: ModifiedFilter) => void
}

function ExplorerToolbar({ view, setView, selected, selectedItem, clear, isFetching, onRefresh, onAction, filters }: { view: ViewMode; setView: (view: ViewMode) => void; selected: Set<string>; selectedItem?: ExplorerItem; clear: () => void; isFetching: boolean; onRefresh: () => void; onAction: (action: ItemAction, item: ExplorerItem) => void; filters: FilterState }) {
  if (selected.size > 0) {
    const canEdit = selectedItem && selectedItem.access !== 'READ'
    const canDownload = selectedItem?.kind === 'file' && selectedItem.file.status === 'READY'
    return <div className="mb-4 flex h-11 items-center gap-1 rounded-full bg-secondary px-2 text-sm" aria-live="polite">
      <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={clear} aria-label="Limpiar selección"><X className="size-[18px]" /></Button>
      <span className="mr-2 font-medium">{selected.size} seleccionado{selected.size === 1 ? '' : 's'}</span>
      {selectedItem?.kind === 'folder' && <ToolbarAction label="Abrir carpeta" icon={FolderOpen} onClick={() => onAction('open', selectedItem)} />}
      {canDownload && <ToolbarAction label="Descargar" icon={Download} onClick={() => onAction('download', selectedItem)} />}
      {canEdit && <ToolbarAction label="Cambiar nombre" icon={Pencil} onClick={() => onAction('rename', selectedItem)} />}
      {canEdit && <ToolbarAction label="Eliminar" icon={Trash2} onClick={() => onAction('delete', selectedItem)} />}
    </div>
  }

  return <div className="mb-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <FilterBar filters={filters} />
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={onRefresh} disabled={isFetching} aria-label="Actualizar contenido"><RefreshCw className={cn('size-[18px]', isFetching && 'animate-spin')} /></Button>
        <div className="flex h-9 overflow-hidden rounded-full border border-[#747775] dark:border-border">
          <ViewButton active={view === 'list'} label="Vista de lista" onClick={() => setView('list')} icon={List} />
          <ViewButton active={view === 'grid'} label="Vista de cuadrícula" onClick={() => setView('grid')} icon={Grid2X2} last />
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 px-1 text-sm font-medium text-[#444746] dark:text-muted-foreground"><span>Nombre</span><span className="grid size-6 place-items-center rounded-full bg-accent text-accent-foreground"><ArrowUp className="size-4" /></span></div>
  </div>
}

function FilterBar({ filters }: { filters: FilterState }) {
  return <div className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Filtros del explorador">
    <FilterSelect label="Tipo" value={filters.typeFilter} onChange={(value) => filters.setTypeFilter(value as TypeFilter)} options={[['all', 'Todos'], ['folder', 'Carpetas'], ['document', 'Documentos'], ['image', 'Imágenes'], ['audio', 'Audio'], ['video', 'Video'], ['pdf', 'PDF'], ['other', 'Otros']]} />
    <FilterSelect label="Personas" value={filters.peopleFilter} onChange={(value) => filters.setPeopleFilter(value as PeopleFilter)} options={[['all', 'Todos'], ['owned', 'Propios'], ['shared', 'Compartidos']]} />
    <FilterSelect label="Modificado" value={filters.modifiedFilter} onChange={(value) => filters.setModifiedFilter(value as ModifiedFilter)} options={[['all', 'Cualquier fecha'], ['7', 'Últimos 7 días'], ['30', 'Últimos 30 días']]} />
  </div>
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  const active = value !== 'all'
  return <label className={cn('relative flex h-9 shrink-0 items-center rounded-lg border border-[#747775] bg-card px-3 text-sm hover:bg-muted dark:border-border', active && 'border-primary bg-accent text-accent-foreground')}>
    <span className="pointer-events-none">{label}{active ? `: ${options.find(([key]) => key === value)?.[1]}` : ''}</span>
    <select className="absolute inset-0 cursor-pointer opacity-0" value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Filtrar por ${label.toLowerCase()}`}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select>
    <span className="pointer-events-none ml-2 text-[10px]">▼</span>
  </label>
}

function ViewButton({ active, label, onClick, icon: Icon, last = false }: { active: boolean; label: string; onClick: () => void; icon: typeof List; last?: boolean }) {
  return <button className={cn('grid w-14 place-items-center transition-colors', !last && 'border-r border-[#747775] dark:border-border', active && 'bg-accent text-accent-foreground')} onClick={onClick} aria-label={label} aria-pressed={active}>{active ? <span className="flex items-center"><Check className="size-4" /><Icon className="size-4" /></span> : <Icon className="size-4" />}</button>
}

function ToolbarAction({ label, icon: Icon, onClick }: { label: string; icon: typeof Download; onClick: () => void }) {
  return <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={onClick} aria-label={label} title={label}><Icon className="size-[18px]" /></Button>
}

interface ViewProps {
  items: ExplorerItem[]
  selected: Set<string>
  onSelect: (item: ExplorerItem, event: MouseEvent | KeyboardEvent) => void
  onKeyDown: (event: KeyboardEvent, item: ExplorerItem) => void
  onOpenFolder: (id: string) => void
  onAction: (action: ItemAction, item: ExplorerItem) => void
  sharedView: boolean
}

function GridView(props: ViewProps) {
  const folders = props.items.filter((item): item is Extract<ExplorerItem, { kind: 'folder' }> => item.kind === 'folder')
  const files = props.items.filter((item): item is Extract<ExplorerItem, { kind: 'file' }> => item.kind === 'file')
  return <div className="space-y-8" role="listbox" aria-label="Contenido del directorio" aria-multiselectable="true">
    {folders.length > 0 && <section aria-label="Carpetas"><div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">{folders.map((item) => <FolderTile key={item.id} item={item} {...props} />)}</div></section>}
    {files.length > 0 && <section aria-label="Archivos"><div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">{files.map((item) => <FileCard key={item.id} item={item} {...props} />)}</div></section>}
  </div>
}

function FolderTile({ item, selected, onSelect, onKeyDown, onOpenFolder, onAction }: ViewProps & { item: Extract<ExplorerItem, { kind: 'folder' }> }) {
  const active = selected.has(item.id)
  return <div role="option" aria-selected={active} tabIndex={0} onClick={(event) => onSelect(item, event)} onDoubleClick={() => onOpenFolder(item.id)} onKeyDown={(event) => onKeyDown(event, item)} className={cn('flex h-12 cursor-default items-center gap-3 rounded-xl border border-transparent bg-secondary px-3 outline-none transition-colors hover:bg-[var(--drive-hover)] focus-visible:ring-2 focus-visible:ring-ring', active && 'border-primary bg-accent text-accent-foreground')}>
    <Folder className="size-5 shrink-0 fill-current" /><span className="min-w-0 flex-1 truncate text-sm font-medium" title={item.folder.name}>{item.folder.name}</span>{item.ownerUsername && <Share2 className="size-4 shrink-0 text-muted-foreground" aria-label="Compartido" />}<ItemActionsMenu item={item} onAction={onAction} />
  </div>
}

function FileCard({ item, selected, onSelect, onKeyDown, onAction }: ViewProps & { item: Extract<ExplorerItem, { kind: 'file' }> }) {
  const active = selected.has(item.id)
  return <div role="option" aria-selected={active} tabIndex={0} onClick={(event) => onSelect(item, event)} onKeyDown={(event) => onKeyDown(event, item)} className={cn('flex aspect-[4/5] min-h-56 cursor-default flex-col overflow-hidden rounded-xl border border-transparent bg-secondary p-2 outline-none transition-colors hover:bg-[var(--drive-hover)] focus-visible:ring-2 focus-visible:ring-ring', active && 'border-primary bg-accent')}>
    <div className="flex h-10 items-center gap-2 px-1"><FileTypeIcon file={item.file} className="size-[18px] shrink-0" /><span className="min-w-0 flex-1 truncate text-sm font-medium" title={item.file.name}>{item.file.name}</span>{item.ownerUsername && <Share2 className="size-4 shrink-0 text-muted-foreground" aria-label="Compartido" />}<ItemActionsMenu item={item} onAction={onAction} /></div>
    <div className="min-h-0 flex-1"><FileThumbnail file={item.file} /></div>
    {item.file.status !== 'READY' && <div className="px-1 pt-2"><FileStatus status={item.file.status} /></div>}
  </div>
}

function ListView({ items, selected, onSelect, onKeyDown, onOpenFolder, onAction, sharedView }: ViewProps) {
  return <div role="listbox" aria-label="Contenido del directorio" aria-multiselectable="true">
    <div className="grid min-h-10 grid-cols-[minmax(0,2fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_90px_48px] items-center gap-4 border-b px-3 text-sm font-medium text-[#444746] dark:text-muted-foreground max-md:grid-cols-[minmax(0,1fr)_48px]"><span>Nombre</span><span className="max-md:hidden">{sharedView ? 'Compartido por' : 'Propietario'}</span><span className="max-md:hidden">Fecha de modificación</span><span className="max-md:hidden">Tamaño</span><span /></div>
    {items.map((item) => {
      const active = selected.has(item.id)
      const owner = item.ownerUsername ?? (item.access === 'OWNER' ? 'Yo' : '—')
      const date = item.kind === 'folder' ? item.folder.updatedAt : item.file.updatedAt
      return <div key={`${item.kind}-${item.id}`} role="option" aria-selected={active} tabIndex={0} onClick={(event) => onSelect(item, event)} onDoubleClick={() => item.kind === 'folder' && onOpenFolder(item.id)} onKeyDown={(event) => onKeyDown(event, item)} className={cn('grid min-h-12 grid-cols-[minmax(0,2fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_90px_48px] items-center gap-4 border-b px-3 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring max-md:grid-cols-[minmax(0,1fr)_48px]', active && 'bg-accent hover:bg-accent')}>
        <div className="flex min-w-0 items-center gap-3">{item.kind === 'folder' ? <Folder className="size-[18px] shrink-0 fill-current" /> : <FileTypeIcon file={item.file} className="size-[18px] shrink-0" />}<span className="truncate font-medium" title={itemName(item)}>{itemName(item)}</span>{item.ownerUsername && <Share2 className="size-4 shrink-0 text-muted-foreground" />}{item.kind === 'file' && item.file.status !== 'READY' && <FileStatus status={item.file.status} />}</div>
        <span className="truncate text-muted-foreground max-md:hidden">{owner}</span><span className="text-muted-foreground max-md:hidden">{formatDate(date)}</span><span className="text-muted-foreground max-md:hidden">{item.kind === 'file' ? formatBytes(item.file.size) : '—'}</span><div className="justify-self-end"><ItemActionsMenu item={item} onAction={onAction} /></div>
      </div>
    })}
  </div>
}

function itemName(item: ExplorerItem) { return item.kind === 'folder' ? item.folder.name : item.file.name }

function matchesFilters(item: ExplorerItem, type: TypeFilter, people: PeopleFilter, modified: ModifiedFilter) {
  if (type !== 'all' && itemCategory(item) !== type) return false
  if (people === 'owned' && item.access !== 'OWNER') return false
  if (people === 'shared' && item.access === 'OWNER' && !item.ownerUsername) return false
  if (modified !== 'all') {
    const value = item.kind === 'folder' ? item.folder.updatedAt : item.file.updatedAt
    const timestamp = new Date(value).getTime()
    const days = Number(modified)
    if (!Number.isFinite(timestamp) || Date.now() - timestamp > days * 24 * 60 * 60 * 1000) return false
  }
  return true
}

function itemCategory(item: ExplorerItem): Exclude<TypeFilter, 'all'> {
  if (item.kind === 'folder') return 'folder'
  const mime = item.file.mimeType.toLowerCase()
  const extension = item.file.name.split('.').pop()?.toLowerCase() ?? ''
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  if (mime === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (mime.startsWith('text/') || mime.includes('word') || mime.includes('document') || mime.includes('sheet') || mime.includes('excel') || mime.includes('presentation') || mime.includes('powerpoint') || ['doc', 'docx', 'odt', 'rtf', 'xls', 'xlsx', 'ods', 'csv', 'ppt', 'pptx', 'odp'].includes(extension)) return 'document'
  return 'other'
}

export function AccessBadge({ access }: { access: AccessLevel }) {
  const label = access === 'OWNER' ? 'Propietario' : access === 'EDIT' ? 'Puede editar' : 'Solo lectura'
  return <span className="inline-flex whitespace-nowrap rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">{label}</span>
}

export function FileStatus({ status }: { status: FileProcessingStatus }) {
  const tone = status === 'FAILED' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
  return <span className={cn('inline-flex rounded-full px-2 py-1 text-[11px] font-medium', tone)}>{statusLabels[status]}</span>
}
