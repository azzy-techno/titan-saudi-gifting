'use client'

import { useEffect, useRef } from 'react'
import { formatClock, riyadhTime } from '@/lib/time'
import { localizeDigits } from '@/lib/i18n/numerals'
import type { Locale } from '@/lib/i18n/config'

/** Live Riyadh time (HH:MM:SS). Updates the text node directly once per second — no React re-renders. */
export function LiveTime({ locale, className }: { locale: Locale; className?: string }) {
  const ref = useRef<HTMLTimeElement>(null)
  useEffect(() => {
    let timer = 0
    const tick = () => {
      const t = riyadhTime()
      const el = ref.current
      if (el) {
        const s = formatClock(t)
        el.textContent = localizeDigits(s, locale)
        el.dateTime = s
      }
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [locale])
  return (
    <time ref={ref} className={className} suppressHydrationWarning>
      {localizeDigits('--:--:--', locale)}
    </time>
  )
}
