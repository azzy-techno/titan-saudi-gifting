'use client'

import { useEffect, useRef } from 'react'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { pad } from '@/lib/i18n/numerals'
import { frame, useExperience, type Finish } from '@/lib/store'
import { crownClick } from '@/lib/audio'
import { useChapterTracking, useNearViewport, triggerSweep } from './hooks'
import s from './finishes.module.css'

const ORDER: Finish[] = ['steel', 'gold', 'black']
/** Mirrors REASSEMBLED_AT / FINISH_HOLDS in choreography (kept here so the DOM bundle stays free of three). */
const READY_AT = 0.1
const HOLDS: [number, number][] = [
  [0, 0.4],
  [0.4, 0.7],
  [0.7, 1.01],
]

/**
 * 04 Finishes — the finish names ARE the selector (large serif, the active one lit). The watch sits on
 * the start side; the names appear once it has reassembled. Scroll walks steel → gold-tone → black with
 * an equal hold each; a click takes over until the chapter is left.
 */
export function Finishes({ locale, t }: { locale: Locale; t: Dictionary['finishes'] }) {
  const section = useRef<HTMLElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const manual = useRef(false)
  const finish = useExperience((st) => st.finish)
  useChapterTracking(section, 'finishes', 'pinned')
  const near = useNearViewport(section)

  useEffect(() => {
    let raf = 0
    let inside = false
    let shown = false
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!near.current && !inside) return
      const [a, b] = frame.ranges.finishes
      const now = frame.scrollY >= a && frame.scrollY <= b
      if (now !== inside) {
        inside = now
        if (!now) manual.current = false
      }
      const exp = useExperience.getState()
      const p = exp.reducedMotion ? 0.5 : frame.chapter.finishes
      const show = exp.reducedMotion || (p >= READY_AT && frame.scrollY >= a - 2)
      if (show !== shown && panel.current) {
        panel.current.dataset.ready = show ? 'true' : 'false'
        shown = show
        if (show) triggerSweep()
      }
      if (!inside || manual.current || exp.reducedMotion) return
      const idx = HOLDS.findIndex(([h0, h1]) => p >= h0 && p < h1)
      const want: Finish = ORDER[Math.max(0, idx)]!
      if (exp.finish !== want) {
        exp.set({ finish: want })
        triggerSweep()
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [near])

  const choose = (f: Finish) => {
    manual.current = true
    useExperience.getState().set({ finish: f })
    crownClick(0.6)
    triggerSweep()
  }

  return (
    <section id="finishes" ref={section} className={s.finishes} aria-labelledby="finishes-title" data-chapter="finishes">
      <div className={s.sticky}>
        <div className={`grid-12 ${s.grid}`}>
          <div ref={panel} className={s.panel} data-ready="false">
            <p className="label">
              <span className="digits">{pad(4, 2, locale)}</span> — {t.label}
            </p>
            <h2 id="finishes-title" className="sr-only" data-focus-target>
              {t.title}
            </h2>
            <div className={s.selector} role="group" aria-labelledby="finishes-title">
              {t.options.map((o, i) => {
                const id = o.id as Finish
                return (
                  <button key={o.id} type="button" className={s.option} aria-pressed={finish === id} onClick={() => choose(id)}>
                    <span className={`digits ${s.num}`}>{pad(i + 1, 2, locale)}</span>
                    <span className={s.name}>{o.name}</span>
                    <span className={s.optionNote}>{o.note}</span>
                  </button>
                )
              })}
            </div>
            <p className={s.body}>{t.body}</p>
            <p className={`note ${s.confirm}`}>{t.availability}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export const FINISH_ORDER = ORDER
