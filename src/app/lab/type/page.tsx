import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { labFontVariables } from '@/fonts/lab'
import styles from './type.module.css'

export const metadata: Metadata = {
  title: 'Lab — Type specimen',
  robots: { index: false, follow: false },
}

type Pairing = {
  id: string
  name: string
  latin: string
  arabic: string
  vars: Record<string, string>
}

const PAIRINGS: Pairing[] = [
  {
    id: 'A',
    name: 'Atelier',
    latin: 'Instrument Serif · General Sans · Geist Mono',
    arabic: 'Noto Naskh Arabic · IBM Plex Sans Arabic',
    vars: {
      '--d': 'var(--lab-a-display)',
      '--t': 'var(--lab-a-text)',
      '--m': 'var(--lab-a-mono)',
      '--ad': 'var(--lab-a-ar-display)',
      '--at': 'var(--lab-ar-plex)',
      '--dw': '400',
      '--adw': '500',
    },
  },
  {
    id: 'B',
    name: 'Chronometer',
    latin: 'Zodiak · Satoshi · JetBrains Mono',
    arabic: 'Readex Pro (light display) · Readex Pro',
    vars: {
      '--d': 'var(--lab-b-display)',
      '--t': 'var(--lab-b-text)',
      '--m': 'var(--lab-b-mono)',
      '--ad': 'var(--lab-b-ar-text)',
      '--at': 'var(--lab-b-ar-text)',
      '--dw': '300',
      '--adw': '250',
    },
  },
  {
    id: 'C',
    name: 'Gazette',
    latin: 'Boska · Geist · IBM Plex Mono',
    arabic: 'Alexandria · IBM Plex Sans Arabic',
    vars: {
      '--d': 'var(--lab-c-display)',
      '--t': 'var(--lab-c-text)',
      '--m': 'var(--lab-c-mono)',
      '--ad': 'var(--lab-c-ar-display)',
      '--at': 'var(--lab-ar-plex)',
      '--dw': '300',
      '--adw': '300',
    },
  },
]

export default function TypeSpecimenPage() {
  return (
    <main className={`${labFontVariables} ${styles.page}`}>
      <header className={styles.top}>
        <p className={styles.kicker}>/lab/type — three pairings, EN + AR</p>
        <p className={styles.kicker}>Titan Saudi Corporate Gifting · type specimen</p>
      </header>

      <section className={styles.pairing} aria-labelledby="selected-title">
        <h2 id="selected-title" className={styles.mono}>
          Selected — Pairing C “Gazette”, refined after the critic’s review (DESIGN.md §3)
        </h2>
        <p className={styles.body}>
          Boska display (300 only at 64 px and up, 400 below, italic 450) · General Sans text (replaces Geist —
          the Next.js default) · IBM Plex Mono for HUD and specs · Alexandria display at 230, 0.92× size ·
          IBM Plex Sans Arabic text at 1.12×, line-height 1.8 · Arabic-Indic digits from Alexandria (its ٠ is a
          dot; Plex Sans Arabic draws a dash) · engraving in IBM Plex Sans / Plex Sans Arabic (OFL).
        </p>
      </section>

      {PAIRINGS.map((p) => (
        <section
          key={p.id}
          id={`pairing-${p.id.toLowerCase()}`}
          className={styles.pairing}
          style={p.vars as CSSProperties}
          aria-labelledby={`pairing-${p.id}-title`}
        >
          <div className={styles.meta}>
            <h2 id={`pairing-${p.id}-title`} className={styles.mono}>
              Pairing {p.id} — {p.name}
            </h2>
            <p className={styles.mono}>{p.latin}</p>
            <p className={styles.mono}>{p.arabic}</p>
          </div>

          <p className={styles.mega}>Time, well given.</p>
          <p className={styles.megaAr} lang="ar" dir="rtl">
            وقتٌ يُهدى بعناية.
          </p>

          <div className={styles.grid}>
            <div className={styles.colA}>
              <p className={styles.mono}>01 / Hero · EN</p>
              <h3 className={styles.d2}>Every gift has an inside.</h3>
              <p className={styles.lead}>
                Titan watches for your teams, clients and milestones — personalised with an engraved
                caseback.
              </p>
              <p className={styles.body}>
                Take the watch apart and you find what a good gift is made of: parts that fit,
                finishes that last, and a name that belongs to the person wearing it. We handle the
                brief, the curation, the engraving and the delivery.
              </p>
            </div>

            <div className={styles.colB} lang="ar" dir="rtl">
              <p className={styles.monoAr}>٠١ / الافتتاحية · عربي</p>
              <h3 className={styles.d2Ar}>لكل هديةٍ عالمٌ في داخلها.</h3>
              <p className={styles.leadAr}>
                ساعات تيتان لفرق عملكم وعملائكم ومناسباتكم — تُخصَّص بنقشٍ على الغطاء الخلفي.
              </p>
              <p className={styles.bodyAr}>
                حين تُفكّك الساعة تكتشف ما تُصنع منه الهدية الجيدة: أجزاءٌ تتكامل بدقة، وتشطيبٌ يدوم،
                واسمٌ يخصّ من يرتديها. نتولّى معكم الفكرة والاختيار والنقش والتسليم.
              </p>
            </div>

            <div className={styles.colC}>
              <p className={styles.mono}>HUD</p>
              <p className={styles.hud}>
                RIYADH 14:32:07
                <br />
                CHAPTER 03 / 08
                <br />
                26.2794° N 50.2083° E
              </p>
              <p className={styles.hudAr} lang="ar" dir="rtl">
                الرياض ١٤:٣٢:٠٧
                <br />
                الفصل ٠٣ / ٠٨
              </p>
              <p className={styles.mono}>Specs</p>
              <dl className={styles.specs}>
                <div>
                  <dt>Case</dt>
                  <dd>Ø 41.0 mm</dd>
                </div>
                <div>
                  <dt>Lug to lug</dt>
                  <dd>48.0 mm</dd>
                </div>
                <div>
                  <dt>Thickness</dt>
                  <dd>11.0 mm</dd>
                </div>
                <div>
                  <dt>Parts</dt>
                  <dd>45</dd>
                </div>
              </dl>
              <p className={styles.italic}>Steel, gold-tone, black.</p>
            </div>
          </div>
        </section>
      ))}
    </main>
  )
}
