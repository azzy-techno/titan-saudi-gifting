'use client'

import { useId, useRef, useState } from 'react'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { localizeDigits, pad } from '@/lib/i18n/numerals'
import { SITE } from '@/lib/site'
import { submitLead } from '@/lib/lead'
import { crownClick } from '@/lib/audio'
import { useChapterTracking, useReveal } from './hooks'
import s from './khobar.module.css'

export function Khobar({ locale, t, emailError, rateError }: { locale: Locale; t: Dictionary['khobar']; emailError: string; rateError: string }) {
  const section = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const id = useId()
  const [email, setEmail] = useState('')
  const [hp, setHp] = useState('')
  const [state, setState] = useState<'idle' | 'error' | 'rate' | 'done'>('idle')
  useChapterTracking(section, 'khobar', 'enter')
  useReveal(title, { locale, split: 'chars', start: 'top 70%' })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setState('error')
      return
    }
    crownClick(0.6)
    const res = await submitLead({ kind: 'notify', locale, email: email.trim(), consent: true, website: hp })
    setState(res.throttled ? 'rate' : 'done')
  }

  return (
    <section id="khobar" ref={section} className={s.khobar} aria-labelledby="khobar-title" data-chapter="khobar">
      <div className={`grid-12 ${s.grid}`}>
        <p className={`label ${s.label}`}>
          <span className="digits">{pad(7, 2, locale)}</span> — {t.label}
        </p>
        <h2 id="khobar-title" ref={title} className={`display display-xl ${s.title}`} data-focus-target>
          {t.title}
        </h2>
        <div className={s.copy}>
          <p className={s.body}>{t.body}</p>
          <p className={`label ${s.date}`}>{t.date}</p>
        </div>
        <div className={s.coords}>
          <p className="label">{t.coordsTitle}</p>
          <p className={`digits ${s.coordValue}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            {locale === 'ar' ? localizeDigits(SITE.khobar.dmsAr, locale) : SITE.khobar.dms}
          </p>
        </div>
        <form className={s.notify} onSubmit={onSubmit} noValidate>
          {state === 'done' ? (
            <p className={s.done} role="status">
              {t.notified}
            </p>
          ) : (
            <>
              <label htmlFor={`${id}-email`} className={s.notifyLabel}>
                {t.notifyLabel}
              </label>
              <div className={s.notifyRow}>
                <input
                  id={`${id}-email`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (state !== 'idle') setState('idle')
                  }}
                  aria-invalid={state === 'error' ? true : undefined}
                  aria-describedby={state === 'error' || state === 'rate' ? `${id}-err` : undefined}
                  className={s.input}
                />
                <button type="submit" className={s.button}>
                  {t.notify}
                </button>
              </div>
              <div className={s.hp} aria-hidden="true">
                <label htmlFor={`${id}-hp`}>Website</label>
                <input id={`${id}-hp`} tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
              </div>
              {state === 'error' || state === 'rate' ? (
                <p id={`${id}-err`} className={s.error} role="alert">
                  {state === 'error' ? emailError : rateError}
                </p>
              ) : null}
            </>
          )}
        </form>
      </div>
    </section>
  )
}
