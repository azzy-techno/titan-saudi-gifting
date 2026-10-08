#!/usr/bin/env node
/**
 * Post-build for the static export (out/):
 *  1. /ar/** HTML: <html lang="ar" dir="rtl"> (the root layout cannot read [locale]; an inline script
 *     also sets it at runtime — this makes it correct for crawlers and no-JS).
 *  2. Sanity checks: one <h1> per locale page, no lorem ipsum, [[CONFIRM]] count report.
 */
import fs from 'node:fs'
import path from 'node:path'

const OUT = 'out'
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name)
    return d.isDirectory() ? walk(p) : [p]
  })

// Segment prefetch payloads: the export writes `__next.$d$locale/__PAGE__.txt`, while the client router
// requests the flat `__next.$d$locale.__PAGE__.txt`. Add flat aliases so static hosts resolve both.
let aliased = 0
for (const file of walk(OUT).filter((f) => f.endsWith('.txt'))) {
  const parts = path.relative(OUT, file).split(path.sep)
  const i = parts.findIndex((p) => p.startsWith('__next.'))
  if (i < 0 || i === parts.length - 1) continue
  const flat = path.join(OUT, ...parts.slice(0, i), parts.slice(i).join('.'))
  if (!fs.existsSync(flat)) {
    fs.copyFileSync(file, flat)
    aliased++
  }
}
console.log(`postbuild: added ${aliased} flat RSC segment alias(es)`)

let rewritten = 0
for (const file of walk(OUT).filter((f) => f.endsWith('.html'))) {
  const rel = path.relative(OUT, file).split(path.sep).join('/')
  let html = fs.readFileSync(file, 'utf8')
  if (rel.startsWith('ar/')) {
    const next = html.replace(/<html([^>]*?)\slang="en"([^>]*?)\sdir="ltr"/, '<html$1 lang="ar"$2 dir="rtl"')
    if (next !== html) {
      fs.writeFileSync(file, next)
      html = next
      rewritten++
    }
  }
  if (/^(en|ar)\/index\.html$/.test(rel)) {
    const h1 = (html.match(/<h1[\s>]/g) ?? []).length
    const confirms = (html.match(/\[\[CONFIRM/g) ?? []).length
    if (h1 !== 1) throw new Error(`${rel}: expected exactly one <h1>, found ${h1}`)
    if (/lorem ipsum/i.test(html)) throw new Error(`${rel}: lorem ipsum found`)
    console.log(`✓ ${rel}: 1 h1, ${confirms} [[CONFIRM]] placeholders, lang=${/<html[^>]*lang="ar"/.test(html) ? 'ar' : 'en'}`)
  }
}
console.log(`postbuild: rewrote lang/dir in ${rewritten} Arabic HTML file(s)`)
