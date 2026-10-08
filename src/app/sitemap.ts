import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { en: `${SITE.url}/en/`, ar: `${SITE.url}/ar/` }
  return (['en', 'ar'] as const).map((l) => ({
    url: `${SITE.url}/${l}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 1,
    alternates: { languages },
  }))
}
