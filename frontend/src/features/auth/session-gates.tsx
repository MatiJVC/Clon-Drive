import { LoaderCircle, RefreshCw, WifiOff } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/use-auth'

function SessionStatusScreen({ onRetry }: { onRetry?: () => void }) {
  const isError = Boolean(onRetry)
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6" role="status">
      <div className="max-w-sm text-center">
        {isError ? <WifiOff className="mx-auto size-10 text-muted-foreground" /> : <LoaderCircle className="mx-auto size-10 animate-spin text-primary" />}
        <h1 className="mt-4 text-lg font-semibold">{isError ? 'No pudimos verificar tu sesión' : 'Verificando tu sesión'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{isError ? 'Tu sesión no se eliminó. Comprueba la conexión e inténtalo nuevamente.' : 'Estamos confirmando tu identidad con el servidor.'}</p>
        {onRetry && <Button className="mt-5" onClick={onRetry}><RefreshCw className="size-4" />Reintentar</Button>}
      </div>
    </div>
  )
}

function PendingSession() {
  const { status, retryVerification } = useAuth()
  if (status === 'checking') return <SessionStatusScreen />
  if (status === 'verification-error') return <SessionStatusScreen onRetry={() => void retryVerification()} />
  return null
}

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'checking' || status === 'verification-error') return <PendingSession />
  if (status === 'unauthenticated') return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { status } = useAuth()
  if (status === 'checking' || status === 'verification-error') return <PendingSession />
  if (status === 'authenticated') return <Navigate to="/drive" replace />
  return <Outlet />
}
