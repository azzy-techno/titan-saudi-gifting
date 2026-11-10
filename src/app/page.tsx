import Link from 'next/link'
import type { Metadata } from 'next'
import { InlineScript } from '@/components/InlineScript'
import { SITE } from '@/lib/site'
import { BASE_PATH } from '@/lib/basePath'

export const metadata: Metadata = {
  title: SITE.name,
  alternates: {
    canonical: `${SITE.url}/`,
    languages: { en: `${SITE.url}/en/`, ar: `${SITE.url}/ar/`, 'x-default': `${SITE.url}/` },
  },
}

/** Picks a language on the client (Arabic browsers → /ar/), with plain links for everyone else. */
const PICK = `(function(){var b=${JSON.stringify(BASE_PATH)};try{var l=(navigator.languages||[navigator.language||'']).join(',').toLowerCase();var ar=/(^|,)ar/.test(l);location.replace(b+(ar?'/ar/':'/en/'));}catch(e){location.replace(b+'/en/')}})();`

export default function RootPage() {
  return (
    <main className="root-pick">
      <InlineScript html={PICK} />
      <p className="label">{SITE.name}</p>
      <nav aria-label="Language">
        <Link href="/en/" hrefLang="en" lang="en">
          English
        </Link>
        <Link href="/ar/" hrefLang="ar" lang="ar">
          العربية
        </Link>
      </nav>
    </main>
  )
}
