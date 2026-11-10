import { LoaderCircle, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ExplorerItem } from '@/features/drive/explorer-types'

export function DeleteDialog({ item, pending, error, onClose, onConfirm }: { item: ExplorerItem; pending: boolean; error?: string | null; onClose: () => void; onConfirm: () => void }) {
  const name = item.kind === 'folder' ? item.folder.name : item.file.name
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }} onKeyDown={(event) => { if (event.key === 'Escape' && !pending) onClose() }}>
    <div className="w-full max-w-[440px] rounded-3xl border bg-card p-6 shadow-[0_8px_28px_rgba(60,64,67,0.3)]" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
      <div className="flex items-start gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"><Trash2 className="size-5" /></div><div className="flex-1"><h2 id="delete-dialog-title" className="text-[22px] font-normal">Eliminar {item.kind === 'folder' ? 'carpeta' : 'archivo'}</h2><p id="delete-dialog-description" className="mt-2 text-sm leading-5 text-muted-foreground">¿Quieres eliminar “{name}”? Esta acción no se puede deshacer.</p></div><Button variant="ghost" size="icon" className="-mr-2 -mt-2 rounded-full" onClick={onClose} disabled={pending} aria-label="Cerrar"><X className="size-4" /></Button></div>
      {item.kind === 'folder' && <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">Al eliminar esta carpeta, también se eliminarán los archivos y subcarpetas que contiene.</p>}
      {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
      <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" className="rounded-full text-primary" onClick={onClose} disabled={pending}>Cancelar</Button><Button className="rounded-full" variant="destructive" onClick={onConfirm} disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />}{pending ? 'Eliminando…' : 'Eliminar'}</Button></div>
    </div>
  </div>
}
