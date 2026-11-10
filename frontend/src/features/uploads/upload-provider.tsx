import { useQueryClient } from '@tanstack/react-query'
import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { queryKeys } from '@/app/query-keys'
import { ApiError } from '@/services/api/errors'
import { filesApi } from '@/services/api/files'
import type { DriveFile } from '@/types/api'
import { TERMINAL_STATUSES, UploadContext, type UploadContextValue, type UploadDestination, type UploadItem } from '@/features/uploads/upload-context'

const MAX_CONCURRENT = 3
const POLL_MS = 1500
const MAX_POLL_BACKOFF_MS = 10_000

function uploadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo subir el archivo'
  if (error.status === 413) return 'El archivo supera el tamaño máximo permitido'
  if (error.status === 403) return 'No tienes permiso para subir en esta carpeta'
  if (error.status === 404) return 'La carpeta de destino ya no existe'
  if (error.status === 401) return 'Tu sesión expiró'
  return error.message
}

// Gestor de cargas: cola local con concurrencia limitada, progreso HTTP,
// seguimiento del procesamiento SQS por polling y cancelación.
// Se monta en el layout autenticado para sobrevivir a la navegación; al
// desmontarse (logout) aborta transferencias y detiene el polling.
export function UploadProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<UploadItem[]>([])
  const itemsRef = useRef(items)
  const files = useRef(new Map<string, File>())
  const controllers = useRef(new Map<string, AbortController>())
  const timers = useRef(new Map<string, number>())
  const started = useRef(new Set<string>())
  const mounted = useRef(true)

  useEffect(() => { itemsRef.current = items }, [items])

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    if (!mounted.current) return
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item))
  }, [])

  const refreshExplorer = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.drive.all })
  }, [queryClient])

  const applyRemote = useCallback((id: string, remote: Pick<DriveFile, 'status'>) => {
    const status = remote.status
    if (status === 'READY') patch(id, { status: 'COMPLETED', backendStatus: status, warning: undefined })
    else if (status === 'FAILED') patch(id, { status: 'ERROR', backendStatus: status, error: 'Error al procesar', warning: undefined })
    else if (status === 'CANCELLED') patch(id, { status: 'CANCELLED', backendStatus: status, warning: undefined })
    else { patch(id, { status: 'PROCESSING', backendStatus: status }); return false }
    refreshExplorer()
    return true
  }, [patch, refreshExplorer])

  const poll = useCallback(function schedulePoll(id: string, fileId: string, failures = 0) {
    const delay = failures === 0 ? POLL_MS : Math.min(POLL_MS * 2 ** failures, MAX_POLL_BACKOFF_MS)
    const timer = window.setTimeout(async () => {
      timers.current.delete(id)
      if (!mounted.current) return
      const current = itemsRef.current.find((item) => item.id === id)
      if (!current || TERMINAL_STATUSES.includes(current.status)) return
      // Mientras se resuelve una cancelación, no pisar su resultado.
      if (current.status === 'CANCELLING') { schedulePoll(id, fileId); return }
      try {
        const remote = await filesApi.details(fileId)
        if (!applyRemote(id, remote)) schedulePoll(id, fileId)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          patch(id, { status: 'CANCELLED', warning: undefined })
          refreshExplorer()
          return
        }
        if (error instanceof ApiError && error.status === 401) return
        // Error temporal: no declarar fallo, seguir intentando con backoff.
        patch(id, { warning: 'No se pudo verificar el estado; reintentando…' })
        schedulePoll(id, fileId, failures + 1)
      }
    }, delay)
    timers.current.set(id, timer)
  }, [applyRemote, patch, refreshExplorer])

  const start = useCallback((item: UploadItem) => {
    const file = files.current.get(item.id)
    if (!file) return
    const controller = new AbortController()
    controllers.current.set(item.id, controller)
    let lastProgress = 0
    patch(item.id, { status: 'UPLOADING', progress: 0 })
    filesApi.upload(file, {
      folderId: item.folderId,
      signal: controller.signal,
      onProgress: (loaded, total) => {
        if (!total) return
        const progress = Math.min(100, Math.round((loaded / total) * 100))
        if (progress - lastProgress >= 2 || progress === 100) {
          lastProgress = progress
          patch(item.id, { progress })
        }
      },
    }).then((remote) => {
      patch(item.id, { fileId: remote.id, progress: 100 })
      refreshExplorer()
      if (!applyRemote(item.id, remote)) poll(item.id, remote.id)
    }).catch((error: unknown) => {
      if (controller.signal.aborted) patch(item.id, { status: 'CANCELLED', error: undefined })
      else patch(item.id, { status: 'ERROR', error: uploadErrorMessage(error) })
    }).finally(() => {
      controllers.current.delete(item.id)
      files.current.delete(item.id)
    })
  }, [applyRemote, patch, poll, refreshExplorer])

  // Planificador: inicia tareas en cola mientras haya capacidad.
  useEffect(() => {
    let active = items.filter((item) => item.status === 'UPLOADING').length
    for (const item of items) {
      if (active >= MAX_CONCURRENT) break
      if (item.status !== 'QUEUED' || started.current.has(item.id)) continue
      started.current.add(item.id)
      active++
      start(item)
    }
  }, [items, start])

  useEffect(() => {
    mounted.current = true
    const controllerMap = controllers.current
    const timerMap = timers.current
    const fileMap = files.current
    return () => {
      mounted.current = false
      controllerMap.forEach((controller) => controller.abort())
      timerMap.forEach((timer) => window.clearTimeout(timer))
      controllerMap.clear()
      timerMap.clear()
      fileMap.clear()
    }
  }, [])

  const enqueue = useCallback((list: File[], destination: UploadDestination) => {
    if (list.length === 0) return
    const next = list.map<UploadItem>((file) => {
      const id = crypto.randomUUID()
      files.current.set(id, file)
      return { id, name: file.name, size: file.size, folderId: destination.folderId, destinationName: destination.name, status: 'QUEUED', progress: 0 }
    })
    setItems((current) => [...next, ...current])
  }, [])

  const cancel = useCallback((id: string) => {
    const item = itemsRef.current.find((entry) => entry.id === id)
    if (!item) return
    if (item.status === 'QUEUED') {
      files.current.delete(id)
      started.current.add(id)
      patch(id, { status: 'CANCELLED' })
      return
    }
    if (item.status === 'UPLOADING') {
      controllers.current.get(id)?.abort()
      return
    }
    if (item.status === 'PROCESSING' && item.fileId) {
      const fileId = item.fileId
      patch(id, { status: 'CANCELLING' })
      filesApi.cancel(fileId)
        .then((remote) => { if (!applyRemote(id, remote)) poll(id, fileId) })
        .catch(async () => {
          // Puede haber terminado justo antes (READY/FAILED): consultar el estado real.
          try {
            const remote = await filesApi.details(fileId)
            if (!applyRemote(id, remote)) {
              patch(id, { status: 'PROCESSING', warning: 'No se pudo cancelar' })
              poll(id, fileId)
            }
          } catch {
            patch(id, { status: 'PROCESSING', warning: 'No se pudo cancelar' })
            poll(id, fileId)
          }
        })
    }
  }, [applyRemote, patch, poll])

  const clearFinished = useCallback(() => {
    setItems((current) => current.filter((item) => !TERMINAL_STATUSES.includes(item.status)))
  }, [])

  const value = useMemo<UploadContextValue>(() => ({ items, enqueue, cancel, clearFinished }), [items, enqueue, cancel, clearFinished])
  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
}
