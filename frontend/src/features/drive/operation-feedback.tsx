import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export interface OperationNotice { kind: 'success' | 'error'; message: string }

export function OperationFeedback({ notice, onDismiss }: { notice: OperationNotice; onDismiss: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, notice.kind === 'success' ? 5000 : 9000)
    return () => window.clearTimeout(timeout)
  }, [notice, onDismiss])

  return <div className="fixed bottom-5 left-4 z-[60] flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-md bg-[#303134] p-3.5 text-sm text-white shadow-xl md:left-[248px]" role={notice.kind === 'error' ? 'alert' : 'status'}>
    {notice.kind === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#a8c7fa]" /> : <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#f2b8b5]" />}
    <span className="flex-1">{notice.message}</span>
    <Button variant="ghost" size="icon" className="-m-2 size-8 text-white hover:bg-white/10 hover:text-white" onClick={onDismiss} aria-label="Cerrar mensaje"><X className="size-4" /></Button>
  </div>
}
