  import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useNewFolderAction } from '@/components/layout/use-new-folder-action'
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
import { DROP_SURFACE, UploadDropZone } from '@/features/uploads/upload-drop-zone'
import { cn } from '@/lib/utils'
import type { AccessLevel, BreadcrumbItem } from '@/types/api'

export function DrivePage() {
  const [searchParams] = useSearchParams()
  const folderId = searchParams.get('folderId') || undefined
  const createRequested = searchParams.get('newFolder') === '1'
  return <DriveDirectory key={`${folderId ?? 'root'}:${createRequested}`} folderId={folderId} createRequested={createRequested} />
}

function DriveDirectory({ folderId, createRequested }: { folderId?: string; createRequested: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = useNewFolderAction()
  const query = useDriveListing(folderId)
  const operations = useDriveOperations()
  const [creating, setCreating] = useState(createRequested)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [notice, setNotice] = useState<OperationNotice | null>(() => {
    const state = location.state as { operationNotice?: OperationNotice } | null
    return state?.operationNotice ?? null
  })

  useEffect(() => {
    if (query.data?.access !== 'OWNER') return
    return register(() => { operations.createFolder.reset(); setCreating(true) })
  }, [query.data?.access, register, operations.createFolder])

  function openFolder(id: string) { navigate(`/drive?folderId=${encodeURIComponent(id)}`) }
  function goToCrumb(id?: string) { navigate(id ? `/drive?folderId=${encodeURIComponent(id)}` : '/drive') }
  function closeCreateDialog() {
    setCreating(false)
    if (createRequested) navigate(folderId ? `/drive?folderId=${encodeURIComponent(folderId)}` : '/drive', { replace: true })
  }

  async function createFolder(name: string) {
    try {
      await operations.createFolder.mutateAsync({ name, parentId: folderId })
      const success: OperationNotice = { kind: 'success', message: `Carpeta “${name}” creada correctamente.` }
      if (createRequested) {
        navigate(folderId ? `/drive?folderId=${encodeURIComponent(folderId)}` : '/drive', { replace: true, state: { operationNotice: success } })
      } else {
        setCreating(false)
        setNotice(success)
      }
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

  return <section className="flex min-h-full w-full flex-col">
    <div className="mb-3 flex min-h-12 flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        {data.folder
          ? <div className="flex items-center gap-3"><Breadcrumbs items={data.breadcrumb} access={data.access} onNavigate={goToCrumb} onRoot={() => navigate(sharedContext ? '/drive/shared' : '/drive')} />{data.access !== 'OWNER' && <AccessBadge access={data.access} />}</div>
          : <h1 className="truncate text-xl font-normal text-foreground md:text-2xl">Mi unidad</h1>}
      </div>
      <div className="flex items-center gap-2">
        {folderId && <Button className="rounded-full" variant="ghost" onClick={() => navigate(-1)}><ChevronLeft className="size-4" />Volver</Button>}
      </div>
    </div>

    <UploadDropZone className="mt-3 flex flex-1 flex-col" folderId={folderId} folderName={data.folder?.name ?? 'Mi unidad'} enabled={data.access === 'OWNER'} onTargetChange={setDropTargetId}>
      {notice && <OperationFeedback notice={notice} onDismiss={() => setNotice(null)} />}
      {items.length === 0
        ? <><div className="mb-4 flex justify-end"><Button variant="ghost" onClick={() => void query.refetch()}>Actualizar</Button></div><div className={cn(DROP_SURFACE, 'flex-1')}><StatusState kind="empty" title={data.folder ? 'Esta carpeta está vacía' : 'Tu unidad está vacía'} description="Aquí aparecerán los archivos y carpetas disponibles." /></div></>
        : <DriveExplorer items={items} isFetching={query.isFetching} onRefresh={() => void query.refetch()} onOpenFolder={openFolder} onNotice={setNotice} dropTargetId={dropTargetId} />}
    </UploadDropZone>
    {creating && data.access === 'OWNER' && <NameDialog title="Nueva carpeta" description={folderId ? 'La carpeta se creará dentro del directorio actual.' : 'La carpeta se creará en Mi unidad.'} submitLabel="Crear carpeta" pending={operations.createFolder.isPending} serverError={operations.createFolder.error instanceof ApiError ? operations.createFolder.error.message : null} onClose={closeCreateDialog} onValueChange={() => operations.createFolder.reset()} onSubmit={createFolder} />}
  </section>
}

function Breadcrumbs({ items, access, onNavigate, onRoot }: { items: BreadcrumbItem[]; access: AccessLevel; onNavigate: (id?: string) => void; onRoot: () => void }) {
  const shared = access !== 'OWNER'
  return <nav className="flex min-h-10 items-center gap-1 overflow-x-auto text-xl font-normal md:text-2xl" aria-label="Ruta de carpetas">
    <button className="inline-flex shrink-0 items-center rounded-lg px-1.5 py-1 text-[#444746] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-foreground" onClick={onRoot}>
      {shared ? 'Compartido conmigo' : 'Mi unidad'}
    </button>
    {items.map((item, index) => <span key={item.id} className="flex shrink-0 items-center gap-1">
      <ChevronRight className="size-5 text-muted-foreground" />
      <button className="max-w-64 truncate rounded-lg px-1.5 py-1 text-[#1f1f1f] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-foreground dark:text-foreground" onClick={() => onNavigate(item.id)} disabled={index === items.length - 1} aria-current={index === items.length - 1 ? 'page' : undefined}>{item.name}</button>
    </span>)}
  </nav>
}
