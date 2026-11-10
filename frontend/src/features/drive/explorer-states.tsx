import { Button } from '@/components/ui/button'
import { StatusState } from '@/components/ui/status-state'
import { ApiError } from '@/services/api/errors'

export function ExplorerLoading() {
  return <div className="space-y-3" role="status" aria-label="Cargando contenido">
    <div className="h-14 animate-pulse rounded-xl bg-muted" />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-xl bg-muted" />)}
    </div>
  </div>
}

export function ExplorerError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const apiError = error instanceof ApiError ? error : null
  const title = apiError?.status === 403
    ? 'No tienes permiso para ver este contenido'
    : apiError?.status === 404
      ? 'No encontramos esta carpeta'
      : apiError?.status === 400
        ? 'La ubicación solicitada no es válida'
        : 'No pudimos cargar el contenido'
  const description = apiError?.message ?? 'Ocurrió un problema inesperado.'
  return <StatusState kind="error" title={title} description={description} action={<Button variant="outline" onClick={onRetry}>Intentar nuevamente</Button>} />
}
