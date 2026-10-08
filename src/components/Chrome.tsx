'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useExperience } from '@/lib/store'
import { pad } from '@/lib/i18n/numerals'
import { crownClick } from '@/lib/audio'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { SITE } from '@/lib/site'
import { localizeDigits } from '@/lib/i18n/numerals'
import { CHAPTER_DOM_IDS } from '@/chapters/ids'
import { LiveTime } from './LiveTime'
import { NavDial } from './NavDial'
import { MotionToggle, SoundToggle } from './Toggles'
import styles from './chrome.module.css'

export function LanguageSwitch({ locale, label, text }: { locale: Locale; label: string; text: string }) {
  const chapter = useExperience((s) => s.chapter)
  const other = locale === 'en' ? 'ar' : 'en'
  const hash = chapter > 0 ? `#${CHAPTER_DOM_IDS[chapter]}` : ''
  return (
    <Link
      href={`/${other}/${hash}`}
      hrefLang={other}
      lang={other}
      className={styles.lang}
      aria-label={label}
      scroll={false}
      onClick={() => crownClick(0.6)}
    >
      {text}
    </Link>
  )
}

export function Header({ locale, t }: { locale: Locale; t: Dictionary }) {
  const header = useRef<HTMLElement>(null)
  useEffect(() => {
    const onScroll = () => header.current?.toggleAttribute('data-scrolled', window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header ref={header} className={styles.header}>
      <a href="#top" className={styles.brand} aria-label={t.nav.home}>
        {/* Raster logo supplied by the owner, recoloured only (official vector pending: CONTENT_TODO A1) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/titan-logo-light.png" alt="Titan" width={403} height={256} className={styles.logo} />
        <span className={styles.programme}>{t.nav.programme}</span>
      </a>
      <nav className={styles.nav} aria-label={t.nav.primary}>
        <a href="#gifting">{t.nav.gifting}</a>
        <a href="#khobar">{t.nav.khobar}</a>
        <a href="#proposal" className={styles.cta}>
          {t.nav.proposal}
        </a>
      </nav>
      <div className={styles.headerEnd}>
        <NavDial locale={locale} names={t.chapterNames} label={t.nav.progress} />
        <LanguageSwitch locale={locale} label={t.nav.languageLabel} text={t.nav.language} />
      </div>
    </header>
  )
}

export function Hud({ locale, t }: { locale: Locale; t: Dictionary }) {
  const chapter = useExperience((s) => s.chapter)
  return (
    <aside className={styles.hud} aria-label="HUD">
      <div className={`${styles.hudCell} ${styles.hudTime}`}>
        <span className={styles.hudKey}>{t.hud.riyadh}</span>
        <LiveTime locale={locale} className="digits" />
        <span className="sr-only">{t.hud.timeLabel}</span>
      </div>
      <div className={`${styles.hudCell} ${styles.hudCoords}`}>
        <span className={styles.hudKey}>{t.hud.coords}</span>
        <span className="digits" dir="ltr">
          {localizeDigits(SITE.khobar.dms, locale)}
        </span>
      </div>
      <div className={`${styles.hudCell} ${styles.hudToggles}`}>
        <SoundToggle t={t.hud} />
        <MotionToggle t={t.hud} />
      </div>
      <div className={`${styles.hudCell} ${styles.hudChapter}`}>
        <span className="digits">
          {pad(chapter + 1, 2, locale)} / {pad(8, 2, locale)}
        </span>
        <span className={styles.hudName}>{t.chapterNames[chapter]}</span>
      </div>
    </aside>
  )
}
