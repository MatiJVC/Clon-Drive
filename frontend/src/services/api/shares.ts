import { apiClient } from '@/services/api/client'
import type { CreatedShare, ListedShare, SharePermission, ShareRecord } from '@/types/api'

type ShareTarget = { fileId: string; folderId?: never } | { folderId: string; fileId?: never }
type CreateShare = ShareTarget & { username: string; permission: SharePermission }

export const sharesApi = {
  async create(input: CreateShare, signal?: AbortSignal) {
    const { data } = await apiClient.post<CreatedShare>('/shares', input, { signal })
    return data
  },
  async list(target: ShareTarget, signal?: AbortSignal) {
    const { data } = await apiClient.get<ListedShare[]>('/shares', { params: target, signal })
    return data
  },
  async update(id: string, permission: SharePermission, signal?: AbortSignal) {
    const { data } = await apiClient.patch<ShareRecord>(`/shares/${id}`, { permission }, { signal })
    return data
  },
  async remove(id: string, signal?: AbortSignal) { await apiClient.delete(`/shares/${id}`, { signal }) },
}
