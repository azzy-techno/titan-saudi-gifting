'use client'

import { useEffect, useRef } from 'react'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { pad } from '@/lib/i18n/numerals'
import { frame, useExperience, type Finish, type StrapId } from '@/lib/store'
import { crownClick } from '@/lib/audio'
import { useChapterTracking, useReveal, triggerSweep } from './hooks'
import s from './finishes.module.css'

const ORDER: Finish[] = ['steel', 'gold', 'black']
const SWATCH: Record<Finish, string> = { steel: '#c9cbcc', gold: '#d9b98a', black: '#2a2a2c' }

/** Finishes: steel → gold-tone → black follows the scroll, until the visitor picks one. */
export function Finishes({ locale, t, straps, strapTitle }: { locale: Locale; t: Dictionary['finishes']; straps: Dictionary['gifting']['configurator']['straps']; strapTitle: string }) {
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const manual = useRef(false)
  const finish = useExperience((st) => st.finish)
  const strap = useExperience((st) => st.strap)
  useChapterTracking(section, 'finishes', 'pinned')
  useReveal(title, { locale, split: 'lines', start: 'top 70%' })

  useEffect(() => {
    let raf = 0
    let inside = false
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const [a, b] = frame.ranges.finishes
      const now = frame.scrollY >= a && frame.scrollY <= b
      if (now !== inside) {
        inside = now
        if (!now) manual.current = false
      }
      if (!inside || manual.current) return
      const p = frame.chapter.finishes
      const want: Finish = p < 0.42 ? 'steel' : p < 0.7 ? 'gold' : 'black'
      if (useExperience.getState().finish !== want) {
        useExperience.getState().set({ finish: want })
        triggerSweep()
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

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
          <div className={s.copy}>
            <p className="label">
              <span className="digits">{pad(4, 2, locale)}</span> — {t.label}
            </p>
            <h2 id="finishes-title" ref={title} className={`display ${s.title}`} data-focus-target>
              {t.title}
            </h2>
            <p className={s.body}>{t.body}</p>
            <p className={`label ${s.confirm}`}>{t.availability}</p>
          </div>
          <div className={s.options}>
            <fieldset className={s.fieldset}>
              <legend className="label">{t.label}</legend>
              {t.options.map((o, i) => {
                const id = o.id as Finish
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={s.option}
                    aria-pressed={finish === id}
                    onClick={() => choose(id)}
                  >
                    <span className="digits">{pad(i + 1, 2, locale)}</span>
                    <span className={s.swatch} style={{ background: SWATCH[id] }} aria-hidden="true" />
                    <span className={s.optionName}>{o.name}</span>
                    <span className={s.optionNote}>{o.note}</span>
                  </button>
                )
              })}
            </fieldset>
            <fieldset className={s.fieldset}>
              <legend className="label">{strapTitle}</legend>
              <div className={s.straps}>
                {straps.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className={s.strap}
                    aria-pressed={strap === st.id}
                    onClick={() => {
                      useExperience.getState().set({ strap: st.id as StrapId })
                      crownClick(0.5)
                    }}
                  >
                    {st.name}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      </div>
    </section>
  )
}

export const FINISH_ORDER = ORDER
