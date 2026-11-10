import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import type { ExplorerItem } from '@/features/drive/explorer-types'
import { filesApi } from '@/services/api/files'
import { foldersApi } from '@/services/api/folders'

function filenameFromDisposition(disposition: string | undefined, fallback: string) {
  if (!disposition) return fallback
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (utf8) {
    try { return decodeURIComponent(utf8) } catch { return fallback }
  }
  const quoted = disposition.match(/filename="([^"]+)"/i)?.[1]
  return quoted || fallback
}

function safeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_') || 'archivo'
}

export function useDriveOperations() {
  const queryClient = useQueryClient()
  const refreshExplorer = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.folders.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.files.all }),
    ])
  }

  const createFolder = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string }) => foldersApi.create({ name, parentId }),
    onSuccess: refreshExplorer,
  })

  const renameItem = useMutation({
    mutationFn: async ({ item, name }: { item: ExplorerItem; name: string }) => item.kind === 'folder' ? await foldersApi.rename(item.id, name) : await filesApi.rename(item.id, name),
    onSuccess: refreshExplorer,
  })

  const removeItem = useMutation({
    mutationFn: (item: ExplorerItem) => item.kind === 'folder' ? foldersApi.remove(item.id) : filesApi.remove(item.id),
    onSuccess: refreshExplorer,
  })

  const downloadFile = useMutation({
    mutationFn: async (item: Extract<ExplorerItem, { kind: 'file' }>) => {
      const response = await filesApi.download(item.id)
      const disposition = response.headers['content-disposition']
      const filename = safeFilename(filenameFromDisposition(typeof disposition === 'string' ? disposition : undefined, item.file.name))
      const url = URL.createObjectURL(response.data)
      try {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        anchor.style.display = 'none'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 0)
      }
      return filename
    },
  })

  return { createFolder, renameItem, removeItem, downloadFile }
}
