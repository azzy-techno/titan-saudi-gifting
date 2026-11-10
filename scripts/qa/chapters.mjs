#!/usr/bin/env node
/**
 * Capture frames at chapter progress points (matches the ScrollTrigger ranges in src/chapters/hooks.ts).
 * node scripts/qa/chapters.mjs --url http://localhost:4173/en/ --out qa/wip/ch \
 *   --at hero:0,anatomy:0.5,movement:0.4 [--width 1440 --height 900] [--mobile] [--reduced] [--wait 1400]
 * Modes: hero = top→bottom of section at viewport top; pinned = top top → bottom bottom; enter = top bottom → bottom bottom.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true'])
    return acc
  }, []),
)
const MODES = { hero: 'hero', anatomy: 'pinned', movement: 'pinned', finishes: 'pinned', collections: 'pinned', gifting: 'pinned', khobar: 'enter', footer: 'enter' }
const url = args.url
const out = args.out ?? 'qa/wip/ch'
const mobile = args.mobile === 'true'
const width = Number(args.width ?? (mobile ? 390 : 1440))
const height = Number(args.height ?? (mobile ? 844 : 900))
const wait = Number(args.wait ?? 1400)
const points = (args.at ?? 'hero:0').split(',').map((s) => {
  const [c, p] = s.split(':')
  return { c, p: Number(p ?? 0) }
})
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: mobile ? 2 : 1,
  isMobile: mobile,
  hasTouch: mobile,
  reducedMotion: args.reduced === 'true' ? 'reduce' : 'no-preference',
})
const page = await context.newPage()
const log = []
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && log.push(`${m.type()}: ${m.text().slice(0, 240)}`))
page.on('pageerror', (e) => log.push(`pageerror: ${e.message}`))
await page.goto(url, { waitUntil: 'networkidle' })
// first intent loads the 3D on tier B
await page.mouse.move(width / 2, height / 2)
await page.mouse.wheel(0, 1)
await page.waitForTimeout(Number(args.boot ?? 5000))
const shots = []
for (const [i, { c, p }] of points.entries()) {
  const y = await page.evaluate(
    ({ c, p, mode }) => {
      const el = document.querySelector(`[data-chapter="${c}"]`)
      if (!el) return null
      const top = el.getBoundingClientRect().top + scrollY
      const h = el.offsetHeight
      const vh = innerHeight
      if (mode === 'hero') return top + p * h
      if (mode === 'pinned') return top + p * Math.max(1, h - vh)
      return top - vh + p * h
    },
    { c, p, mode: MODES[c] ?? 'pinned' },
  )
  if (y == null) {
    log.push(`missing chapter ${c}`)
    continue
  }
  await page.evaluate((yy) => window.scrollTo(0, Math.round(yy)), y)
  await page.waitForTimeout(wait)
  const name = `${String(i).padStart(2, '0')}-${c}-${String(Math.round(p * 100)).padStart(3, '0')}.png`
  await page.screenshot({ path: path.join(out, name) })
  shots.push({ name, y: Math.round(y) })
}
await context.close()
await browser.close()
fs.writeFileSync(path.join(out, 'shots.json'), JSON.stringify({ url, width, height, shots, console: log }, null, 2))
console.log(`${shots.length} shots → ${out}`)
console.log(log.length ? log.join('\n') : 'console clean')
