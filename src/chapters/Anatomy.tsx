'use client'

import { useEffect, useRef } from 'react'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { localizeDigits, pad } from '@/lib/i18n/numerals'
import { frame, useExperience } from '@/lib/store'
import { tick } from '@/lib/audio'
import { projected } from '@/three/labels'
import { PART_COUNT, PART_SPECS, STAGE_LABEL_PARTS } from '@/three/watchConfig'
import { useChapterTracking, useNearViewport, useReveal } from './hooks'
import s from './anatomy.module.css'

/**
 * 02 Anatomy — the stack comes apart in the centre columns; DOM labels sit in two side columns
 * (back parts on one side, front parts on the other) with leader lines to their projected 3D anchors.
 * The intro body fades as the parts start to separate; the finished diagram holds from p = 0.8.
 * Phones: the watch lies flat, the stack explodes vertically and only the latest stage is labelled.
 */
export function Anatomy({ locale, t }: { locale: Locale; t: Dictionary['anatomy'] }) {
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const counter = useRef<HTMLSpanElement>(null)
  const labels = useRef<HTMLDivElement>(null)
  const lines = useRef<SVGSVGElement>(null)
  const canvasReady = useExperience((st) => st.canvasReady)

  useChapterTracking(section, 'anatomy', 'pinned')
  const near = useNearViewport(section)
  useReveal(title, { locale, split: 'lines', start: 'top 70%' })

  useEffect(() => {
    let raf = 0
    let lastCount = -1
    const specs = new Map(PART_SPECS.map((p) => [p.name, p]))
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!near.current && lastCount >= 0) return
      const exp = useExperience.getState()
      // reduced motion shows the finished diagram while the chapter is active (no scrubbing)
      const p = exp.reducedMotion ? (exp.chapter === 1 ? 0.9 : 0) : frame.chapter.anatomy
      // parts counter (mechanical steps, soft tick when it changes)
      const n = Math.min(PART_COUNT, projected.partsSeparated)
      if (n !== lastCount && counter.current) {
        counter.current.textContent = pad(n, 2, locale)
        if (lastCount >= 0 && n > lastCount) tick(0.22)
        lastCount = n
      }
      // the intro body steps aside once the parts start to separate
      if (body.current) {
        const o = exp.reducedMotion ? 1 : 1 - Math.min(1, Math.max(0, (p - 0.2) / 0.08))
        body.current.style.opacity = o.toFixed(3)
        body.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'
      }

      const wrap = labels.current
      const svg = lines.current
      if (!wrap || !svg) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const phone = vw < 768
      const rtl = document.documentElement.dir === 'rtl'
      const nodes = wrap.children
      type Item = { el: HTMLElement; line: SVGPolylineElement; x: number; y: number; vis: number; order: number; back: boolean }
      const items: Item[] = []
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i] as HTMLElement
        const key = el.dataset.part!
        const pr = projected.labels.get(key)
        const line = svg.children[i] as SVGPolylineElement
        const spec = specs.get(key)
        if (!pr || !canvasReady || !spec) {
          el.style.opacity = '0'
          line.style.opacity = '0'
          continue
        }
        const vis = Math.max(0, Math.min(1, (pr.visible - 0.55) / 0.45)) * (p > 0.02 && p < 0.995 ? 1 : 0)
        const onScreen = pr.x > 0 && pr.x < vw && pr.y > vh * 0.08 && pr.y < vh * 0.9
        items.push({ el, line, x: pr.x, y: pr.y, vis: onScreen ? vis : 0, order: spec.order, back: spec.axis[2] < 0 || spec.axis[0] > 0 })
      }

      if (phone) {
        // one active label: the most recent stage that is (mostly) separated
        const live = items.filter((q) => q.vis > 0.5).sort((a, b) => b.order - a.order)[0]
        for (const q of items) {
          const show = q === live ? q.vis : 0
          q.el.style.opacity = String(show)
          q.line.style.opacity = String(show * 0.6)
          if (q !== live) continue
          const colX = rtl ? vw * 0.06 : vw * 0.94
          const y = Math.max(vh * 0.16, Math.min(vh * 0.72, q.y))
          q.el.dataset.side = rtl ? 'start' : 'end'
          q.el.style.transform = `translate3d(${colX.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
          const ex = rtl ? colX + 10 : colX - 10
          q.line.setAttribute('points', `${q.x.toFixed(1)},${q.y.toFixed(1)} ${ex.toFixed(1)},${y.toFixed(1)}`)
        }
        return
      }

      // desktop: back parts in the end column, front parts in the start column (mirrored in RTL)
      const columns: [Item[], number][] = [
        [items.filter((q) => q.back), rtl ? vw * 0.13 : vw * 0.87],
        [items.filter((q) => !q.back), rtl ? vw * 0.87 : vw * 0.13],
      ]
      for (const [col, colX] of columns) {
        col.sort((a, b) => a.y - b.y)
        let lastY = -1e9
        for (const q of col) {
          const y = Math.max(q.y, lastY + 34)
          lastY = y
          const onLeft = colX < vw / 2
          q.el.dataset.side = onLeft ? 'left' : 'right'
          q.el.style.transform = `translate3d(${colX.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
          q.el.style.opacity = String(q.vis)
          const dir = onLeft ? 1 : -1
          const ex = colX + dir * 12
          const elbow = ex + dir * 28
          q.line.setAttribute('points', `${q.x.toFixed(1)},${q.y.toFixed(1)} ${elbow.toFixed(1)},${y.toFixed(1)} ${ex.toFixed(1)},${y.toFixed(1)}`)
          q.line.style.opacity = String(q.vis * 0.55)
        }
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [locale, canvasReady, near])

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
            <div ref={body}>
              <p className={s.body}>{t.body}</p>
            </div>
          </header>
          <p className={s.counter}>
            <span className="label">{t.parts}</span>
            <span className={`digits ${s.count}`}>
              <span ref={counter}>{pad(0, 2, locale)}</span>
              <span className={s.total}> / {localizeDigits(PART_COUNT, locale)}</span>
            </span>
          </p>
          <p className={`note ${s.note}`}>{t.note}</p>
          {/* stage names for screen readers (visually, the diagram itself is the list) */}
          <ol className="sr-only">
            {t.stages.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ol>
        </div>
        <svg ref={lines} className={s.lines} aria-hidden="true">
          {STAGE_LABEL_PARTS.map(({ part }) => (
            <polyline key={part} points="0,0" />
          ))}
        </svg>
        <div ref={labels} className={s.labels} aria-hidden="true">
          {STAGE_LABEL_PARTS.map(({ part }) => {
            const spec = specs.get(part)
            return (
              <span key={part} data-part={part} className={s.tag}>
                {locale === 'ar' ? spec?.labelAr : spec?.labelEn}
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}
