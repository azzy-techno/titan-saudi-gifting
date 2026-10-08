#!/usr/bin/env node
/**
 * Screenshot helper.
 * Usage: node scripts/qa/shoot.mjs --url http://localhost:3000/lab/type --out qa/qc1/type \
 *          [--widths 1440,1280,768,390] [--height 900] [--full] [--wait 1500] [--selector "#pairing-a"]
 *          [--scrolls 0,0.25,0.5] (fractions of scrollable height; shoots viewport at each)
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) {
      const next = arr[i + 1]
      acc.push([cur.slice(2), next && !next.startsWith('--') ? next : 'true'])
    }
    return acc
  }, []),
)

const url = args.url
const out = args.out ?? 'qa/shots'
const widths = (args.widths ?? '1440').split(',').map(Number)
const height = Number(args.height ?? 900)
const full = args.full === 'true'
const wait = Number(args.wait ?? 1200)
const scrolls = args.scrolls ? args.scrolls.split(',').map(Number) : null
const gpu = args.gpu !== 'false'

if (!url) {
  console.error('missing --url')
  process.exit(1)
}
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] : [],
})
const consoleLines = []
for (const w of widths) {
  const mobile = w < 768
  const context = await browser.newContext({
    viewport: { width: w, height: mobile ? 844 : height },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: args.reduced === 'true' ? 'reduce' : 'no-preference',
  })
  const page = await context.newPage()
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) consoleLines.push(`[${w}] ${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleLines.push(`[${w}] pageerror: ${e.message}`))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(wait)
  const base = path.join(out, `${w}`)
  if (args.selector) {
    const el = page.locator(args.selector)
    await el.screenshot({ path: `${base}-${args.name ?? 'el'}.png` })
  } else if (scrolls) {
    const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
    for (const [i, f] of scrolls.entries()) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * f))
      await page.waitForTimeout(wait)
      await page.screenshot({ path: `${base}-s${String(i).padStart(2, '0')}.png` })
    }
  } else {
    await page.screenshot({ path: `${base}.png`, fullPage: full })
  }
  await context.close()
}
await browser.close()
if (consoleLines.length) {
  console.log('CONSOLE:\n' + consoleLines.join('\n'))
} else {
  console.log('console clean')
}
console.log('saved to', out)
