#!/usr/bin/env node
/** Smoke test across Chromium / Firefox / WebKit: console errors + screenshots at a few scroll points. */
import { chromium, firefox, webkit } from 'playwright'
import fs from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:3000/en/'
const out = process.argv[3] ?? 'qa/wip/xb'
fs.mkdirSync(out, { recursive: true })
const only = (process.argv[4] ?? 'chromium,webkit').split(',')
const engines = Object.fromEntries(Object.entries({ chromium, firefox, webkit }).filter(([n]) => only.includes(n)))
for (const [name, engine] of Object.entries(engines)) {
  const browser = await engine.launch(name === 'chromium' ? { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] } : {})
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const logs = []
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && logs.push(`${m.type()}: ${m.text().slice(0, 160)}`))
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message.slice(0, 200)}`))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(6000)
  const webgl = await page.evaluate(() => {
    const c = document.querySelector('.stage-canvas canvas')
    return { canvas: !!c, ready: document.querySelector('.stage-root')?.getAttribute('data-ready'), tier: '' }
  })
  await page.screenshot({ path: `${out}/${name}-0.png` })
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.2))
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${out}/${name}-1.png` })
  console.log(`[${name}] canvas=${webgl.canvas} ready=${webgl.ready} console=${logs.length}`)
  for (const l of logs.slice(0, 8)) console.log('   ', l)
  await browser.close()
}
