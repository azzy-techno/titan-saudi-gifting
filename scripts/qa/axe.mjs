#!/usr/bin/env node
/** axe-core audit (WCAG 2.2 A/AA + best practices) at several scroll positions; writes qa/a11y/axe-<name>.json */
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'

const targets = (process.argv[2] ?? 'http://localhost:4173/en/,http://localhost:4173/ar/').split(',')
fs.mkdirSync('qa/a11y', { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
let worst = 0
for (const url of targets) {
  for (const vp of [{ width: 1440, height: 900, name: 'desktop' }, { width: 390, height: 844, name: 'mobile', mobile: true }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile })
    const page = await ctx.newPage()
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    const all = []
    for (const f of [0, 0.25, 0.5, 0.75, 0.98]) {
      await page.evaluate((y) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * y), f)
      await page.waitForTimeout(900)
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()
      for (const v of r.violations) if (!all.some((a) => a.id === v.id)) all.push(v)
    }
    const name = `${new URL(url).pathname.replace(/\//g, '') || 'root'}-${vp.name}`
    fs.writeFileSync(`qa/a11y/axe-${name}.json`, JSON.stringify(all, null, 2))
    const serious = all.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    worst = Math.max(worst, serious.length)
    console.log(`${name}: ${all.length} rule violations (${serious.length} serious/critical)`)
    for (const v of all) console.log(`   [${v.impact}] ${v.id} ×${v.nodes.length} — ${v.help}`, v.nodes[0]?.target?.join(' ') ?? '')
    await ctx.close()
  }
}
await browser.close()
process.exitCode = worst > 0 ? 1 : 0
