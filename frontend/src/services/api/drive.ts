import { apiClient } from '@/services/api/client'
import type { DriveListing, SharedListing } from '@/types/api'

export const driveApi = {
  async list(folderId?: string, signal?: AbortSignal) {
    const { data } = await apiClient.get<DriveListing>('/drive', { params: folderId ? { folderId } : undefined, signal })
    return data
  },
  async shared(signal?: AbortSignal) {
    const { data } = await apiClient.get<SharedListing>('/drive/shared', { signal })
    return data
  },
}
