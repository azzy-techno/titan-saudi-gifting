import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { InlineScript } from '@/components/InlineScript'
import { siteFontVariables } from '@/fonts/site'
import { StageMount } from '@/three/StageMount'
import { SITE } from '@/lib/site'
import { BASE_PATH } from '@/lib/basePath'
import { arabicFontFaces } from '@/styles/fontFaces'

/** Sets <html lang/dir> from the URL before first paint (the root layout cannot read [locale]). */
const LANG_DIR_SCRIPT = `(function(){try{var b=${JSON.stringify(BASE_PATH)};var p=location.pathname;if(b&&p.indexOf(b)===0)p=p.slice(b.length)||'/';var ar=p==='/ar'||p.indexOf('/ar/')===0;var d=document.documentElement;d.lang=ar?'ar':'en';d.dir=ar?'rtl':'ltr';var m=matchMedia('(prefers-reduced-motion: reduce)').matches;var s=null;try{s=localStorage.getItem('tsg.motion')}catch(e){}if(s==='reduced'||(s!=='full'&&m))d.classList.add('reduce-motion');d.classList.add('js');}catch(e){}})();`

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.name,
  applicationName: SITE.name,
  formatDetection: { telephone: false, email: false, address: false },
  robots: { index: SITE.indexable, follow: SITE.indexable },
}

export const viewport: Viewport = {
  themeColor: '#0b0a09',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

/**
 * Root layout — shared by /en, /ar and /lab. The WebGL stage is mounted HERE, once,
 * so it survives client-side navigation between locales (DESIGN.md §8, PROGRESS D3).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={siteFontVariables}>
      <head>
        <InlineScript html={LANG_DIR_SCRIPT} />
        {/* Arabic + engraving @font-face rules (URLs need the base path, so they are generated) */}
        <style dangerouslySetInnerHTML={{ __html: arabicFontFaces }} />
      </head>
      <body>
        <StageMount />
        {children}
      </body>
    </html>
  )
}
