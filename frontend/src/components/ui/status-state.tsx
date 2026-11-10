import { AlertCircle, CheckCircle2, FolderOpen, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type StatusKind = 'loading' | 'error' | 'empty' | 'success'

const icons = {
  loading: <LoaderCircle className="size-8 animate-spin text-primary" />,
  error: <AlertCircle className="size-8 text-destructive" />,
  empty: <FolderOpen className="size-8 text-muted-foreground" />,
  success: <CheckCircle2 className="size-8 text-emerald-600" />,
}

export function StatusState({ kind, title, description, action, className }: { kind: StatusKind; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center', className)} role={kind === 'error' ? 'alert' : 'status'}>
      {icons[kind]}
      <h3 className="mt-4 font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
