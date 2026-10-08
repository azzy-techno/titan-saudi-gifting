import localFont from 'next/font/local'

/**
 * Candidate faces for the /lab/type specimen (three pairings, EN + AR).
 * Fontshare faces (ITF FFL v2.0) are used exactly as distributed — no subsetting/conversion (licence §02).
 * OFL faces come pre-subset from @fontsource.
 */

// Pairing A — "Atelier"
export const instrumentSerif = localFont({
  src: [
    { path: './ofl/instrument-serif-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './ofl/instrument-serif-latin-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--lab-a-display',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
})
export const generalSans = localFont({
  src: './fontshare/GeneralSans-Variable.woff2',
  weight: '200 700',
  variable: '--lab-a-text',
  display: 'swap',
  preload: false,
})
export const geistMono = localFont({
  src: './ofl/geist-mono-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--lab-a-mono',
  display: 'swap',
  preload: false,
})
export const notoNaskh = localFont({
  src: './ofl/noto-naskh-arabic-arabic-wght-normal.woff2',
  weight: '400 700',
  variable: '--lab-a-ar-display',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
})
export const plexArabic = localFont({
  src: [
    { path: './ofl/ibm-plex-sans-arabic-arabic-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './ofl/ibm-plex-sans-arabic-arabic-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './ofl/ibm-plex-sans-arabic-arabic-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './ofl/ibm-plex-sans-arabic-arabic-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--lab-ar-plex',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
})

// Pairing B — "Chronometer"
export const zodiak = localFont({
  src: [
    { path: './fontshare/Zodiak-Variable.woff2', weight: '100 900', style: 'normal' },
    { path: './fontshare/Zodiak-VariableItalic.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--lab-b-display',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
})
export const satoshi = localFont({
  src: './fontshare/Satoshi-Variable.woff2',
  weight: '300 900',
  variable: '--lab-b-text',
  display: 'swap',
  preload: false,
})
export const jetbrainsMono = localFont({
  src: './ofl/jetbrains-mono-latin-wght-normal.woff2',
  weight: '100 800',
  variable: '--lab-b-mono',
  display: 'swap',
  preload: false,
})
export const amiri = localFont({
  src: [
    { path: './ofl/amiri-arabic-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './ofl/amiri-arabic-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--lab-b-ar-display',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
})
export const readexPro = localFont({
  src: './ofl/readex-pro-arabic-wght-normal.woff2',
  weight: '160 700',
  variable: '--lab-b-ar-text',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
})

// Pairing C — "Gazette"
export const boska = localFont({
  src: [
    { path: './fontshare/Boska-Variable.woff2', weight: '200 900', style: 'normal' },
    { path: './fontshare/Boska-VariableItalic.woff2', weight: '200 900', style: 'italic' },
  ],
  variable: '--lab-c-display',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
})
export const geist = localFont({
  src: './ofl/geist-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--lab-c-text',
  display: 'swap',
  preload: false,
})
export const plexMono = localFont({
  src: [
    { path: './ofl/ibm-plex-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './ofl/ibm-plex-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--lab-c-mono',
  display: 'swap',
  preload: false,
})
export const alexandria = localFont({
  src: './ofl/alexandria-arabic-wght-normal.woff2',
  weight: '100 900',
  variable: '--lab-c-ar-display',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
})

export const labFontVariables = [
  instrumentSerif,
  generalSans,
  geistMono,
  notoNaskh,
  plexArabic,
  zodiak,
  satoshi,
  jetbrainsMono,
  amiri,
  readexPro,
  boska,
  geist,
  plexMono,
  alexandria,
]
  .map((f) => f.variable)
  .join(' ')
