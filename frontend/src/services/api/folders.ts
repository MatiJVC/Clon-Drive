import { apiClient } from '@/services/api/client'
import type { Folder } from '@/types/api'

export const foldersApi = {
  async create(input: { name: string; parentId?: string }, signal?: AbortSignal) {
    const { data } = await apiClient.post<Folder>('/folders', input, { signal })
    return data
  },
  async rename(id: string, name: string, signal?: AbortSignal) {
    const { data } = await apiClient.patch<Folder>(`/folders/${id}`, { name }, { signal })
    return data
  },
  async remove(id: string, signal?: AbortSignal) {
    await apiClient.delete(`/folders/${id}`, { signal })
  },
}
