import { HardDrive, Plus, Share2, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { to: '/drive', label: 'Mi unidad', icon: HardDrive, end: true },
  { to: '/drive/shared', label: 'Compartido conmigo', icon: Share2, end: false },
]

export function Sidebar({ open, onOpenChange, onNewFolder }: { open: boolean; onOpenChange: (open: boolean) => void; onNewFolder: () => void }) {
  return (
    <>
      {open && <button className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => onOpenChange(false)} aria-label="Cerrar navegación" />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[232px] -translate-x-full flex-col bg-background px-3 py-4 shadow-xl transition-transform md:static md:z-auto md:w-[232px] md:translate-x-0 md:shadow-none', open && 'translate-x-0')}>
        <div className="mb-4 flex items-center justify-between md:hidden">
          <span className="px-2 text-lg font-medium">Navegación</span>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Cerrar navegación"><X className="size-5" /></Button>
        </div>
        <Button className="mb-5 h-14 w-[112px] justify-start gap-3 rounded-2xl border-0 bg-card px-4 text-foreground shadow-[0_1px_3px_1px_rgba(60,64,67,0.15)] hover:bg-secondary hover:shadow-[0_2px_5px_1px_rgba(60,64,67,0.18)]" onClick={() => { onNewFolder(); onOpenChange(false) }}><Plus className="size-6" />Nuevo</Button>
        <nav className="space-y-1" aria-label="Navegación principal">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => onOpenChange(false)} className={({ isActive }) => cn('flex min-h-10 items-center gap-4 rounded-full px-4 py-2 text-sm font-medium text-[#444746] transition-colors hover:bg-[var(--drive-hover)] dark:text-foreground', isActive && 'bg-accent text-accent-foreground hover:bg-accent')}>
              <Icon className="size-[18px]" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-5 border-t px-4 pt-4"><p className="text-xs leading-5 text-muted-foreground">Clon Drive<br />Taller Cloud Computing</p></div>
      </aside>
    </>
  )
}
