import { Download, FolderOpen, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ExplorerItem } from '@/features/drive/explorer-types'

export type ItemAction = 'open' | 'download' | 'rename' | 'delete'

export function ItemActionsMenu({ item, onAction }: { item: ExplorerItem; onAction: (action: ItemAction, item: ExplorerItem) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const canEdit = item.access === 'OWNER' || item.access === 'EDIT'
  const canDownload = item.kind === 'file' && item.file.status === 'READY'
  const hasActions = item.kind === 'folder' || canDownload || canEdit

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape) }
  }, [open])

  if (!hasActions) return null
  const action = (event: MouseEvent<HTMLButtonElement>, value: ItemAction) => {
    event.stopPropagation()
    setOpen(false)
    onAction(value, item)
  }

  return <div ref={rootRef} className="relative z-20" onClick={(event) => event.stopPropagation()}>
    <button className="grid size-8 place-items-center rounded-full text-foreground hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/10" onClick={() => setOpen((value) => !value)} aria-label="Acciones del elemento" aria-haspopup="menu" aria-expanded={open}><MoreVertical className="size-[18px]" /></button>
    {open && <div className="absolute right-0 top-9 z-40 w-60 overflow-hidden rounded-lg border bg-card py-2 shadow-[0_4px_16px_rgba(60,64,67,0.28)]" role="menu">
      {item.kind === 'folder' && <MenuButton icon={FolderOpen} onClick={(event) => action(event, 'open')}>Abrir</MenuButton>}
      {canDownload && <MenuButton icon={Download} onClick={(event) => action(event, 'download')}>Descargar</MenuButton>}
      {(item.kind === 'folder' || canDownload) && canEdit && <div className="my-1 border-t" />}
      {canEdit && <MenuButton icon={Pencil} onClick={(event) => action(event, 'rename')}>Cambiar nombre</MenuButton>}
      {canEdit && <><div className="my-1 border-t" /><MenuButton icon={Trash2} destructive onClick={(event) => action(event, 'delete')}>Eliminar permanentemente</MenuButton></>}
    </div>}
  </div>
}

function MenuButton({ icon: Icon, destructive = false, children, onClick }: { icon: typeof Download; destructive?: boolean; children: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return <Button className={`h-10 w-full justify-start rounded-none px-4 text-sm font-normal hover:bg-secondary ${destructive ? 'text-destructive hover:text-destructive' : ''}`} variant="ghost" onClick={onClick} role="menuitem"><Icon className="size-[18px]" />{children}</Button>
}
