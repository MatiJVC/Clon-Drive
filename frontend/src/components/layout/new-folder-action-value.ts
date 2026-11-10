import { createContext } from 'react'

export interface NewFolderActionContextValue {
  register: (action: (() => void) | null) => () => void
  request: () => void
}

export const NewFolderActionContext = createContext<NewFolderActionContextValue | null>(null)
