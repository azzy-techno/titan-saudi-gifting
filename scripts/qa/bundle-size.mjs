#!/usr/bin/env node
/** Gzipped size of the JS a page loads up front (script tags in the HTML) vs. everything else. */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const page = process.argv[2] ?? 'out/en/index.html'
const html = fs.readFileSync(page, 'utf8')
// modern browsers skip noModule (legacy polyfill) scripts entirely — exclude them
const srcs = [...html.matchAll(/<script([^>]+)>/g)].filter((m) => !/noModule/i.test(m[1])).map((m) => /src="([^"]+)"/.exec(m[1])?.[1]).filter(Boolean)
const gz = (f) => zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length
let total = 0
const rows = []
for (const s of srcs) {
  const f = path.join('out', s.split('?')[0])
  if (!fs.existsSync(f)) continue
  const g = gz(f)
  total += g
  rows.push([s.replace('/_next/static/chunks/', ''), (fs.statSync(f).size / 1024).toFixed(1), (g / 1024).toFixed(1)])
}
rows.sort((a, b) => b[2] - a[2])
for (const r of rows) console.log(r[2].padStart(7), 'KB gz', r[1].padStart(8), 'KB raw', r[0])
console.log(`INITIAL JS (script tags in ${page}): ${(total / 1024).toFixed(1)} KB gzipped across ${rows.length} files`)
// all chunks (to show the lazy 3D chunk)
const dir = 'out/_next/static/chunks'
const all = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => [f, gz(path.join(dir, f))]).sort((a, b) => b[1] - a[1])
console.log('largest chunks overall:')
for (const [f, g] of all.slice(0, 8)) console.log(' ', (g / 1024).toFixed(1).padStart(7), 'KB gz', f, srcs.some((s) => s.includes(f)) ? '(initial)' : '(lazy)')
