import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { queryKeys } from '@/app/query-keys'
import { FileTypeIcon } from '@/features/drive/file-type-icon'
import { fileType } from '@/features/drive/drive-utils'
import { filesApi } from '@/services/api/files'
import type { DriveFile } from '@/types/api'

const MAX_IMAGE_PREVIEW_BYTES = 5 * 1024 * 1024

export function FileThumbnail({ file }: { file: DriveFile }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const canPreview = file.status === 'READY' && file.mimeType.startsWith('image/') && file.size <= MAX_IMAGE_PREVIEW_BYTES

  useEffect(() => {
    const element = containerRef.current
    if (!element || !canPreview) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '160px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [canPreview])

  const preview = useQuery({
    queryKey: [...queryKeys.files.detail(file.id), 'thumbnail'],
    queryFn: ({ signal }) => filesApi.download(file.id, signal).then((response) => response.data),
    enabled: canPreview && visible,
    staleTime: 5 * 60_000,
    gcTime: 60_000,
    retry: false,
  })
  const objectUrl = useMemo(() => preview.data ? URL.createObjectURL(preview.data) : null, [preview.data])

  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }, [objectUrl])

  return <div ref={containerRef} className="grid h-full min-h-36 place-items-center overflow-hidden rounded-md bg-card">
    {objectUrl
      ? <img src={objectUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
      : <div className="flex flex-col items-center gap-3 text-muted-foreground"><FileTypeIcon file={file} className="size-12 opacity-70" /><span className="text-xs font-medium">{preview.isFetching ? 'Cargando vista previa…' : fileType(file)}</span></div>}
  </div>
}
