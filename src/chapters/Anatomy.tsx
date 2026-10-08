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
      const p = frame.chapter.anatomy
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
      // leader-line labels (de-overlapped columns at the sides)
      const wrap = labels.current
      const svg = lines.current
      if (!wrap || !svg) return
      const vw = window.innerWidth
      const mobile = vw < 768
      const nodes = wrap.children
      const placed: { el: HTMLElement; line: SVGPolylineElement; x: number; y: number; vis: number; side: number }[] = []
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i] as HTMLElement
        const key = el.dataset.part!
        const pr = projected.labels.get(key)
        const line = svg.children[i] as SVGPolylineElement
        if (!pr || !canvasReady) {
          el.style.opacity = '0'
          line.style.opacity = '0'
          continue
        }
        const spec = specs.get(key)
        const vis = Math.max(0, Math.min(1, (pr.visible - 0.55) / 0.45)) * (p > 0.02 && p < 0.995 ? 1 : 0)
        const side = pr.x < vw / 2 ? -1 : 1
        placed.push({ el, line, x: pr.x, y: pr.y, vis: spec ? vis : 0, side })
      }
      for (const side of [-1, 1]) {
        const col = placed.filter((q) => q.side === side).sort((a, b) => a.y - b.y)
        let lastY = -1e9
        for (const q of col) {
          const y = Math.max(q.y, lastY + (mobile ? 26 : 30))
          lastY = y
          const colX = side < 0 ? vw * (mobile ? 0.06 : 0.2) : vw * (mobile ? 0.94 : 0.8)
          q.el.style.transform = `translate3d(${colX}px, ${y}px, 0)`
          q.el.dataset.side = side < 0 ? 'left' : 'right'
          q.el.style.opacity = String(q.vis)
          const elbowX = side < 0 ? colX + 12 : colX - 12
          q.line.setAttribute('points', `${q.x},${q.y} ${elbowX + (q.x - elbowX) * 0.25},${y} ${elbowX},${y}`)
          q.line.style.opacity = String(q.vis * 0.7)
        }
      }
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
