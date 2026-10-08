'use client'

import { useEffect, useRef } from 'react'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { pad } from '@/lib/i18n/numerals'
import { frame, useExperience } from '@/lib/store'
import { startEscapement } from '@/lib/audio'
import { useChapterTracking, useNearViewport, useReveal } from './hooks'
import s from './movement.module.css'

/** Focus order of the camera dive (mirrors choreography: fourth → escape → balance). */
function focusFor(p: number): string {
  return p < 0.5 ? 'wheel_fourth' : p < 0.82 ? 'wheel_escape' : 'balance_wheel'
}

export function Movement({ locale, t }: { locale: Locale; t: Dictionary['movement'] }) {
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const specs = useRef<HTMLDListElement>(null)
  useChapterTracking(section, 'movement', 'pinned')
  const near = useNearViewport(section)
  useReveal(title, { locale, split: 'lines', start: 'top 72%' })

  // Loupe availability, spec-row focus and the escapement ambience (8 beats/s, slowing as we close in)
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine) and (hover: hover)').matches
    let raf = 0
    let last = false
    let lastFocus = ''
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!near.current && !last) return
      const p = frame.chapter.movement
      const inRange = frame.scrollY >= frame.ranges.movement[0] - 2 && frame.scrollY <= frame.ranges.movement[1] + 2
      const on = fine && inRange && p > 0.2 && p < 0.94
      if (on !== last) {
        useExperience.getState().set({ loupe: on })
        last = on
      }
      const focus = inRange && p > 0.18 ? focusFor(p) : ''
      if (focus !== lastFocus && specs.current) {
        for (const row of Array.from(specs.current.children) as HTMLElement[]) {
          row.dataset.on = row.dataset.part === focus ? 'true' : 'false'
        }
        lastFocus = focus
      }
    }
    raf = requestAnimationFrame(loop)
    const stop = startEscapement(() => {
      const p = frame.chapter.movement
      const inside = p > 0.05 && p < 0.95
      return inside ? 0.18 * Math.sin(Math.PI * Math.min(1, p * 1.2)) : 0
    })
    return () => {
      cancelAnimationFrame(raf)
      stop()
      useExperience.getState().set({ loupe: false })
    }
  }, [near])

  return (
    <section id="movement" ref={section} className={s.movement} aria-labelledby="movement-title" data-chapter="movement">
      <div className={s.sticky}>
        <div className={`grid-12 ${s.grid}`}>
          <div className={s.copy}>
            <p className="label">
              <span className="digits">{pad(3, 2, locale)}</span> — {t.label}
            </p>
            <h2 id="movement-title" ref={title} className={`display ${s.title}`} data-focus-target>
              {t.title}
            </h2>
            <p className={s.body}>{t.body}</p>
          </div>
          <div className={s.specs}>
            <p className="label">{t.specsTitle}</p>
            <dl ref={specs}>
              {t.specs.map((row) => (
                <div key={row.id} data-part={row.id} data-on="false">
                  <dt>{row.k}</dt>
                  <dd className="digits">{row.v}</dd>
                </div>
              ))}
            </dl>
            <p className={`note ${s.specsNote}`}>{t.specsNote}</p>
          </div>
          <div className={s.facts}>
            <p className="label">{t.factsTitle}</p>
            <ul>
              {t.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <p className={`note ${s.loupe}`} aria-hidden="true">
            {t.loupe}
          </p>
        </div>
      </div>
    </section>
  )
}
