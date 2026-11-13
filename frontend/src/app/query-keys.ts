export const queryKeys = {
  auth: { all: ['auth'] as const, me: () => ['auth', 'me'] as const },
  drive: { all: ['drive'] as const, listing: (folderId?: string) => ['drive', 'listing', folderId ?? 'root'] as const, shared: () => ['drive', 'shared'] as const, search: (q: string) => ['drive', 'search', q] as const },
  folders: { all: ['folders'] as const, detail: (id: string) => ['folders', id] as const },
  files: { all: ['files'] as const, detail: (id: string) => ['files', id] as const },
  shares: { all: ['shares'] as const, target: (type: 'file' | 'folder', id: string) => ['shares', type, id] as const },
  users: { all: ['users'] as const, search: (query: string) => ['users', 'search', query] as const },
  permissions: { all: ['permissions'] as const, target: (type: 'file' | 'folder', id: string) => ['permissions', type, id] as const },
}
