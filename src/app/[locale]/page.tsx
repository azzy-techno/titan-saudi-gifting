import { notFound } from 'next/navigation'
import { isLocale } from '@/lib/i18n/config'
import { getDictionary } from '@/i18n'
import { Experience } from '@/components/Experience'

export default async function LocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return <Experience locale={locale} t={getDictionary(locale)} />
}
