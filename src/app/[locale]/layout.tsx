import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { preload } from 'react-dom'
import { LOCALES, isLocale, type Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/i18n'
import { SITE } from '@/lib/site'
import { ARABIC_FONT_PRELOADS } from '@/fonts/site'

export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDictionary(locale)
  const url = `${SITE.url}/${locale}/`
  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates: {
      canonical: url,
      languages: { en: `${SITE.url}/en/`, ar: `${SITE.url}/ar/`, 'x-default': `${SITE.url}/` },
    },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE.name,
      title: t.meta.title,
      description: t.meta.description,
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_SA'],
      images: [{ url: `/og/og-${locale}.jpg`, width: 1200, height: 630, alt: t.meta.ogAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.meta.title,
      description: t.meta.description,
      images: [`/og/og-${locale}.jpg`],
    },
    robots: { index: true, follow: true },
  }
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  if ((locale as Locale) === 'ar') {
    for (const href of ARABIC_FONT_PRELOADS) preload(href, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  }
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: `${SITE.url}/${locale}/`,
    logo: `${SITE.url}/brand/titan-logo-light.png`,
    description: getDictionary(locale).meta.description,
    areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  )
}
