'use client'

import { useEffect, useRef } from 'react'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { pad } from '@/lib/i18n/numerals'
import { frame } from '@/lib/store'
import { ScrollTrigger } from '@/lib/gsap'
import { useChapterTracking, useReveal } from './hooks'
import s from './collections.module.css'

/** Pinned horizontal strip. The section height equals the horizontal travel, so scrolling stays native. */
export function Collections({ locale, t }: { locale: Locale; t: Dictionary['collections'] }) {
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  useChapterTracking(section, 'collections', 'pinned')
  useReveal(title, { locale, split: 'lines', start: 'top 60%' })

  useEffect(() => {
    const sec = section.current
    const tr = track.current
    if (!sec || !tr) return
    const measure = () => {
      const extra = Math.max(0, tr.scrollWidth - window.innerWidth)
      sec.style.setProperty('--travel', `${extra}px`)
      ScrollTrigger.refresh()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(tr)
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const extra = Math.max(0, tr.scrollWidth - window.innerWidth)
      const rtl = document.documentElement.dir === 'rtl'
      const x = frame.chapter.collections * extra * (rtl ? 1 : -1)
      tr.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`
    }
    raf = requestAnimationFrame(loop)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section id="collections" ref={section} className={s.collections} aria-labelledby="collections-title" data-chapter="collections">
      <div className={s.sticky}>
        <div ref={track} className={s.track} data-collections-track>
          <header className={s.intro}>
            <p className="label">
              <span className="digits">{pad(5, 2, locale)}</span> — {t.label}
            </p>
            <h2 id="collections-title" ref={title} className={`display ${s.title}`} data-focus-target>
              {t.title}
            </h2>
            <p className={s.body}>{t.body}</p>
            <p className={`label ${s.confirm}`}>{t.confirm}</p>
            <p className={`label ${s.hint}`} aria-hidden="true">
              {t.hint}
            </p>
          </header>
          {t.items.map((item, i) => (
            <article key={item.id} className={s.card} aria-labelledby={`col-${item.id}`}>
              <div className={s.frame} data-collection-plane data-src={`/img/collections/${item.id}.webp`}>
                {/* DOM fallback (tier C / before WebGL); hidden when the WebGL plane is live */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/img/collections/${item.id}.webp`} alt="" width={1000} height={1250} loading="lazy" decoding="async" />
                <span className={s.tag}>{t.placeholderTag}</span>
              </div>
              <div className={s.meta}>
                <span className="label digits">{pad(i + 1, 2, locale)}</span>
                <h3 id={`col-${item.id}`} className={s.name} lang="en" dir="ltr">
                  {item.name}
                </h3>
              </div>
              <p className={s.line}>{item.line}</p>
              <p className={`label ${s.pending}`}>{t.pending}</p>
            </article>
          ))}
          <div className={s.end} aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
