import type { Metadata } from 'next'
import Link from 'next/link'
import { contrast, over, PALETTE } from '@/lib/contrast'
import { MotionDemos } from './MotionDemos'
import s from './lab.module.css'

export const metadata: Metadata = {
  title: 'Lab — Palette, motion, storyboard',
  robots: { index: false, follow: false },
}

const SWATCHES: { name: keyof typeof PALETTE; role: string }[] = [
  { name: 'ink-0', role: 'Base · WebGL clear colour' },
  { name: 'ink-1', role: 'Graphite 1 · panels, inputs' },
  { name: 'ink-2', role: 'Graphite 2 · hover, prefixes' },
  { name: 'ink-3', role: 'Graphite 3 · strong rules' },
  { name: 'bone', role: 'Primary text' },
  { name: 'bone-2', role: 'Secondary text' },
  { name: 'bone-3', role: 'Tertiary text · mono labels' },
  { name: 'accent', role: 'The one metal accent' },
  { name: 'error', role: 'Form errors' },
]

const PAIRS: [keyof typeof PALETTE, keyof typeof PALETTE, string][] = [
  ['bone', 'ink-0', 'Body, headlines'],
  ['bone-2', 'ink-0', 'Secondary copy'],
  ['bone-2-ar', 'ink-0', 'Secondary copy (Arabic)'],
  ['bone-3', 'ink-0', 'Mono labels 11–12 px'],
  ['accent', 'ink-0', 'Accent labels, links'],
  ['ink-0', 'accent', 'Text on accent buttons'],
  ['bone', 'ink-1', 'Text in panels'],
  ['bone-2', 'ink-1', 'Secondary in panels'],
  ['bone-3', 'ink-1', 'Labels in panels'],
  ['bone-3', 'ink-2', 'Labels on hover'],
  ['error', 'ink-0', 'Error messages'],
  ['error', 'ink-1', 'Error messages in panels'],
]

export default function LabIndex() {
  const hairline = over('#ece7df', 0.12, PALETTE['ink-0'])
  return (
    <main className={s.lab}>
      <header className={s.head}>
        <p className="label">/lab — Titan Saudi Corporate Gifting</p>
        <h1 className="display display-xl">Lab</h1>
        <nav className={s.links} aria-label="Lab">
          <Link href="/lab/type/">Type specimen</Link>
          <Link href="/lab/greybox/">Grey-box storyboard</Link>
          <Link href="/lab/digits/">Arabic digits test</Link>
          <Link href="/en/">Site (EN)</Link>
          <Link href="/ar/">Site (AR)</Link>
        </nav>
      </header>

      <section className={s.section} aria-labelledby="palette">
        <h2 id="palette" className="label">Palette — Midnight atelier</h2>
        <ul className={s.swatches}>
          {SWATCHES.map((sw) => (
            <li key={sw.name}>
              <span className={s.chip} style={{ background: PALETTE[sw.name] }} />
              <span className={s.swName}>--{sw.name}</span>
              <span className="label">{PALETTE[sw.name]}</span>
              <span className={s.swRole}>{sw.role}</span>
            </li>
          ))}
          <li>
            <span className={s.chip} style={{ background: hairline }} />
            <span className={s.swName}>--hairline</span>
            <span className="label">bone @ 12% → {hairline}</span>
            <span className={s.swRole}>1 px rules</span>
          </li>
        </ul>
        <table className={s.table}>
          <caption className="label">WCAG 2.2 contrast (AA: 4.5 normal text, 3.0 large text / UI)</caption>
          <thead>
            <tr>
              <th scope="col">Text</th>
              <th scope="col">Background</th>
              <th scope="col">Use</th>
              <th scope="col">Ratio</th>
              <th scope="col">AA</th>
            </tr>
          </thead>
          <tbody>
            {PAIRS.map(([fg, bg, use]) => {
              const r = contrast(PALETTE[fg], PALETTE[bg])
              return (
                <tr key={fg + bg}>
                  <td>
                    <span style={{ color: PALETTE[fg], background: PALETTE[bg], padding: '2px 8px' }}>{fg}</span>
                  </td>
                  <td>{bg}</td>
                  <td>{use}</td>
                  <td className="digits">{r.toFixed(2)} : 1</td>
                  <td>{r >= 4.5 ? 'Pass' : r >= 3 ? 'Large only' : 'Fail'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className={s.section} aria-labelledby="motion">
        <h2 id="motion" className="label">Motion tokens</h2>
        <MotionDemos />
      </section>
    </main>
  )
}
