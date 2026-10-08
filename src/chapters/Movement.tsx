'use client'

import { useEffect, useRef } from 'react'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { pad } from '@/lib/i18n/numerals'
import { frame, useExperience } from '@/lib/store'
import { startEscapement } from '@/lib/audio'
import { useChapterTracking, useNearViewport, useReveal } from './hooks'
import s from './movement.module.css'

export function Movement({ locale, t }: { locale: Locale; t: Dictionary['movement'] }) {
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  useChapterTracking(section, 'movement', 'pinned')
  const near = useNearViewport(section)
  useReveal(title, { locale, split: 'lines', start: 'top 72%' })

  // Loupe availability + escapement ambience (8 beats/s, slowing as the camera closes in)
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine) and (hover: hover)').matches
    let raf = 0
    let last = false
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!near.current && !last) return
      const p = frame.chapter.movement
      const on = fine && p > 0.25 && p < 0.92 && frame.scrollY >= frame.ranges.movement[0] - 2
      if (on !== last) {
        useExperience.getState().set({ loupe: on })
        last = on
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
            <div className={s.facts}>
              <p className="label">{t.factsTitle}</p>
              <ul>
                {t.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className={s.specs}>
            <p className="label">{t.specsTitle}</p>
            <dl>
              {t.specs.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd className="digits">{v}</dd>
                </div>
              ))}
            </dl>
            <p className={`label ${s.specsNote}`}>{t.specsNote}</p>
          </div>
          <p className={`label ${s.loupe}`} aria-hidden="true">
            {t.loupe}
          </p>
        </div>
      </div>
    </section>
  )
}
