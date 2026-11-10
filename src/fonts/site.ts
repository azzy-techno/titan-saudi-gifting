import localFont from 'next/font/local'
import { asset } from '@/lib/basePath'

/**
 * Final pairing — "Gazette" (refined after the QC1 type critique, see DESIGN.md §3):
 *  Display  Boska (Fontshare, ITF FFL — used unmodified, no subsetting)
 *  Text     General Sans (Fontshare, ITF FFL — unmodified)
 *  Mono     IBM Plex Mono (OFL)
 *  Arabic   Alexandria (display + digits) · IBM Plex Sans Arabic (text) — OFL, via src/styles/fontFaces.ts
 * Arabic faces are plain @font-face rules (public/fonts) so they are only preloaded on /ar pages.
 */
export const boska = localFont({
  src: [
    { path: './fontshare/Boska-Variable.woff2', weight: '200 900', style: 'normal' },
    { path: './fontshare/Boska-VariableItalic.woff2', weight: '200 900', style: 'italic' },
  ],
  variable: '--ff-display',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Times New Roman',
  fallback: ['Times New Roman', 'serif'],
})

export const generalSans = localFont({
  src: './fontshare/GeneralSans-Variable.woff2',
  weight: '200 700',
  variable: '--ff-text',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Arial',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
})

export const plexMono = localFont({
  src: [
    { path: './ofl/ibm-plex-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './ofl/ibm-plex-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--ff-mono',
  display: 'swap',
  preload: true,
  adjustFontFallback: false,
  fallback: ['ui-monospace', 'Consolas', 'monospace'],
})

export const siteFontVariables = [boska.variable, generalSans.variable, plexMono.variable].join(' ')

/** Static URLs of the Arabic faces (for <link rel="preload"> on /ar only). */
export const ARABIC_FONT_PRELOADS = [
  asset('/fonts/alexandria-arabic-wght.woff2'),
  asset('/fonts/plex-sans-arabic-400.woff2'),
] as const

/** Engraving faces (canvas) — OFL only, loaded on demand by the engraving renderer. */
export const ENGRAVING_FONTS = {
  latin: { family: 'TSG Engrave Latin', url: asset('/fonts/plex-sans-latin-500.woff2'), weight: '500' },
  arabic: { family: 'TSG Engrave Arabic', url: asset('/fonts/plex-sans-arabic-500.woff2'), weight: '500' },
} as const
