export type AccessLevel = 'OWNER' | 'EDIT' | 'READ'
export type SharePermission = 'READ' | 'EDIT'
export type FileProcessingStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'CANCELLED'

export interface User { id: string; username: string }
export interface AuthSession { accessToken: string; user: User }

export interface Folder {
  id: string
  name: string
  ownerId: string
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: number
  status: FileProcessingStatus
  ownerId: string
  folderId: string | null
  createdAt: string
  updatedAt: string
}

export interface BreadcrumbItem { id: string; name: string }

export interface DriveListing {
  folder: Folder | null
  access: AccessLevel
  breadcrumb: BreadcrumbItem[]
  folders: Folder[]
  files: DriveFile[]
}

export interface SharedFolder extends Folder { permission: SharePermission; ownerUsername: string }
export interface SharedFile extends DriveFile { permission: SharePermission; ownerUsername: string }
export interface SharedListing { folders: SharedFolder[]; files: SharedFile[] }

/** Resultado de búsqueda: incluye el nivel de acceso; ownerUsername solo si no es propio. */
export interface SearchFolder extends Folder { access: AccessLevel; ownerUsername?: string }
export interface SearchFile extends DriveFile { access: AccessLevel; ownerUsername?: string }
export interface SearchListing { folders: SearchFolder[]; files: SearchFile[] }

export interface PreviewLink { url: string; mimeType: string }

export interface ShareRecord {
  id: string
  permission: SharePermission
  fileId: string | null
  folderId: string | null
  sharedWithId: string
  sharedById: string
  createdAt: string
}

export interface CreatedShare extends ShareRecord { username: string }
export interface ListedShare { id: string; permission: SharePermission; username: string; createdAt: string }

export interface ApiErrorBody {
  statusCode?: number
  message?: string | string[]
  error?: string
}
