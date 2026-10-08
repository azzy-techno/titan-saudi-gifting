'use client'

import { useEffect, useState } from 'react'

/** Dev-only 12-column grid overlay — toggle with the "g" key (or ?grid). */
export function GridOverlay() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (new URLSearchParams(location.search).has('grid')) queueMicrotask(() => setOn(true))
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) setOn((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  if (!on) return null
  return (
    <div className="grid-overlay" aria-hidden="true">
      <div className="grid-12">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  )
}
