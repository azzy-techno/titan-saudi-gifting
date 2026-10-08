#!/usr/bin/env node
/**
 * Scroll-through capture: frames at N evenly spaced scroll positions (+ optional video).
 * node scripts/qa/scroll-frames.mjs --url http://localhost:3000/lab/greybox/ --out qa/qc1/greybox --frames 24 [--width 1440 --height 900] [--video] [--mobile]
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
const url = args.url
const out = args.out ?? 'qa/frames'
const frames = Number(args.frames ?? 20)
const mobile = args.mobile === 'true'
const width = Number(args.width ?? (mobile ? 390 : 1440))
const height = Number(args.height ?? (mobile ? 844 : 900))
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: mobile ? 2 : 1,
  isMobile: mobile,
  hasTouch: mobile,
  recordVideo: args.video === 'true' ? { dir: out, size: { width, height } } : undefined,
})
const page = await context.newPage()
const log = []
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && log.push(`${m.type()}: ${m.text().slice(0, 200)}`))
page.on('pageerror', (e) => log.push(`pageerror: ${e.message}`))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(Number(args.wait ?? 4500))
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
const meta = []
for (let i = 0; i < frames; i++) {
  const y = Math.round((total * i) / (frames - 1))
  if (args.video === 'true') {
    // smooth wheel travel for the recording
    const cur = await page.evaluate(() => scrollY)
    const steps = Math.max(1, Math.round(Math.abs(y - cur) / 120))
    for (let k = 0; k < steps; k++) {
      await page.mouse.wheel(0, (y - cur) / steps)
      await page.waitForTimeout(16)
    }
    await page.waitForTimeout(900)
  } else {
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(1300)
  }
  const info = await page.evaluate(() => ({
    y: Math.round(scrollY),
    chapter: document.querySelector('[class*="hudChapter"]')?.textContent?.trim() ?? '',
  }))
  meta.push({ i, ...info })
  await page.screenshot({ path: path.join(out, `f${String(i).padStart(2, '0')}.png`) })
}
await context.close()
await browser.close()
fs.writeFileSync(path.join(out, 'frames.json'), JSON.stringify({ url, width, height, total, frames: meta, console: log }, null, 2))
console.log(`total scroll ${total}px; ${frames} frames → ${out}`)
console.log(log.length ? log.join('\n') : 'console clean')
