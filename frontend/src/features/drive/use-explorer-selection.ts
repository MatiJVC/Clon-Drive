import { useState } from 'react'

export function useExplorerSelection(orderedIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [anchor, setAnchor] = useState<string | null>(null)

  function select(id: string, event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) {
    if (event.shiftKey && anchor) {
      const start = orderedIds.indexOf(anchor)
      const end = orderedIds.indexOf(id)
      if (start >= 0 && end >= 0) {
        const range = orderedIds.slice(Math.min(start, end), Math.max(start, end) + 1)
        setSelected(event.ctrlKey || event.metaKey ? new Set([...selected, ...range]) : new Set(range))
        return
      }
    }
    if (event.ctrlKey || event.metaKey) {
      const next = new Set(selected)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setSelected(next)
    } else {
      setSelected(selected.size === 1 && selected.has(id) ? new Set() : new Set([id]))
    }
    setAnchor(id)
  }

  return { selected, select, clear: () => { setSelected(new Set()); setAnchor(null) } }
}
