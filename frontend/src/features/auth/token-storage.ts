const TOKEN_KEY = 'clon-drive.access-token'

let memoryToken: string | null = null

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export const tokenStorage = {
  get(): string | null {
    if (memoryToken) return memoryToken
    if (!storageAvailable()) return null
    memoryToken = window.localStorage.getItem(TOKEN_KEY)
    return memoryToken
  },
  set(token: string) {
    memoryToken = token
    if (storageAvailable()) window.localStorage.setItem(TOKEN_KEY, token)
  },
  clear() {
    memoryToken = null
    if (storageAvailable()) window.localStorage.removeItem(TOKEN_KEY)
  },
  has() { return Boolean(this.get()) },
}
