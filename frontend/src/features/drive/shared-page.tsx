import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { StatusState } from '@/components/ui/status-state'
import { DriveExplorer } from '@/features/drive/drive-explorer'
import { ExplorerError, ExplorerLoading } from '@/features/drive/explorer-states'
import type { ExplorerItem } from '@/features/drive/explorer-types'
import { OperationFeedback, type OperationNotice } from '@/features/drive/operation-feedback'
import { useSharedListing } from '@/features/drive/drive-queries'

export function SharedPage() {
  const navigate = useNavigate()
  const query = useSharedListing()
  const [notice, setNotice] = useState<OperationNotice | null>(null)
  if (query.isPending) return <ExplorerLoading />
  if (query.isError) return <ExplorerError error={query.error} onRetry={() => void query.refetch()} />

  const items: ExplorerItem[] = [
    ...query.data.folders.map((folder) => ({ kind: 'folder' as const, id: folder.id, folder, access: folder.permission, ownerUsername: folder.ownerUsername })),
    ...query.data.files.map((file) => ({ kind: 'file' as const, id: file.id, file, access: file.permission, ownerUsername: file.ownerUsername })),
  ]

  return <section className="mx-auto max-w-7xl">
    <div className="mb-6">
      <p className="text-sm font-medium text-primary">Espacio de trabajo</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Compartido conmigo</h1>
      <p className="mt-2 text-sm text-muted-foreground">Archivos y carpetas que otras personas te han permitido consultar.</p>
    </div>
    {notice && <OperationFeedback notice={notice} onDismiss={() => setNotice(null)} />}
    {items.length === 0
      ? <StatusState kind="empty" title="No hay elementos compartidos" description="Los recursos compartidos contigo aparecerán en esta sección." />
      : <DriveExplorer items={items} isFetching={query.isFetching} onRefresh={() => void query.refetch()} onOpenFolder={(id) => navigate(`/drive?folderId=${encodeURIComponent(id)}`)} onNotice={setNotice} />}
  </section>
}
