import type { Metadata } from 'next'
import { labFontVariables } from '@/fonts/lab'

export const metadata: Metadata = { title: 'Lab — Arabic digits', robots: { index: false, follow: false } }

const FACES = [
  ['Alexandria', 'var(--lab-c-ar-display)', 300],
  ['IBM Plex Sans Arabic', 'var(--lab-ar-plex)', 400],
  ['Readex Pro', 'var(--lab-b-ar-text)', 400],
  ['Noto Naskh Arabic', 'var(--lab-a-ar-display)', 400],
] as const

export default function DigitsPage() {
  return (
    <main className={labFontVariables} style={{ padding: 40, background: '#0b0a09', color: '#ece7df' }}>
      {FACES.map(([name, ff, w]) => (
        <section key={name} style={{ borderBottom: '1px solid rgb(236 231 223 / .12)', padding: '16px 0' }}>
          <p style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '.12em', color: '#8f887d' }}>{name}</p>
          {[12, 14, 16, 20].map((s) => (
            <p key={s} dir="rtl" lang="ar" style={{ fontFamily: ff, fontWeight: w, fontSize: s, fontVariantNumeric: 'tabular-nums' }}>
              {s}px — الرياض ١٤:٣٢:٠٧ — الفصل ٠٣ / ٠٨ — ٠١٢٣٤٥٦٧٨٩ — ٢٦°١٧′ش ٥٠°١٢′شر
            </p>
          ))}
        </section>
      ))}
    </main>
  )
}
