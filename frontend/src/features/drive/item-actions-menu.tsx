import { Download, FolderOpen, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import type { MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { ExplorerItem } from '@/features/drive/explorer-types'

export type ItemAction = 'open' | 'download' | 'rename' | 'delete'

export function ItemActionsMenu({ item, onAction }: { item: ExplorerItem; onAction: (action: ItemAction, item: ExplorerItem) => void }) {
  const canEdit = item.access === 'OWNER' || item.access === 'EDIT'
  const canDownload = item.kind === 'file' && item.file.status === 'READY'
  const hasActions = item.kind === 'folder' || canDownload || canEdit
  if (!hasActions) return null

  function stop(event: MouseEvent) { event.stopPropagation() }
  const action = (event: MouseEvent<HTMLButtonElement>, value: ItemAction) => {
    event.stopPropagation()
    event.currentTarget.closest('details')?.removeAttribute('open')
    onAction(value, item)
  }

  return <details className="relative z-20" onClick={stop}>
    <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Acciones del elemento"><MoreVertical className="size-4" /></summary>
    <div className="absolute right-0 top-10 z-30 w-48 rounded-lg border bg-card p-1.5 shadow-lg">
      {item.kind === 'folder' && <MenuButton icon={FolderOpen} onClick={(event) => action(event, 'open')}>Abrir</MenuButton>}
      {canDownload && <MenuButton icon={Download} onClick={(event) => action(event, 'download')}>Descargar</MenuButton>}
      {canEdit && <MenuButton icon={Pencil} onClick={(event) => action(event, 'rename')}>Cambiar nombre</MenuButton>}
      {canEdit && <MenuButton icon={Trash2} destructive onClick={(event) => action(event, 'delete')}>Eliminar</MenuButton>}
    </div>
  </details>
}

function MenuButton({ icon: Icon, destructive = false, children, onClick }: { icon: typeof Download; destructive?: boolean; children: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return <Button className={`w-full justify-start ${destructive ? 'text-destructive hover:text-destructive' : ''}`} variant="ghost" size="sm" onClick={onClick}><Icon className="size-4" />{children}</Button>
}
