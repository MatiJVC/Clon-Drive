import { ChevronLeft, ChevronRight, FolderPlus, Home } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { StatusState } from '@/components/ui/status-state'
import { DriveExplorer, AccessBadge } from '@/features/drive/drive-explorer'
import { useDriveOperations } from '@/features/drive/drive-operations'
import { ExplorerError, ExplorerLoading } from '@/features/drive/explorer-states'
import type { ExplorerItem } from '@/features/drive/explorer-types'
import { NameDialog } from '@/features/drive/name-dialog'
import { OperationFeedback, type OperationNotice } from '@/features/drive/operation-feedback'
import { useDriveListing } from '@/features/drive/drive-queries'
import { ApiError } from '@/services/api/errors'
import type { AccessLevel, BreadcrumbItem } from '@/types/api'

export function DrivePage() {
  const [searchParams] = useSearchParams()
  const folderId = searchParams.get('folderId') || undefined
  return <DriveDirectory key={folderId ?? 'root'} folderId={folderId} />
}

function DriveDirectory({ folderId }: { folderId?: string }) {
  const navigate = useNavigate()
  const query = useDriveListing(folderId)
  const operations = useDriveOperations()
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<OperationNotice | null>(null)

  function openFolder(id: string) { navigate(`/drive?folderId=${encodeURIComponent(id)}`) }
  function goToCrumb(id?: string) { navigate(id ? `/drive?folderId=${encodeURIComponent(id)}` : '/drive') }

  async function createFolder(name: string) {
    try {
      await operations.createFolder.mutateAsync({ name, parentId: folderId })
      setCreating(false)
      setNotice({ kind: 'success', message: `Carpeta “${name}” creada correctamente.` })
    } catch { /* el diálogo presenta el error */ }
  }

  if (query.isPending) return <ExplorerLoading />
  if (query.isError) return <ExplorerError error={query.error} onRetry={() => void query.refetch()} />

  const data = query.data
  const items: ExplorerItem[] = [
    ...data.folders.map((folder) => ({ kind: 'folder' as const, id: folder.id, folder, access: data.access })),
    ...data.files.map((file) => ({ kind: 'file' as const, id: file.id, file, access: data.access })),
  ]
  const sharedContext = data.access !== 'OWNER'

  return <section className="mx-auto max-w-7xl">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-primary">{sharedContext ? 'Carpeta compartida' : 'Mi unidad'}</p>
        <div className="mt-1 flex items-center gap-3"><h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{data.folder?.name ?? 'Mi unidad'}</h1><AccessBadge access={data.access} /></div>
      </div>
      <div className="flex items-center gap-2">
        {data.access === 'OWNER' && <Button onClick={() => { operations.createFolder.reset(); setCreating(true) }}><FolderPlus className="size-4" />Nueva carpeta</Button>}
        {folderId && <Button variant="outline" onClick={() => navigate(-1)}><ChevronLeft className="size-4" />Volver</Button>}
      </div>
    </div>

    <Breadcrumbs items={data.breadcrumb} access={data.access} onNavigate={goToCrumb} onRoot={() => navigate(sharedContext ? '/drive/shared' : '/drive')} />

    <div className="mt-5">
      {notice && <OperationFeedback notice={notice} onDismiss={() => setNotice(null)} />}
      {items.length === 0
        ? <><div className="mb-4 flex justify-end"><Button variant="ghost" onClick={() => void query.refetch()}>Actualizar</Button></div><StatusState kind="empty" title={data.folder ? 'Esta carpeta está vacía' : 'Tu unidad está vacía'} description="Aquí aparecerán los archivos y carpetas disponibles." /></>
        : <DriveExplorer items={items} isFetching={query.isFetching} onRefresh={() => void query.refetch()} onOpenFolder={openFolder} onNotice={setNotice} />}
    </div>
    {creating && <NameDialog title="Nueva carpeta" description={folderId ? 'La carpeta se creará dentro del directorio actual.' : 'La carpeta se creará en Mi unidad.'} submitLabel="Crear carpeta" pending={operations.createFolder.isPending} serverError={operations.createFolder.error instanceof ApiError ? operations.createFolder.error.message : null} onClose={() => setCreating(false)} onValueChange={() => operations.createFolder.reset()} onSubmit={createFolder} />}
  </section>
}

function Breadcrumbs({ items, access, onNavigate, onRoot }: { items: BreadcrumbItem[]; access: AccessLevel; onNavigate: (id?: string) => void; onRoot: () => void }) {
  const shared = access !== 'OWNER'
  return <nav className="flex min-h-10 items-center gap-1 overflow-x-auto rounded-lg text-sm" aria-label="Ruta de carpetas">
    <button className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onRoot}>
      <Home className="size-4" />{shared ? 'Compartido' : 'Mi unidad'}
    </button>
    {items.map((item, index) => <span key={item.id} className="flex shrink-0 items-center gap-1">
      <ChevronRight className="size-4 text-muted-foreground" />
      <button className="max-w-48 truncate rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-foreground" onClick={() => onNavigate(item.id)} disabled={index === items.length - 1} aria-current={index === items.length - 1 ? 'page' : undefined}>{item.name}</button>
    </span>)}
  </nav>
}
