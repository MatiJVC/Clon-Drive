import { useQueryClient } from '@tanstack/react-query'
import { FileUp, FolderPlus, HardDrive, Plus, Share2, X } from 'lucide-react'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { queryKeys } from '@/app/query-keys'
import { useNewFolderAction } from '@/components/layout/use-new-folder-action'
import { Button } from '@/components/ui/button'
import { useUploads } from '@/features/uploads/upload-context'
import { cn } from '@/lib/utils'
import type { DriveListing } from '@/types/api'

const links = [
  { to: '/drive', label: 'Mi unidad', icon: HardDrive, end: true },
  { to: '/drive/shared', label: 'Compartido conmigo', icon: Share2, end: false },
]

export function Sidebar({
  open,
  onOpenChange,
  onNewFolder,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNewFolder?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { request } = useNewFolderAction()
  const { enqueue } = useUploads()

  useEffect(() => {
    if (!menuOpen) return
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [menuOpen])

  const isSharedSection = location.pathname.startsWith('/drive/shared')
  const folderId = location.pathname === '/drive' ? searchParams.get('folderId') || undefined : undefined
  const listing = folderId ? queryClient.getQueryData<DriveListing>(queryKeys.drive.listing(folderId)) : undefined
  const folderName = listing?.folder?.name ?? (folderId ? 'Carpeta' : 'Mi unidad')
  const isOwner = folderId ? listing?.access === 'OWNER' : true
  const canPerformActions = isSharedSection ? true : isOwner

  function handleNewFolder() {
    setMenuOpen(false)
    onOpenChange(false)
    if (isSharedSection) {
      navigate('/drive?newFolder=1')
    } else if (onNewFolder) {
      onNewFolder()
    } else {
      request()
    }
  }

  function handleUploadClick() {
    setMenuOpen(false)
    onOpenChange(false)
    fileInputRef.current?.click()
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    if (isSharedSection) {
      navigate('/drive')
      enqueue(files, {
        folderId: undefined,
        name: 'Mi unidad',
      })
    } else if (canPerformActions) {
      enqueue(files, {
        folderId,
        name: folderName,
      })
    }
    event.target.value = ''
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
        aria-hidden="true"
      />
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar navegación"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[232px] -translate-x-full flex-col bg-background px-3 py-4 shadow-xl transition-transform md:static md:z-auto md:w-[232px] md:translate-x-0 md:shadow-none',
          open && 'translate-x-0',
        )}
      >
        <div className="mb-4 flex items-center justify-between md:hidden">
          <span className="px-2 text-lg font-medium">Navegación</span>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Cerrar navegación">
            <X className="size-5" />
          </Button>
        </div>

        <div className="relative mb-5" ref={menuRef}>
          <Button
            className="h-14 w-[112px] justify-start gap-3 rounded-2xl border-0 bg-card px-4 text-foreground shadow-[0_1px_3px_1px_rgba(60,64,67,0.15)] hover:bg-secondary hover:shadow-[0_2px_5px_1px_rgba(60,64,67,0.18)]"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Menú Nuevo"
          >
            <Plus className="size-6" />
            Nuevo
          </Button>

          {menuOpen && (
            <div
              className="absolute left-0 top-[60px] z-50 w-64 overflow-hidden rounded-2xl border border-border/60 bg-card py-2 shadow-[0_4px_16px_rgba(60,64,67,0.28)]"
              role="menu"
              aria-label="Crear o subir"
            >
              <button
                type="button"
                className={cn(
                  'flex h-11 w-full items-center gap-3.5 px-4 text-left text-sm text-foreground transition-colors hover:bg-muted/70',
                  !canPerformActions && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                )}
                onClick={canPerformActions ? handleNewFolder : undefined}
                disabled={!canPerformActions}
                title={!canPerformActions ? 'Solo el propietario puede crear carpetas aquí' : undefined}
                role="menuitem"
              >
                <FolderPlus className="size-5 shrink-0 text-[#444746] dark:text-muted-foreground" />
                <span className="flex-1 font-medium">Carpeta nueva</span>
              </button>

              <div className="my-1.5 border-t border-border/50" />

              <button
                type="button"
                className={cn(
                  'flex h-11 w-full items-center gap-3.5 px-4 text-left text-sm text-foreground transition-colors hover:bg-muted/70',
                  !canPerformActions && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                )}
                onClick={canPerformActions ? handleUploadClick : undefined}
                disabled={!canPerformActions}
                title={!canPerformActions ? 'Solo el propietario puede subir archivos aquí' : undefined}
                role="menuitem"
              >
                <FileUp className="size-5 shrink-0 text-[#444746] dark:text-muted-foreground" />
                <span className="flex-1 font-medium">Subir archivo</span>
              </button>
            </div>
          )}
        </div>

        <nav className="space-y-1" aria-label="Navegación principal">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => onOpenChange(false)}
              className={({ isActive }) =>
                cn(
                  'flex min-h-10 items-center gap-4 rounded-full px-4 py-2 text-sm font-medium text-[#444746] transition-colors hover:bg-[var(--drive-hover)] dark:text-foreground',
                  isActive && 'bg-accent text-accent-foreground hover:bg-accent',
                )
              }
            >
              <Icon className="size-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-5 border-t px-4 pt-4">
          <p className="text-xs leading-5 text-muted-foreground">
            Clon Drive
            <br />
            Taller Cloud Computing
          </p>
        </div>
      </aside>
    </>
  )
}
