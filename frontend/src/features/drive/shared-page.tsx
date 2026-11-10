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

  return <section className="w-full">
    <div className="mb-4">
      <h1 className="text-xl font-normal text-foreground md:text-2xl">Compartido conmigo</h1>
      <p className="mt-1 text-sm text-muted-foreground">Archivos y carpetas que otras personas te han permitido consultar.</p>
    </div>
    {notice && <OperationFeedback notice={notice} onDismiss={() => setNotice(null)} />}
    {items.length === 0
      ? <StatusState kind="empty" title="No hay elementos compartidos" description="Los recursos compartidos contigo aparecerán en esta sección." />
      : <DriveExplorer items={items} isFetching={query.isFetching} onRefresh={() => void query.refetch()} onOpenFolder={(id) => navigate(`/drive?folderId=${encodeURIComponent(id)}`)} onNotice={setNotice} sharedView />}
  </section>
}
