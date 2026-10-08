'use client'

import { useEffect, useRef } from 'react'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { localizeDigits, pad } from '@/lib/i18n/numerals'
import { frame, useExperience } from '@/lib/store'
import { tick } from '@/lib/audio'
import { projected } from '@/three/labels'
import { PART_COUNT, PART_SPECS, STAGE_LABEL_PARTS } from '@/three/watchConfig'
import { useChapterTracking, useReveal } from './hooks'
import s from './anatomy.module.css'

/** Stage list highlight windows (mirrors choreography STAGES, grouped as in the brief). */
const STAGE_WINDOWS: [number, number][] = [
  [0.06, 0.16],
  [0.12, 0.2],
  [0.18, 0.32],
  [0.3, 0.39],
  [0.37, 0.58],
  [0.56, 0.69],
  [0.66, 0.75],
  [0.72, 0.8],
  [0.77, 0.86],
]

export function Anatomy({ locale, t }: { locale: Locale; t: Dictionary['anatomy'] }) {
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const counter = useRef<HTMLSpanElement>(null)
  const stages = useRef<HTMLOListElement>(null)
  const labels = useRef<HTMLDivElement>(null)
  const lines = useRef<SVGSVGElement>(null)
  const canvasReady = useExperience((st) => st.canvasReady)

  useChapterTracking(section, 'anatomy', 'pinned')
  useReveal(title, { locale, split: 'lines', start: 'top 70%' })

  useEffect(() => {
    let raf = 0
    let lastCount = -1
    const specs = new Map(PART_SPECS.map((p) => [p.name, p]))
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const exp = useExperience.getState()
      // reduced motion shows the finished diagram while the chapter is active (no scrubbing)
      const p = exp.reducedMotion ? (exp.chapter === 1 ? 0.92 : 0) : frame.chapter.anatomy
      // parts counter (mechanical: steps, plus a soft tick when it changes)
      const n = Math.min(PART_COUNT, projected.partsSeparated)
      if (n !== lastCount && counter.current) {
        counter.current.textContent = pad(n, 2, locale)
        if (lastCount >= 0 && n > lastCount) tick(0.22)
        lastCount = n
      }
      // stage list
      const items = stages.current?.children
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const [a, b] = STAGE_WINDOWS[i] ?? [2, 2]
          const el = items[i] as HTMLElement
          const state = p >= b ? 'done' : p >= a ? 'active' : 'todo'
          if (el.dataset.state !== state) el.dataset.state = state
        }
      }
      // Callouts like a technical drawing: two staggered rows BELOW the exploded stack,
      // x follows each part (de-overlapped per row), vertical leader lines drop from the part.
      const wrap = labels.current
      const svg = lines.current
      if (!wrap || !svg) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const mobile = vw < 768
      const nodes = wrap.children
      const placed: { el: HTMLElement; line: SVGPolylineElement; x: number; y: number; vis: number; w: number }[] = []
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i] as HTMLElement
        const key = el.dataset.part!
        const pr = projected.labels.get(key)
        const line = svg.children[i] as SVGPolylineElement
        if (!pr || !canvasReady || !specs.get(key)) {
          el.style.opacity = '0'
          line.style.opacity = '0'
          continue
        }
        const vis = Math.max(0, Math.min(1, (pr.visible - 0.55) / 0.45)) * (p > 0.02 && p < 0.995 ? 1 : 0)
        placed.push({ el, line, x: pr.x, y: pr.y, vis, w: el.offsetWidth })
      }
      placed.sort((q1, q2) => q1.x - q2.x)
      const margin = mobile ? 16 : vw * 0.05
      const rowsY = mobile ? [vh * 0.7, vh * 0.75] : [vh * 0.7, vh * 0.755]
      const gap = mobile ? 10 : 18
      const rowRight = [-1e9, -1e9]
      // anchors outside the central band would need long, messy leaders — skip them
      for (const q of placed) if (q.y < vh * 0.12 || q.y > vh * 0.66 || q.x < 0 || q.x > vw) q.vis = 0
      const shown = placed.filter((q) => q.vis > 0.01)
      for (const q of placed) if (q.vis <= 0.01) {
        q.el.style.opacity = '0'
        q.line.style.opacity = '0'
      }
      const xs: number[] = []
      shown.forEach((q, i) => {
        const row = i % 2
        let x = Math.max(margin, Math.min(vw - margin - q.w, q.x - q.w / 2))
        x = Math.max(x, rowRight[row]! + gap)
        rowRight[row] = x + q.w
        xs[i] = x
      })
      // if a row overflows the end margin, slide it back towards the start
      for (const row of [0, 1]) {
        const over = rowRight[row]! - (vw - margin)
        if (over > 0) shown.forEach((_, i) => i % 2 === row && (xs[i] = xs[i]! - over))
      }
      shown.forEach((q, i) => {
        const row = i % 2
        const x = xs[i]!
        const y = rowsY[row]!
        q.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
        q.el.style.opacity = String(q.vis)
        const lx = Math.max(x + 4, Math.min(x + q.w - 4, q.x))
        q.line.setAttribute('points', `${q.x.toFixed(1)},${(q.y + 6).toFixed(1)} ${lx.toFixed(1)},${(y - 14).toFixed(1)}`)
        q.line.style.opacity = String(q.vis * 0.55)
      })
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [locale, canvasReady])

  const specs = new Map(PART_SPECS.map((p) => [p.name, p]))

  return (
    <section id="anatomy" ref={section} className={s.anatomy} aria-labelledby="anatomy-title" data-chapter="anatomy">
      <div className={s.sticky}>
        <div className={`grid-12 ${s.grid}`}>
          <header className={s.intro}>
            <p className="label">
              <span className="digits">{pad(2, 2, locale)}</span> — {t.label}
            </p>
            <h2 id="anatomy-title" ref={title} className={`display ${s.title}`} data-focus-target>
              {t.title}
            </h2>
            <p className={s.body}>{t.body}</p>
          </header>
          <ol ref={stages} className={s.stages} aria-label={t.label}>
            {t.stages.map((name, i) => (
              <li key={name} data-state="todo">
                <span className="digits">{pad(i + 1, 2, locale)}</span>
                <span>{name}</span>
              </li>
            ))}
          </ol>
          <p className={s.counter} aria-live="off">
            <span className="label">{t.parts}</span>
            <span className={`digits ${s.count}`}>
              <span ref={counter}>{pad(0, 2, locale)}</span>
              <span className={s.total}> / {localizeDigits(PART_COUNT, locale)}</span>
            </span>
          </p>
          <p className={`label ${s.note}`}>{t.note}</p>
        </div>
        <svg ref={lines} className={s.lines} aria-hidden="true">
          {STAGE_LABEL_PARTS.map(({ part }) => (
            <polyline key={part} points="0,0" />
          ))}
        </svg>
        <div ref={labels} className={s.labels} aria-hidden="true">
          {STAGE_LABEL_PARTS.map(({ part, order }) => {
            const spec = specs.get(part)
            return (
              <span key={part} data-part={part} className={s.tag}>
                <span className="digits">{pad(order, 2, locale)}</span>
                {locale === 'ar' ? spec?.labelAr : spec?.labelEn}
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}
