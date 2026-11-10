import { useContext } from 'react'
import { NewFolderActionContext } from '@/components/layout/new-folder-action-value'

export function useNewFolderAction() {
  const context = useContext(NewFolderActionContext)
  if (!context) throw new Error('useNewFolderAction debe usarse dentro de AppShell')
  return context
}
