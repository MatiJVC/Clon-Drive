import { LogOut, Menu, Search, SlidersHorizontal, UserRound } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { DriveLogo } from '@/components/layout/drive-logo'
import { NewFolderActionContext, type NewFolderActionContextValue } from '@/components/layout/new-folder-action-value'
import { Sidebar } from '@/components/layout/sidebar'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/use-auth'
import { UploadPanel } from '@/features/uploads/upload-panel'
import { UploadProvider } from '@/features/uploads/upload-provider'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const newFolderAction = useRef<(() => void) | null>(null)

  const register = useCallback((action: (() => void) | null) => {
    newFolderAction.current = action
    return () => { if (newFolderAction.current === action) newFolderAction.current = null }
  }, [])

  const request = useCallback(() => {
    if (newFolderAction.current) newFolderAction.current()
    else navigate('/drive?newFolder=1')
  }, [navigate])

  const layoutActions = useMemo<NewFolderActionContextValue>(() => ({
    register,
    request,
  }), [register, request])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <NewFolderActionContext.Provider value={layoutActions}>
      {/* key: al cambiar de usuario el gestor se reinicia y no filtra cargas entre sesiones */}
      <UploadProvider key={user?.id ?? 'anon'}>
      <div className="flex h-screen min-h-[32rem] flex-col overflow-hidden bg-background">
        <header className="relative z-30 flex h-16 shrink-0 items-center gap-3 px-3 md:gap-5 md:px-4">
          <div className="flex w-auto shrink-0 items-center gap-2 md:w-[216px]">
            <Button className="md:hidden" variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Abrir navegación"><Menu className="size-5" /></Button>
            <DriveLogo className="size-9" />
            <span className="hidden text-[22px] font-normal text-[#444746] dark:text-foreground sm:block">Ñrive</span>
          </div>
          <div className="flex min-w-0 flex-1 justify-center">
            <div className="flex h-12 w-full max-w-[720px] items-center rounded-full bg-[var(--drive-search)] px-4 text-[#444746] shadow-sm dark:text-muted-foreground" role="search" aria-label="Buscar en Ñrive (no disponible)" aria-disabled="true" title="La búsqueda todavía no está disponible">
              <Search className="size-5 shrink-0" />
              <span className="ml-3 flex-1 truncate text-base">Buscar en Ñrive</span>
              <SlidersHorizontal className="size-5 shrink-0" aria-hidden="true" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 md:gap-2">
            <ThemeToggle />
            <details className="group relative">
              <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full bg-[#0b57d0] text-sm font-medium text-white outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" aria-label="Menú de usuario">
                {user?.username.slice(0, 2).toUpperCase() || <UserRound className="size-5" />}
              </summary>
              <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border bg-card p-2 shadow-xl">
                <div className="px-3 py-3">
                  <p className="text-xs text-muted-foreground">Sesión iniciada como</p>
                  <p className="mt-1 truncate text-sm font-medium">{user?.username}</p>
                </div>
                <div className="border-t pt-1"><Button className="w-full justify-start rounded-full" variant="ghost" onClick={() => void handleLogout()}><LogOut className="size-4" />Cerrar sesión</Button></div>
              </div>
            </details>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 gap-2 px-2 pb-2 md:gap-3 md:pl-0 md:pr-2">
          <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} onNewFolder={layoutActions.request} />
          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-2xl bg-[var(--drive-surface)] p-4 shadow-[0_1px_2px_rgba(60,64,67,0.08)] md:p-5 lg:p-6"><Outlet /></main>
        </div>
      </div>
      <UploadPanel />
      </UploadProvider>
    </NewFolderActionContext.Provider>
  )
}
