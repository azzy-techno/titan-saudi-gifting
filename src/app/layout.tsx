import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { InlineScript } from '@/components/InlineScript'

/** Sets <html lang/dir> from the URL before first paint (root layout cannot read [locale]). */
const LANG_DIR_SCRIPT = `(function(){try{var p=location.pathname;var ar=p==='/ar'||p.indexOf('/ar/')===0;var d=document.documentElement;d.lang=ar?'ar':'en';d.dir=ar?'rtl':'ltr';}catch(e){}})();`

export const metadata: Metadata = {
  title: 'Titan Saudi Corporate Gifting',
}

export const viewport: Viewport = {
  themeColor: '#0b0a09',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <InlineScript html={LANG_DIR_SCRIPT} />
      </head>
      <body>{children}</body>
    </html>
  )
}
