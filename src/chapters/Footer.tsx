'use client'

import { useRef } from 'react'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { localizeDigits } from '@/lib/i18n/numerals'
import { SITE } from '@/lib/site'
import { LanguageSwitch } from '@/components/Chrome'
import { useChapterTracking, useReveal } from './hooks'
import s from './footer.module.css'

export function Footer({ locale, t, nav }: { locale: Locale; t: Dictionary['footer']; nav: Dictionary['nav'] }) {
  const section = useRef<HTMLElement>(null)
  const signoff = useRef<HTMLParagraphElement>(null)
  useChapterTracking(section, 'footer', 'enter')
  useReveal(signoff, { locale, split: 'chars', start: 'top 85%', sweep: false })
  const confirm = (v: string) => (SITE.legal.confirmed ? v : `${v} [[CONFIRM]]`)

  return (
    <footer id="contact" ref={section} className={s.footer} data-chapter="footer">
      <div className={`grid-12 ${s.grid}`}>
        <p ref={signoff} className={`display display-xl ${s.signoff}`} >
          {t.signoff}
        </p>
        <div className={s.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/titan-logo-light.png" alt="Titan" width={403} height={256} className={s.logo} loading="lazy" />
        </div>
        <div className={s.col}>
          <h2 className="label" data-focus-target>
            {t.contactTitle}
          </h2>
          <ul>
            <li>
              <span className={s.key}>{t.email}</span>
              {SITE.email ? <a href={`mailto:${SITE.email}`}>{SITE.email}</a> : <span className="label">{t.emailMissing}</span>}
            </li>
            <li>
              <span className={s.key}>{t.whatsapp}</span>
              {SITE.whatsapp ? (
                <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener noreferrer" dir="ltr">
                  +{SITE.whatsapp}
                </a>
              ) : (
                <span className="label">[[CONFIRM: WhatsApp number]]</span>
              )}
            </li>
            <li>
              <a href="#proposal">{nav.proposal}</a>
            </li>
          </ul>
        </div>
        <div className={s.col}>
          <h2 className="label">{t.legalTitle}</h2>
          <address className={s.legal}>
            <span lang="en" dir="ltr">{confirm(SITE.legal.entity)}</span>
            <span lang="en" dir="ltr">{confirm(SITE.legal.address)}</span>
            <span>
              {t.cr} <span className="digits">{localizeDigits(SITE.legal.cr, locale)}</span> [[CONFIRM]]
            </span>
            <span>
              {t.vat} <span className="digits">{localizeDigits(SITE.legal.vat, locale)}</span> [[CONFIRM]]
            </span>
          </address>
          <p className={`label ${s.confirm}`}>{t.legalConfirm}</p>
        </div>
        <div className={s.end}>
          <LanguageSwitch locale={locale} label={nav.languageLabel} text={t.language} />
          <a href="#top" className={s.top}>
            {t.top}
          </a>
        </div>
        <p className={`label ${s.fine}`}>
          <span className="digits">{localizeDigits(t.rights, locale)}</span> · {SITE.name} · {t.trademark}
        </p>
      </div>
    </footer>
  )
}
