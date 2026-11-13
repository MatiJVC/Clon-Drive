import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import { driveApi } from '@/services/api/drive'

export function useDriveListing(folderId?: string) {
  return useQuery({
    queryKey: queryKeys.drive.listing(folderId),
    queryFn: ({ signal }) => driveApi.list(folderId, signal),
  })
}

export function useSharedListing() {
  return useQuery({
    queryKey: queryKeys.drive.shared(),
    queryFn: ({ signal }) => driveApi.shared(signal),
  })
}

export function useDriveSearch(q: string) {
  const term = q.trim()
  return useQuery({
    queryKey: queryKeys.drive.search(term),
    queryFn: ({ signal }) => driveApi.search(term, signal),
    enabled: term.length > 0,
    placeholderData: keepPreviousData,
  })
}
