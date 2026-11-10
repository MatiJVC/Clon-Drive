import { apiClient } from '@/services/api/client'
import type { User } from '@/types/api'

export const usersApi = {
  async search(query: string, signal?: AbortSignal) {
    const { data } = await apiClient.get<User[]>('/users/search', { params: { q: query }, signal })
    return data
  },
}
