'use client'

import { useEffect, useRef } from 'react'
import { useExperience } from '@/lib/store'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { projected } from '@/three/labels'
import { playReveal, useChapterTracking, useReveal, triggerSweep } from './hooks'
import s from './hero.module.css'

export function Hero({ locale, t }: { locale: Locale; t: Dictionary['hero'] }) {
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const caption = useRef<HTMLParagraphElement>(null)
  const leader = useRef<SVGLineElement>(null)
  const ready = useExperience((st) => st.ready)
  const canvasReady = useExperience((st) => st.canvasReady)

  useChapterTracking(section, 'hero', 'hero')
  useReveal(title, { locale, split: 'chars', manual: true })

  useEffect(() => {
    if (!ready) return
    playReveal(title.current)
    const t1 = window.setTimeout(triggerSweep, 350)
    return () => window.clearTimeout(t1)
  }, [ready])

  // Leader line from the caption to the projected dial centre
  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const c = caption.current
      const l = leader.current
      if (!c || !l) return
      const r = c.getBoundingClientRect()
      const d = projected.dialCenter
      const show = canvasReady && d.visible > 0.01 && d.x > 0
      const rtl = document.documentElement.dir === 'rtl'
      const x1 = rtl ? r.left - 12 : r.right + 12
      const y1 = r.top + r.height / 2
      l.setAttribute('x1', String(x1))
      l.setAttribute('y1', String(y1))
      l.setAttribute('x2', String(d.x))
      l.setAttribute('y2', String(d.y))
      l.style.opacity = show ? String(Math.min(1, d.visible) * 0.6) : '0'
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [canvasReady])

  const comma = t.title.indexOf(',')
  const [l1, l2] = comma > 0 ? [t.title.slice(0, comma + 1), t.title.slice(comma + 1).trim()] : splitArabic(t.title)

  return (
    <section id="top" ref={section} className={s.hero} aria-labelledby="hero-title" data-chapter="hero">
      <div className={s.poster} data-hero-poster data-hidden={canvasReady ? 'true' : 'false'} aria-hidden="true" />
      <div className={`grid-12 ${s.grid}`}>
        <p className={`label ${s.eyebrow}`}>{t.eyebrow}</p>
        <div className={s.intro}>
          <p className={s.line}>{t.line}</p>
          <div className={s.ctas}>
            <a href="#gifting" className={s.cta} data-focus-target>
              {t.ctaGifting}
            </a>
            <a href="#anatomy" className={`${s.cta} ${s.ctaQuiet}`}>
              {t.ctaExplore}
            </a>
          </div>
        </div>
        <h1 id="hero-title" ref={title} className={`display display-xl ${s.title}`}>
          <span className={s.l1}>{l1}</span> <span className={s.l2}>{l2}</span>
        </h1>
        <p ref={caption} className={`label ${s.caption}`}>
          {t.liveCaption}
        </p>
        <p className={`label ${s.scroll}`} aria-hidden="true">
          <span className={s.scrollTick} />
          {t.scroll}
        </p>
      </div>
      <svg className={s.leader} aria-hidden="true">
        <line ref={leader} x1="0" y1="0" x2="0" y2="0" />
      </svg>
    </section>
  )
}

function splitArabic(title: string): [string, string] {
  const words = title.split(' ')
  const cut = Math.max(1, Math.ceil(words.length / 2))
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')]
}
