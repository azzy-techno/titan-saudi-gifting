import type { Metadata } from 'next'
import { getDictionary } from '@/i18n'
import { Experience } from '@/components/Experience'

export const metadata: Metadata = {
  title: 'Lab — Grey-box storyboard',
  robots: { index: false, follow: false },
}

/** The whole scroll storyboard with the primitive placeholder watch (QC1 pacing check). */
export default function GreyboxPage() {
  return <Experience locale="en" t={getDictionary('en')} variant="greybox" />
}
