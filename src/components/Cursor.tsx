'use client'

import { useEffect, useRef } from 'react'
import { frame, useExperience } from '@/lib/store'
import styles from './cursor.module.css'

const INTERACTIVE = 'a, button, [role="button"], select, summary, label, [data-cursor="link"]'
const rnd = (v: number) => Math.round(v * 1000) / 1000
const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]), textarea'

/**
 * Desktop cursor: a small ring that becomes a jeweller's loupe over the movement chapter
 * (the magnification itself is a WebGL re-render, see three/effects/LoupeEffect.ts).
 * Never on touch devices; the native caret stays for text fields.
 */
export function Cursor({ loupeLabel }: { loupeLabel: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const mq = window.matchMedia('(pointer: fine) and (hover: hover)')
    if (!mq.matches) return
    const root = document.documentElement
    root.classList.add('has-cursor')
    let x = -100
    let y = -100
    let tx = -100
    let ty = -100
    let state = 'idle'
    let raf = 0
    let last = performance.now()

    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (!t) return
      if (t.closest(TEXT)) state = 'text'
      else if (t.closest(INTERACTIVE)) state = 'link'
      else state = 'idle'
    }
    const onMove = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      if (x < -50) {
        x = tx
        y = ty
      }
    }
    const onLeave = () => el.setAttribute('data-hidden', 'true')
    const onEnter = () => el.removeAttribute('data-hidden')

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const k = 1 - Math.exp(-32 * dt)
      x += (tx - x) * k
      y += (ty - y) * k
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      const loupe = useExperience.getState().loupe && frame.pointer.active && state !== 'link' && state !== 'text'
      const s = loupe ? 'loupe' : state
      if (el.dataset.state !== s) el.dataset.state = s
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    root.addEventListener('pointerleave', onLeave)
    root.addEventListener('pointerenter', onEnter)
    return () => {
      cancelAnimationFrame(raf)
      root.classList.remove('has-cursor')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('pointerenter', onEnter)
    }
  }, [])

  return (
    <div ref={ref} className={styles.cursor} data-state="idle" aria-hidden="true">
      <span className={styles.ring} />
      <svg className={styles.ticks} viewBox="0 0 240 240">
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2
          const r0 = i % 5 === 0 ? 113 : 116
          return (
            <line
              key={i}
              x1={rnd(120 + Math.cos(a) * r0)}
              y1={rnd(120 + Math.sin(a) * r0)}
              x2={rnd(120 + Math.cos(a) * 119)}
              y2={rnd(120 + Math.sin(a) * 119)}
            />
          )
        })}
      </svg>
      <span className={styles.label}>× 2.6 · {loupeLabel}</span>
    </div>
  )
}
