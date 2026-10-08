'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { frame, useExperience, CHAPTERS } from '@/lib/store'
import { pad } from '@/lib/i18n/numerals'
import { crownClick, tick } from '@/lib/audio'
import { scrollToId } from '@/components/scroll/SmoothScroll'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { CHAPTER_DOM_IDS } from '@/chapters/ids'
import { MotionToggle, SoundToggle } from './Toggles'
import styles from './chrome.module.css'

const SIZE = 44
const rnd = (v: number) => Math.round(v * 1000) / 1000
const R = 19

/**
 * Scroll progress as a bezel: the seconds hand sweeps 0→360° across the whole page and the
 * chapters sit on the dial as hour indices (placed at their real scroll positions).
 * The dial is also the chapter index: it opens a list of the eight chapters.
 */
export function NavDial({ locale, names, label, hud }: { locale: Locale; names: Dictionary['chapterNames']; label: string; hud: Dictionary['hud'] }) {
  const hand = useRef<SVGGElement>(null)
  const [marks, setMarks] = useState<number[]>(() => CHAPTERS.map((_, i) => i / CHAPTERS.length))
  const [open, setOpen] = useState(false)
  const active = useExperience((s) => s.chapter)
  const menuId = useId()
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const rtl = locale === 'ar'

  // Hand follows page progress (direct DOM write per frame)
  useEffect(() => {
    let raf = 0
    let lastStep = -1
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const deg = frame.progress * 360
      // mechanical: the hand advances in 1° steps
      const step = Math.round(deg)
      if (step !== lastStep && hand.current) {
        hand.current.setAttribute('transform', `rotate(${rtl ? -step : step} ${SIZE / 2} ${SIZE / 2})`)
        lastStep = step
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [rtl])

  // Index positions from the measured chapter starts
  useEffect(() => {
    const measure = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      setMarks(CHAPTERS.map((c) => Math.min(0.999, Math.max(0, frame.ranges[c][0] / max))))
    }
    const t = window.setTimeout(measure, 600)
    window.addEventListener('resize', measure)
    window.addEventListener('tsg:layout', measure)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('tsg:layout', measure)
    }
  }, [])

  // A soft tick when the hand passes a chapter index
  useEffect(() => {
    tick(0.35)
  }, [active])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    const onDown = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    menu.current?.querySelector<HTMLElement>('a')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <div className={styles.dialWrap}>
      <button
        ref={button}
        type="button"
        className={styles.dialButton}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => {
          setOpen((o) => !o)
          crownClick(0.5)
        }}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} className={styles.dialRing} />
          {marks.map((m, i) => {
            const a = (rtl ? -m : m) * Math.PI * 2 - Math.PI / 2
            const r0 = R - 4.5
            const r1 = R - 1
            return (
              <line
                key={i}
                x1={rnd(SIZE / 2 + Math.cos(a) * r0)}
                y1={rnd(SIZE / 2 + Math.sin(a) * r0)}
                x2={rnd(SIZE / 2 + Math.cos(a) * r1)}
                y2={rnd(SIZE / 2 + Math.sin(a) * r1)}
                className={i === active ? styles.dialIndexActive : styles.dialIndex}
              />
            )
          })}
          <g ref={hand}>
            <line x1={SIZE / 2} y1={SIZE / 2 + 4} x2={SIZE / 2} y2={SIZE / 2 - R + 2} className={styles.dialHand} />
          </g>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={1.6} className={styles.dialPin} />
        </svg>
      </button>
      <div ref={menu} id={menuId} className={styles.chapterMenu} data-open={open} hidden={!open}>
        <ol>
          {names.map((n, i) => (
            <li key={n}>
              <a
                href={`#${CHAPTER_DOM_IDS[i]}`}
                aria-current={i === active ? 'true' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  setOpen(false)
                  history.pushState(null, '', `#${CHAPTER_DOM_IDS[i]}`)
                  scrollToId(CHAPTER_DOM_IDS[i]!)
                  crownClick(0.4)
                }}
              >
                <span className="digits">{pad(i + 1, 2, locale)}</span>
                <span>{n}</span>
              </a>
            </li>
          ))}
        </ol>
        <div className={styles.menuToggles}>
          <SoundToggle t={hud} />
          <MotionToggle t={hud} />
        </div>
      </div>
    </div>
  )
}
