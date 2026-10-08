#!/usr/bin/env node
/** Summarise a Lighthouse JSON report: category scores, key metrics, failing audits. */
import fs from 'node:fs'
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const c = r.categories
console.log('SCORES', Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v.score * 100)])))
const a = r.audits
for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'interactive', 'total-byte-weight', 'mainthread-work-breakdown', 'bootup-time'])
  if (a[id]) console.log(id.padEnd(28), a[id].displayValue ?? '', a[id].score ?? '')
const lcpEl = a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node
if (lcpEl) console.log('LCP element:', lcpEl.nodeLabel?.slice(0, 80), '|', lcpEl.selector)
console.log('--- failing / warn audits')
for (const [k, v] of Object.entries(a)) {
  if (v.score !== null && v.score < 0.9 && v.scoreDisplayMode !== 'informative' && v.scoreDisplayMode !== 'manual' && v.scoreDisplayMode !== 'notApplicable')
    console.log(`${(v.score ?? 0).toFixed(2)} ${k} — ${(v.displayValue ?? '').slice(0, 60)}`)
}
