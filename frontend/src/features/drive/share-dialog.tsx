import { useQuery } from '@tanstack/react-query'
import { Check, HelpCircle, Link as LinkIcon, LoaderCircle, Trash2, User as UserIcon, X } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { queryKeys } from '@/app/query-keys'
import { Button } from '@/components/ui/button'
import type { ExplorerItem } from '@/features/drive/explorer-types'
import type { OperationNotice } from '@/features/drive/operation-feedback'
import { ApiError } from '@/services/api/errors'
import { sharesApi } from '@/services/api/shares'
import { usersApi } from '@/services/api/users'
import type { SharePermission, User } from '@/types/api'

interface ShareDialogProps {
  item: ExplorerItem
  onClose: () => void
  onNotice: (notice: OperationNotice) => void
}

export function ShareDialog({ item, onClose, onNotice }: ShareDialogProps) {
  const name = item.kind === 'folder' ? item.folder.name : item.file.name
  const isFile = item.kind === 'file'
  const target = useMemo(
    () => (isFile ? { fileId: item.id } : { folderId: item.id }),
    [isFile, item.id],
  )

  const [username, setUsername] = useState('')
  const [permission, setPermission] = useState<SharePermission>('READ')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Consulta de usuarios con acceso actual mediante TanStack Query
  const {
    data: shares = [],
    isLoading: loadingShares,
    refetch: refetchShares,
  } = useQuery({
    queryKey: queryKeys.shares.target(isFile ? 'file' : 'folder', item.id),
    queryFn: ({ signal }) => sharesApi.list(target, signal),
  })

  // Autocompletado de usuarios
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimeout = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleUsernameChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value
    setUsername(value)
    setError(null)

    if (searchTimeout.current) window.clearTimeout(searchTimeout.current)

    const query = value.trim()
    if (!query) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoadingSuggestions(true)
    searchTimeout.current = window.setTimeout(async () => {
      try {
        const results = await usersApi.search(query)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 250)
  }

  function selectUser(user: User) {
    setUsername(user.username)
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const targetUsername = username.trim()
    if (!targetUsername) return

    setSubmitting(true)
    setError(null)
    try {
      await sharesApi.create({
        username: targetUsername,
        permission,
        ...target,
      })
      onNotice({
        kind: 'success',
        message: `Acceso otorgado a "${targetUsername}" (${permission === 'EDIT' ? 'Editor' : 'Lector'}).`,
      })
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No fue posible compartir el elemento')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateShare(shareId: string, nextPerm: SharePermission) {
    try {
      await sharesApi.update(shareId, nextPerm)
      await refetchShares()
      onNotice({ kind: 'success', message: 'Permiso actualizado correctamente.' })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No fue posible actualizar el permiso')
    }
  }

  async function handleRemoveShare(shareId: string, sharedUsername: string) {
    try {
      await sharesApi.remove(shareId)
      await refetchShares()
      onNotice({
        kind: 'success',
        message: `Se quitó el acceso a "${sharedUsername}".`,
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No fue posible quitar el acceso')
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !submitting) onClose()
      }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-[560px] rounded-[28px] border bg-card p-6 shadow-[0_8px_28px_rgba(60,64,67,0.3)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 id="share-dialog-title" className="truncate text-xl font-normal text-foreground">
              Enviar el vínculo de &ldquo;{name}&rdquo;
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Enviarás acceso directo con el vínculo al siguiente {isFile ? 'documento' : 'directorio'}.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              title="Ayuda sobre uso compartido"
              aria-label="Ayuda"
            >
              <HelpCircle className="size-4" />
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-2 size-8 rounded-full"
              onClick={onClose}
              disabled={submitting}
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Formulario */}
        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          {/* Caja con borde azul estilo Google Drive */}
          <div className="relative rounded-2xl border-2 border-primary bg-background p-3 transition-colors">
            <label
              htmlFor="share-username-input"
              className="block text-xs font-medium text-primary"
            >
              Agrega personas para enviarles el vínculo
            </label>

            <div className="mt-1.5 flex items-center gap-2">
              <input
                ref={inputRef}
                id="share-username-input"
                type="text"
                placeholder="Nombre de usuario..."
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                value={username}
                onChange={handleUsernameChange}
                disabled={submitting}
                autoComplete="off"
              />

              {loadingSuggestions && (
                <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
              )}

              {/* Selector de rol */}
              <select
                className="h-8 rounded-lg border bg-secondary px-2 text-xs font-medium text-foreground outline-none hover:bg-accent"
                value={permission}
                onChange={(event) => setPermission(event.target.value as SharePermission)}
                disabled={submitting}
                aria-label="Permiso a otorgar"
              >
                <option value="READ">Lector</option>
                <option value="EDIT">Editor</option>
              </select>
            </div>

            {/* Menú flotante de autocompletado */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border bg-card py-1 shadow-lg"
                role="listbox"
              >
                {suggestions.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => selectUser(u)}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#7e57c2] text-xs font-medium uppercase text-white">
                      {u.username.charAt(0)}
                    </span>
                    <span className="truncate font-medium">{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          {/* Sección Personas con acceso */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Personas con acceso
            </h3>

            <div className="mt-2.5 max-h-40 space-y-2 overflow-y-auto pr-1">
              {/* Propietario (usuario actual) */}
              <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0b57d0] text-xs font-medium uppercase text-white">
                    <UserIcon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">Tú</p>
                    <p className="truncate text-xs text-muted-foreground">Propietario del elemento</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground">Propietario</span>
              </div>

              {/* Lista de usuarios compartidos */}
              {loadingShares ? (
                <div className="flex items-center justify-center py-3">
                  <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#7e57c2] text-xs font-medium uppercase text-white">
                        {share.username.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{share.username}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {share.permission === 'EDIT' ? 'Editor' : 'Lector'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <select
                        className="h-8 rounded-lg border bg-secondary px-2 text-xs font-medium text-foreground outline-none hover:bg-accent"
                        value={share.permission}
                        onChange={(event) =>
                          handleUpdateShare(share.id, event.target.value as SharePermission)
                        }
                      >
                        <option value="READ">Lector</option>
                        <option value="EDIT">Editor</option>
                      </select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveShare(share.id, share.username)}
                        title="Quitar acceso"
                        aria-label={`Quitar acceso a ${share.username}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pie de diálogo */}
          <div className="flex items-center justify-end border-t pt-4">

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full text-xs font-medium text-primary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-full px-6 text-xs font-medium"
                disabled={submitting || !username.trim()}
              >
                {submitting && <LoaderCircle className="size-3.5 animate-spin" />}
                {submitting ? 'Compartiendo…' : 'Enviar'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
