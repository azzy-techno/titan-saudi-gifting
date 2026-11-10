'use client'

import { useEffect, useRef } from 'react'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { pad } from '@/lib/i18n/numerals'
import { SITE } from '@/lib/site'
import { frame } from '@/lib/store'
import { useChapterTracking, useReveal } from '../hooks'
import { Configurator } from './Configurator'
import { ProcessDial } from './ProcessDial'
import { ProposalForm } from './ProposalForm'
import s from './gifting.module.css'

export function Gifting({ locale, t, form, finishes }: { locale: Locale; t: Dictionary['gifting']; form: Dictionary['form']; finishes: Dictionary['finishes']['options'] }) {
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const formTitle = useRef<HTMLHeadingElement>(null)
  useChapterTracking(section, 'gifting', 'pinned')
  useReveal(title, { locale, split: 'chars', start: 'top 72%' })
  useReveal(formTitle, { locale, split: 'lines', start: 'top 80%' })

  // Where the watch changes pose (caseback → dial → settled ¾): the chapter progress at which the
  // process and the form reach 60% of the viewport. Read by the scene each frame.
  useEffect(() => {
    const measure = () => {
      const el = section.current
      const proc = el?.querySelector<HTMLElement>('[data-mark="process"]')
      const form = el?.querySelector<HTMLElement>('#proposal')
      if (!el || !proc || !form) return
      const [a, b] = frame.ranges.gifting
      const span = Math.max(1, b - a)
      const at = (node: HTMLElement) => {
        const top = node.getBoundingClientRect().top + window.scrollY
        return Math.min(1, Math.max(0, (top - window.innerHeight * 0.6 - a) / span))
      }
      frame.marks.giftProcess = at(proc)
      frame.marks.giftForm = at(form)
    }
    measure()
    window.addEventListener('tsg:layout', measure)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('tsg:layout', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])

  const wa = SITE.whatsapp
    ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(locale === 'ar' ? 'مرحبًا، أودّ الاستفسار عن هدايا الشركات من تيتان.' : 'Hello, I would like to ask about Titan corporate gifting.')}`
    : null

  return (
    <section id="gifting" ref={section} className={s.gifting} aria-labelledby="gifting-title" data-chapter="gifting">
      <div className={`grid-12 ${s.grid}`}>
        <header className={s.head}>
          <p className="label">
            <span className="digits">{pad(6, 2, locale)}</span> — {t.label}
          </p>
          <h2 id="gifting-title" ref={title} className={`display display-xl ${s.title}`} data-focus-target>
            {t.title}
          </h2>
          <p className={s.lead}>{t.lead}</p>
        </header>

        <div className={s.column}>
          <div className={s.configStage} id="configurator">
            <Configurator locale={locale} t={t.configurator} finishes={finishes} />
          </div>
          <ProcessDial locale={locale} t={t.process} title={t.processTitle} />

          <div className={s.tiers}>
            <p className="label">{t.tiersTitle}</p>
            {/* one scale, read left to right like a ruler (right to left in Arabic) */}
            <ol className={s.scale}>
              {t.tiers.map((tier) => (
                <li key={tier.name}>
                  <h3 className={s.tierName}>{tier.name}</h3>
                  <p className={`note ${s.tierRange}`}>{tier.range}</p>
                  <p className={`note ${s.tierText}`}>{tier.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <div id="proposal" className={s.proposal}>
            <h2 id="proposal-title" ref={formTitle} className={`display ${s.formTitle}`} data-focus-target>
              {form.title}
            </h2>
            <p className={s.formIntro}>{form.intro}</p>
            <ProposalForm locale={locale} t={form} />
            <p className={s.whatsapp}>
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  {t.whatsapp}
                </a>
              ) : (
                <>
                  <span>{t.whatsapp}</span> <span className="note">{t.whatsappMissing}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
