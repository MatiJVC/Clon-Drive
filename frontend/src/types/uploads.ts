import type { DriveFile, FileProcessingStatus } from '@/types/api'

export type UploadTransferStatus = 'QUEUED' | 'UPLOADING' | 'TRANSFERRED' | 'ABORTED' | 'ERROR'

export interface UploadTask {
  localId: string
  file: File
  transferStatus: UploadTransferStatus
  transferProgress: number
  processingStatus?: FileProcessingStatus
  remoteFile?: DriveFile
  error?: string
}

// transferProgress mide exclusivamente bytes enviados por HTTP. El worker SQS
// solo expone estados discretos mediante processingStatus, nunca porcentajes.
