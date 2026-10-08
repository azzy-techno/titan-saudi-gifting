'use client'

import { useEffect } from 'react'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { useExperience } from '@/lib/store'
import { ScrollTrigger, registerGsap } from '@/lib/gsap'
import { checkModel } from '@/three/modelUrls'
import { SmoothScroll } from './scroll/SmoothScroll'
import { Header, Hud } from './Chrome'
import { Cursor } from './Cursor'
import { Preloader } from './Preloader'
import { GridOverlay } from './GridOverlay'
import { Hero } from '@/chapters/Hero'
import { Anatomy } from '@/chapters/Anatomy'
import { Movement } from '@/chapters/Movement'
import { Finishes } from '@/chapters/Finishes'
import { Collections } from '@/chapters/Collections'
import { Gifting } from '@/chapters/gifting/Gifting'
import { Khobar } from '@/chapters/Khobar'
import { Footer } from '@/chapters/Footer'

export function Experience({ locale, t, variant }: { locale: Locale; t: Dictionary; variant?: 'greybox' }) {
  useEffect(() => {
    registerGsap()
    const set = useExperience.getState().set
    set({
      locale,
      sceneActive: true,
      engravingDefault: t.gifting.configurator.engravingPlaceholder.replace(' · ', '\n'),
    })
    if (variant === 'greybox') set({ model: 'greybox' })
    else checkModel().then((ok) => set({ model: ok ? 'glb' : 'greybox' }))
    // keep the chapter when arriving from the language switch (#hash)
    const id = window.location.hash.slice(1)
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }))
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => set({ sceneActive: false })
  }, [locale, t, variant])

  return (
    <>
      <a href="#main" className="skip-link">
        {t.skip}
      </a>
      <SmoothScroll />
      <Header locale={locale} t={t} />
      <Hud locale={locale} t={t} />
      <Cursor loupeLabel={t.movement.loupe} />
      <Preloader locale={locale} label={t.preloader.label} ready={t.preloader.ready} programme={t.nav.programme} />
      <main id="main" tabIndex={-1}>
        <Hero locale={locale} t={t.hero} />
        <Anatomy locale={locale} t={t.anatomy} />
        <Movement locale={locale} t={t.movement} />
        <Finishes locale={locale} t={t.finishes} straps={t.gifting.configurator.straps} strapTitle={t.finishes.strapTitle} />
        <Collections locale={locale} t={t.collections} />
        <Gifting locale={locale} t={t.gifting} form={t.form} finishes={t.finishes.options} />
        <Khobar locale={locale} t={t.khobar} emailError={t.form.errors.email} rateError={t.form.errors.rate} />
      </main>
      <Footer locale={locale} t={t.footer} nav={t.nav} />
      <p className="sr-only">{t.a11y.sceneSummary}</p>
      {process.env.NODE_ENV === 'development' ? <GridOverlay /> : null}
    </>
  )
}
