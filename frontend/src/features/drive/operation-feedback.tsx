import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface OperationNotice { kind: 'success' | 'error'; message: string }

export function OperationFeedback({ notice, onDismiss }: { notice: OperationNotice; onDismiss: () => void }) {
  return <div className={`mb-4 flex items-start gap-3 rounded-lg border p-3 text-sm ${notice.kind === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200' : 'border-destructive/30 bg-destructive/10 text-destructive'}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
    {notice.kind === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
    <span className="flex-1">{notice.message}</span>
    <Button variant="ghost" size="icon" className="-m-2 size-8" onClick={onDismiss} aria-label="Cerrar mensaje"><X className="size-4" /></Button>
  </div>
}
