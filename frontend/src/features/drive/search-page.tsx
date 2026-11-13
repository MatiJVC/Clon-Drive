import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { StatusState } from '@/components/ui/status-state'
import { DriveExplorer } from '@/features/drive/drive-explorer'
import { useDriveSearch } from '@/features/drive/drive-queries'
import { ExplorerError, ExplorerLoading } from '@/features/drive/explorer-states'
import type { ExplorerItem } from '@/features/drive/explorer-types'
import { OperationFeedback, type OperationNotice } from '@/features/drive/operation-feedback'

// Resultados de la barra de búsqueda: busca por nombre en Mi unidad y en lo
// compartido conmigo (incluido el contenido de carpetas compartidas).
export function SearchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q')?.trim() ?? ''
  const query = useDriveSearch(q)
  const [notice, setNotice] = useState<OperationNotice | null>(null)

  const header = <div className="mb-4">
    <h1 className="text-xl font-normal text-foreground md:text-2xl">Resultados de búsqueda</h1>
    {q && <p className="mt-1 text-sm text-muted-foreground">Elementos cuyo nombre contiene “{q}”.</p>}
  </div>

  if (!q) return <section className="w-full">{header}<StatusState kind="empty" title="Escribe en la barra de búsqueda" description="Busca carpetas y archivos por su nombre." /></section>
  if (query.isPending) return <ExplorerLoading />
  if (query.isError) return <ExplorerError error={query.error} onRetry={() => void query.refetch()} />

  const items: ExplorerItem[] = [
    ...query.data.folders.map((folder) => ({ kind: 'folder' as const, id: folder.id, folder, access: folder.access, ownerUsername: folder.ownerUsername })),
    ...query.data.files.map((file) => ({ kind: 'file' as const, id: file.id, file, access: file.access, ownerUsername: file.ownerUsername })),
  ]

  return <section className="flex min-h-full w-full flex-col">
    {header}
    {notice && <OperationFeedback notice={notice} onDismiss={() => setNotice(null)} />}
    {items.length === 0
      ? <StatusState kind="empty" title="No se encontraron resultados" description={`Ningún archivo o carpeta contiene “${q}” en su nombre.`} />
      : <DriveExplorer key={q} items={items} isFetching={query.isFetching} onRefresh={() => void query.refetch()} onOpenFolder={(id) => navigate(`/drive?folderId=${encodeURIComponent(id)}`)} onNotice={setNotice} />}
  </section>
}
