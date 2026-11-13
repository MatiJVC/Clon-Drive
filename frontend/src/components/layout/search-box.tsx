import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

const SEARCH_PATH = '/drive/search'

// Barra de búsqueda del encabezado. Mientras se escribe (con una pequeña
// espera) muestra los resultados en /drive/search?q=…
export function SearchBox() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const onSearchPage = location.pathname === SEARCH_PATH
  const urlQuery = onSearchPage ? searchParams.get('q') ?? '' : ''
  const [value, setValue] = useState(urlQuery)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)

  // Si se navega a otra sección, la barra se limpia; si se vuelve atrás a una
  // búsqueda, recupera el texto de la URL (ajuste de estado durante el render).
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)
  if (syncedQuery !== urlQuery) {
    setSyncedQuery(urlQuery)
    if (value.trim() !== urlQuery) setValue(urlQuery)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function go(text: string) {
    window.clearTimeout(timer.current)
    const term = text.trim()
    if (term) navigate(`${SEARCH_PATH}?q=${encodeURIComponent(term)}`, { replace: onSearchPage })
    else if (onSearchPage) navigate('/drive', { replace: true })
  }

  function change(text: string) {
    setValue(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => go(text), 300)
  }

  function clear() {
    setValue('')
    go('')
    inputRef.current?.focus()
  }

  return <form role="search" className="flex h-12 w-full max-w-[720px] items-center rounded-full bg-[var(--drive-search)] px-4 text-[#444746] shadow-sm transition-shadow focus-within:bg-card focus-within:shadow-md dark:text-muted-foreground" onSubmit={(event) => { event.preventDefault(); go(value) }}>
    <button type="submit" className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label="Buscar"><Search className="size-5" /></button>
    <input ref={inputRef} type="search" value={value} onChange={(event) => change(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape' && value) { event.preventDefault(); clear() } }} placeholder="Buscar en Ñrive" aria-label="Buscar en Ñrive" maxLength={100} className="ml-2 h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-[#444746] dark:placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden" />
    {value && <button type="button" className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" onClick={clear} aria-label="Borrar búsqueda"><X className="size-5" /></button>}
  </form>
}
