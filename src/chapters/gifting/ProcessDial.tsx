'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { localizeDigits } from '@/lib/i18n/numerals'
import { useExperience } from '@/lib/store'
import s from './gifting.module.css'

const SIZE = 360
const C = SIZE / 2
const R = 150
const rnd = (v: number) => Math.round(v * 1000) / 1000

function arc(i: number): string {
  // quadrant i (0 = 12→3 o'clock), small gap between quadrants
  const gap = 0.045
  const a0 = -Math.PI / 2 + (i * Math.PI) / 2 + gap
  const a1 = -Math.PI / 2 + ((i + 1) * Math.PI) / 2 - gap
  const p = (a: number) => `${rnd(C + Math.cos(a) * R)} ${rnd(C + Math.sin(a) * R)}`
  return `M ${p(a0)} A ${R} ${R} 0 0 1 ${p(a1)}`
}

/** Quadrant label position (centre of the quadrant, inside the ring). */
function labelPos(i: number, r: number): [number, number] {
  const a = -Math.PI / 2 + (i + 0.5) * (Math.PI / 2)
  return [rnd(C + Math.cos(a) * r), rnd(C + Math.sin(a) * r)]
}

/**
 * Brief → Curate → Personalise → Deliver, drawn as a dial with four labelled quadrants.
 * Each arc draws (DrawSVG, scrubbed) as you scroll; the step lights up as its quadrant closes.
 * RTL: the dial runs counter-clockwise (the ring mirrors, the labels do not).
 */
export function ProcessDial({ locale, t, title }: { locale: Locale; t: Dictionary['gifting']['process']; title: string }) {
  const root = useRef<HTMLDivElement>(null)
  const rtl = locale === 'ar'

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const arcs = el.querySelectorAll<SVGPathElement>('[data-arc]')
      const marks = el.querySelectorAll<SVGElement>('[data-q]')
      const steps = el.querySelectorAll<HTMLElement>('[data-step]')
      const setOn = (n: number) => {
        steps.forEach((st, j) => (st.dataset.on = String(j < n)))
        marks.forEach((m, j) => m.setAttribute('data-on', String(j < n)))
      }
      if (useExperience.getState().reducedMotion) {
        gsap.set(arcs, { drawSVG: '0% 100%' })
        setOn(4)
        return
      }
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top 72%', end: 'bottom 40%', scrub: 0.6 },
        defaults: { ease: 'none' },
        onUpdate: () => setOn(Math.floor(tl.progress() * arcs.length + 0.04)),
      })
      arcs.forEach((a, i) => {
        tl.fromTo(a, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1 }, i)
      })
    },
    { scope: root, dependencies: [locale] },
  )

  return (
    <div ref={root} className={s.process} data-mark="process">
      <p className="label">{title}</p>
      <div className={s.processBody}>
        <svg className={s.dial} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <g style={rtl ? { transform: 'scaleX(-1)', transformOrigin: '50% 50%' } : undefined}>
            <circle cx={C} cy={C} r={R} className={s.dialTrack} />
            {Array.from({ length: 60 }, (_, i) => {
              const a = (i / 60) * Math.PI * 2
              const r0 = i % 15 === 0 ? R - 16 : i % 5 === 0 ? R - 9 : R - 5
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
          </g>
          {t.map((st, i) => {
            const q = rtl ? 3 - i : i
            const [x, y] = labelPos(q, R * 0.62)
            return (
              <g key={st.n} data-q data-on="false" className={s.quadrant}>
                <text x={x} y={y - 9} textAnchor="middle" className={s.qNum}>
                  {localizeDigits(st.n, locale)}
                </text>
                <text x={x} y={y + 14} textAnchor="middle" className={s.qName}>
                  {st.name}
                </text>
              </g>
            )
          })}
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
