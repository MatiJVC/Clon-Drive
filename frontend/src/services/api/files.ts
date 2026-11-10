import { apiClient } from '@/services/api/client'
import type { DriveFile } from '@/types/api'

export interface UploadOptions {
  folderId?: string
  signal?: AbortSignal
  onProgress?: (transferredBytes: number, totalBytes?: number) => void
}

export const filesApi = {
  async upload(file: File, options: UploadOptions = {}) {
    const form = new FormData()
    form.append('file', file)
    if (options.folderId) form.append('folderId', options.folderId)
    const { data } = await apiClient.post<DriveFile>('/files', form, {
      signal: options.signal,
      onUploadProgress: (event) => options.onProgress?.(event.loaded, event.total),
    })
    return data
  },
  async details(id: string, signal?: AbortSignal) {
    const { data } = await apiClient.get<DriveFile & { access: 'OWNER' | 'EDIT' | 'READ' }>(`/files/${id}`, { signal })
    return data
  },
  async download(id: string, signal?: AbortSignal) {
    return apiClient.get<Blob>(`/files/${id}/download`, { responseType: 'blob', signal })
  },
  async rename(id: string, name: string, signal?: AbortSignal) {
    const { data } = await apiClient.patch<DriveFile>(`/files/${id}`, { name }, { signal })
    return data
  },
  async remove(id: string, signal?: AbortSignal) { await apiClient.delete(`/files/${id}`, { signal }) },
  async cancel(id: string, signal?: AbortSignal) {
    const { data } = await apiClient.post<DriveFile>(`/files/${id}/cancel`, undefined, { signal })
    return data
  },
}
