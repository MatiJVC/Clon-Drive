import { LogOut, Search, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/sidebar'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/use-auth'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-background/95 px-4 pl-16 backdrop-blur md:px-6">
          <div className="relative max-w-2xl flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className="h-10 w-full rounded-lg border bg-secondary/60 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Buscar en Drive (próxima fase)" disabled aria-label="Buscar" />
          </div>
          <ThemeToggle />
          <details className="group relative">
            <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" aria-label="Menú de usuario">
              {user?.username.slice(0, 2).toUpperCase() || <UserRound className="size-5" />}
            </summary>
            <div className="absolute right-0 top-12 z-30 w-56 rounded-xl border bg-card p-2 shadow-lg">
              <div className="border-b px-3 py-2">
                <p className="text-xs text-muted-foreground">Sesión iniciada como</p>
                <p className="truncate text-sm font-medium">{user?.username}</p>
              </div>
              <Button className="mt-2 w-full justify-start" variant="ghost" onClick={() => void handleLogout()}><LogOut className="size-4" />Cerrar sesión</Button>
            </div>
          </details>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
