'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { localizeDigits } from '@/lib/i18n/numerals'
import { useExperience } from '@/lib/store'
import s from './gifting.module.css'

const R = 112
const C = 140
const rnd = (v: number) => Math.round(v * 1000) / 1000

function arc(i: number): string {
  // quadrant i (0 = 12→3 o'clock), with a small gap between quadrants
  const gap = 0.05
  const a0 = -Math.PI / 2 + (i * Math.PI) / 2 + gap
  const a1 = -Math.PI / 2 + ((i + 1) * Math.PI) / 2 - gap
  const p = (a: number) => `${(C + Math.cos(a) * R).toFixed(2)} ${(C + Math.sin(a) * R).toFixed(2)}`
  return `M ${p(a0)} A ${R} ${R} 0 0 1 ${p(a1)}`
}

/** Brief → Curate → Personalise → Deliver, drawn as a dial with four quadrants (DrawSVG, scrubbed). */
export function ProcessDial({ locale, t, title }: { locale: Locale; t: Dictionary['gifting']['process']; title: string }) {
  const root = useRef<HTMLDivElement>(null)
  const rtl = locale === 'ar'

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const arcs = el.querySelectorAll<SVGPathElement>('[data-arc]')
      const steps = el.querySelectorAll<HTMLElement>('[data-step]')
      if (useExperience.getState().reducedMotion) {
        gsap.set(arcs, { drawSVG: '0% 100%' })
        steps.forEach((st) => (st.dataset.on = 'true'))
        return
      }
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 45%', scrub: 0.6 },
        defaults: { ease: 'none' },
        onUpdate: () => {
          const p = tl.progress() * arcs.length
          steps.forEach((st, j) => {
            const on = String(p > j + 0.04)
            if (st.dataset.on !== on) st.dataset.on = on
          })
        },
      })
      arcs.forEach((a, i) => {
        tl.fromTo(a, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1 }, i)
      })
    },
    { scope: root, dependencies: [locale] },
  )

  return (
    <div ref={root} className={s.process}>
      <p className="label">{title}</p>
      <div className={s.processBody}>
        <svg className={s.dial} viewBox="0 0 280 280" aria-hidden="true" style={rtl ? { transform: 'scaleX(-1)' } : undefined}>
          <circle cx={C} cy={C} r={R} className={s.dialTrack} />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2
            const r0 = i % 15 === 0 ? R - 14 : i % 5 === 0 ? R - 8 : R - 5
            return (
              <line
                key={i}
                x1={rnd(C + Math.cos(a) * r0)}
                y1={rnd(C + Math.sin(a) * r0)}
                x2={rnd(C + Math.cos(a) * (R - 2))}
                y2={rnd(C + Math.sin(a) * (R - 2))}
                className={i % 15 === 0 ? s.dialMajor : s.dialMinor}
              />
            )
          })}
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={arc(i)} data-arc className={s.dialArc} />
          ))}
        </svg>
        <ol className={s.steps}>
          {t.map((st) => (
            <li key={st.n} data-step data-on="false">
              <span className="digits">{localizeDigits(st.n, locale)}</span>
              <span className={s.stepName}>{st.name}</span>
              <span className={s.stepText}>{st.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
