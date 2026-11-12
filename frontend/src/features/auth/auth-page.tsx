import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { DriveLogo } from '@/components/layout/drive-logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/use-auth'
import { ApiError } from '@/services/api/errors'

type Mode = 'login' | 'register'
type Fields = { username: string; password: string; confirmation: string }
type FieldErrors = Partial<Record<keyof Fields, string>>

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/

function validate(mode: Mode, fields: Fields): FieldErrors {
  const errors: FieldErrors = {}
  if (!fields.username) errors.username = 'Ingresa tu nombre de usuario.'
  else if (fields.username.length < 3 || fields.username.length > 30) errors.username = 'Debe tener entre 3 y 30 caracteres.'
  else if (!USERNAME_PATTERN.test(fields.username)) errors.username = 'Usa solo letras, números, punto, guion o guion bajo.'
  if (!fields.password) errors.password = 'Ingresa tu contraseña.'
  else if (fields.password.length < 6 || fields.password.length > 100) errors.password = 'Debe tener entre 6 y 100 caracteres.'
  if (mode === 'register') {
    if (!fields.confirmation) errors.confirmation = 'Confirma tu contraseña.'
    else if (fields.password !== fields.confirmation) errors.confirmation = 'Las contraseñas no coinciden.'
  }
  return errors
}

function destinationFrom(state: unknown) {
  if (!state || typeof state !== 'object' || !('from' in state)) return '/drive'
  const from = (state as { from?: { pathname?: unknown } }).from
  return typeof from?.pathname === 'string' && from.pathname.startsWith('/drive') ? from.pathname : '/drive'
}

export function AuthPage({ mode }: { mode: Mode }) {
  const isLogin = mode === 'login'
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [fields, setFields] = useState<Fields>({ username: '', password: '', confirmation: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [requestError, setRequestError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function update(field: keyof Fields, value: string) {
    setFields((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setRequestError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const nextErrors = validate(mode, fields)
    setErrors(nextErrors)
    setRequestError(null)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      const credentials = { username: fields.username, password: fields.password }
      if (isLogin) await login(credentials)
      else await register(credentials)
      navigate(destinationFrom(location.state), { replace: true })
    } catch (error) {
      setRequestError(error instanceof ApiError ? error.message : 'No fue posible completar la solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <DriveLogo className="size-10" />
          <span className="text-xl font-semibold tracking-tight">Ñrive</span>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</CardTitle>
            <p className="text-sm text-muted-foreground">{isLogin ? 'Ingresa tus credenciales para acceder a tu unidad.' : 'Regístrate para comenzar a organizar tus archivos.'}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Field label="Nombre de usuario" error={errors.username}>
                <Input id="username" name="username" autoComplete="username" value={fields.username} onChange={(e) => update('username', e.target.value)} disabled={submitting} aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? 'username-error' : undefined} autoFocus />
              </Field>
              <Field label="Contraseña" error={errors.password}>
                <div className="relative">
                  <Input id="password" className="pr-11" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} value={fields.password} onChange={(e) => update('password', e.target.value)} disabled={submitting} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} />
                  <button type="button" className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>
              {!isLogin && <Field label="Confirmar contraseña" error={errors.confirmation}>
                <Input id="confirmation" name="confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={fields.confirmation} onChange={(e) => update('confirmation', e.target.value)} disabled={submitting} aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? 'confirmation-error' : undefined} />
              </Field>}
              {requestError && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{requestError}</div>}
              <Button className="w-full" type="submit" disabled={submitting}>
                {submitting && <LoaderCircle className="size-4 animate-spin" />}{submitting ? (isLogin ? 'Iniciando sesión…' : 'Creando cuenta…') : (isLogin ? 'Iniciar sesión' : 'Crear cuenta')}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}{' '}
              <Link className="font-medium text-primary hover:underline" to={isLogin ? '/register' : '/login'} state={location.state}>{isLogin ? 'Regístrate' : 'Inicia sesión'}</Link>
            </p>
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs text-muted-foreground">Tu contraseña nunca se almacena en este navegador.</p>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  const id = label === 'Nombre de usuario' ? 'username' : label === 'Contraseña' ? 'password' : 'confirmation'
  return <div className="space-y-2"><label className="text-sm font-medium" htmlFor={id}>{label}</label>{children}{error && <p id={`${id}-error`} className="text-sm text-destructive">{error}</p>}</div>
}
