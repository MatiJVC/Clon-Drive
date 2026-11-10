import { Files, HardDrive, Menu, Share2, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { to: '/drive', label: 'Mi unidad', icon: HardDrive, end: true },
  { to: '/drive/shared', label: 'Compartido conmigo', icon: Share2, end: false },
]

export function Sidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <>
      <Button className="fixed left-3 top-3 z-30 md:hidden" variant="outline" size="icon" onClick={() => onOpenChange(true)} aria-label="Abrir navegación"><Menu className="size-5" /></Button>
      {open && <button className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => onOpenChange(false)} aria-label="Cerrar navegación" />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r bg-card p-4 transition-transform md:static md:translate-x-0', open && 'translate-x-0')}>
        <div className="flex h-14 items-center gap-3 px-2">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Files className="size-5" /></div>
          <span className="text-lg font-semibold tracking-tight">Clon Drive</span>
          <Button className="ml-auto md:hidden" variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Cerrar navegación"><X className="size-5" /></Button>
        </div>
        <nav className="mt-6 space-y-1" aria-label="Navegación principal">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => onOpenChange(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground', isActive && 'bg-accent text-accent-foreground')}>
              <Icon className="size-5" />{label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-3 text-xs leading-5 text-muted-foreground">Clon Drive · Taller Cloud Computing</p>
      </aside>
    </>
  )
}
