import type { AccessLevel, DriveFile, Folder } from '@/types/api'

export type ExplorerItem =
  | { kind: 'folder'; id: string; folder: Folder; access: AccessLevel; ownerUsername?: string }
  | { kind: 'file'; id: string; file: DriveFile; access: AccessLevel; ownerUsername?: string }
