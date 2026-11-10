import { LoaderCircle, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function validateName(value: string) {
  const name = value.trim()
  if (!name) return 'El nombre es obligatorio.'
  if (name.length > 255) return 'El nombre no puede superar 255 caracteres.'
  if (/[\\/]/.test(name)) return 'El nombre no puede contener / ni \\.'
  return null
}

export function NameDialog({ title, description, initialName = '', submitLabel, pending, serverError, onClose, onValueChange, onSubmit }: { title: string; description: string; initialName?: string; submitLabel: string; pending: boolean; serverError?: string | null; onClose: () => void; onValueChange?: () => void; onSubmit: (name: string) => Promise<void> }) {
  const [value, setValue] = useState(initialName)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const validation = validateName(value)
    setError(validation)
    if (validation) return
    await onSubmit(value.trim())
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }} onKeyDown={(event) => { if (event.key === 'Escape' && !pending) onClose() }}>
    <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="name-dialog-title">
      <div className="flex items-start gap-4"><div className="flex-1"><h2 id="name-dialog-title" className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Button variant="ghost" size="icon" className="-mr-2 -mt-2" onClick={onClose} disabled={pending} aria-label="Cerrar"><X className="size-4" /></Button></div>
      <form className="mt-5" onSubmit={submit} noValidate>
        <label className="text-sm font-medium" htmlFor="resource-name">Nombre</label>
        <Input id="resource-name" className="mt-2" value={value} onChange={(event) => { setValue(event.target.value); setError(null); onValueChange?.() }} disabled={pending} autoFocus maxLength={255} aria-invalid={Boolean(error || serverError)} aria-describedby={error || serverError ? 'resource-name-error' : undefined} />
        {(error || serverError) && <p id="resource-name-error" className="mt-2 text-sm text-destructive" role="alert">{error || serverError}</p>}
        <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button><Button type="submit" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />}{pending ? 'Guardando…' : submitLabel}</Button></div>
      </form>
    </div>
  </div>
}
