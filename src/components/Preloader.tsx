'use client'

import { useEffect, useRef, useState } from 'react'
import { useExperience } from '@/lib/store'
import { localizeDigits } from '@/lib/i18n/numerals'
import { tick } from '@/lib/audio'
import type { Locale } from '@/lib/i18n/config'
import { setLoadPart } from '@/three/loadProgress'
import styles from './preloader.module.css'

const MAX_WAIT_MS = 7000

/**
 * 000 → 100, tied to real loading (fonts, poster, 3D engine, model bytes, shaders, first frame).
 * Covers the hero only visually: the hero text + poster are painted underneath at first paint (LCP).
 * At 100 the curtain lifts and the hands snap to Riyadh time.
 */
export function Preloader({ locale, label, ready: readyLabel, programme }: { locale: Locale; label: string; ready: string; programme: string }) {
  const counter = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const [phase, setPhase] = useState<'loading' | 'leaving' | 'done'>('loading')

  useEffect(() => {
    document.fonts?.ready.then(() => setLoadPart('fonts', 1)).catch(() => setLoadPart('fonts', 1))
    const poster = document.querySelector<HTMLImageElement>('[data-hero-poster] img')
    if (!poster || poster.complete) setLoadPart('poster', 1)
    else {
      poster.addEventListener('load', () => setLoadPart('poster', 1), { once: true })
      poster.addEventListener('error', () => setLoadPart('poster', 1), { once: true })
    }
    let shown = 0
    let raf = 0
    let finishedAt = 0
    const start = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const { loaded } = useExperience.getState()
      const target = now - start > MAX_WAIT_MS ? 100 : loaded * 100
      // mechanical count: whole steps, never faster than ~90 per second
      if (shown < target) shown = Math.min(target, shown + Math.max(1, (target - shown) * 0.12))
      const n = Math.floor(shown)
      if (counter.current) counter.current.textContent = localizeDigits(String(n).padStart(3, '0'), locale)
      if (bar.current) bar.current.style.transform = `scaleX(${n / 100})`
      if (n >= 100 && !finishedAt) {
        finishedAt = now
        tick(0.5)
      }
      if (finishedAt && now - finishedAt > 280) {
        cancelAnimationFrame(raf)
        useExperience.getState().set({ ready: true })
        setPhase('leaving')
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [locale])

  useEffect(() => {
    if (phase !== 'leaving') return
    const t = window.setTimeout(() => setPhase('done'), 1100)
    return () => window.clearTimeout(t)
  }, [phase])

  if (phase === 'done') return null
  return (
    <div className={styles.preloader} data-phase={phase} aria-hidden="true">
      <div className={styles.center}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/titan-logo-light.png" alt="" width={403} height={256} className={styles.logo} />
        <p className={styles.programme}>{programme}</p>
      </div>
      <div className={styles.foot}>
        <span className={styles.label}>{phase === 'leaving' ? readyLabel : label}</span>
        <span ref={counter} className={`${styles.counter} digits`}>
          {localizeDigits('000', locale)}
        </span>
      </div>
      <span className={styles.track}>
        <span ref={bar} className={styles.bar} />
      </span>
    </div>
  )
}
