// Read-only accessibility / keyboard / SEO spot-check of the reference site (study only).
// Writes qa/reference/a11y-report.json (+ two screenshots). No site copy is persisted (lengths/classes only).
// Usage (from project root): node scripts/research/a11y-reference.mjs
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const URL = 'https://500d3913.vision7.pages.dev';
const OUT = path.resolve('qa/reference');
const GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];

let browser;
try { browser = await chromium.launch({ headless: true, args: GPU_ARGS }); }
catch { browser = await chromium.launch({ headless: true }); }

const report = {};
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'load', timeout: 90_000 });
await page.waitForTimeout(6000);
await page.mouse.move(1420, 610);

// --- SEO / head
report.head = await page.evaluate(() => ({
  lang: document.documentElement.lang,
  description: !!document.querySelector('meta[name=description]'),
  og: document.querySelectorAll('meta[property^="og:"]').length,
  twitter: document.querySelectorAll('meta[name^="twitter:"]').length,
  canonical: !!document.querySelector('link[rel=canonical]'),
  hreflang: document.querySelectorAll('link[rel=alternate][hreflang]').length,
  jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
  icons: document.querySelectorAll('link[rel*=icon]').length,
  preloads: [...document.querySelectorAll('link[rel=preload], link[rel=modulepreload], link[rel=preconnect]')].map((l) => `${l.rel}:${(l.as || '')}`),
}));

// --- keyboard scrolling from the top (focus on body)
const y = () => page.evaluate(() => Math.round(scrollY));
const settle = async () => { let last = -1; for (let i = 0; i < 40; i++) { await page.waitForTimeout(120); const v = await y(); if (v === last) break; last = v; } return last; };
report.keys = {};
for (const k of ['PageDown', 'Space', 'ArrowDown', 'End', 'Home']) {
  await page.keyboard.press(k);
  report.keys[k] = await settle();
}

// --- tab order from the top
report.tab = [];
await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
await settle();
for (let i = 0; i < 30; i++) {
  await page.keyboard.press('Tab');
  await page.waitForTimeout(160);
  report.tab.push(await page.evaluate(() => {
    const a = document.activeElement; if (!a || a === document.body) return 'BODY';
    const s = getComputedStyle(a); const r = a.getBoundingClientRect();
    const nm = (a.getAttribute('aria-label') || a.innerText || a.getAttribute('title') || '').trim();
    return { el: `${a.tagName}.${String(a.className).slice(0, 26)}`, nameLen: nm.length, inView: r.bottom > 0 && r.top < innerHeight && r.width > 0, ring: s.outlineStyle !== 'none' || s.boxShadow !== 'none', scrollY: Math.round(scrollY) };
  }));
}

// --- controls without accessible names & what the unnamed buttons are
report.controls = await page.evaluate(() => {
  const nm = (el) => (el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) || el.textContent || el.getAttribute('title') || '').trim();
  const all = [...document.querySelectorAll('button, a[href], [role=button]')];
  return {
    total: all.length,
    unnamed: all.filter((b) => !nm(b)).map((b) => ({ el: `${b.tagName}.${String(b.className).slice(0, 30)}`, tabIndex: b.tabIndex, hiddenAncestor: !!b.closest('[aria-hidden=true],[inert]') })),
    zoneCards: [...document.querySelectorAll('.zone-card')].map((b) => ({ tabIndex: b.tabIndex, nameLen: nm(b).length, ariaPressed: b.getAttribute('aria-pressed'), vis: getComputedStyle(b).visibility })),
    menuToggle: (() => { const b = [...document.querySelectorAll('button')].find((x) => /chapters/i.test(x.textContent)); return b ? { ariaExpanded: b.getAttribute('aria-expanded'), ariaControls: b.getAttribute('aria-controls'), ariaHaspopup: b.getAttribute('aria-haspopup') } : null; })(),
    soundToggle: (() => { const b = [...document.querySelectorAll('button')].find((x) => /sound/i.test(x.getAttribute('aria-label') || x.textContent)); return b ? { ariaPressed: b.getAttribute('aria-pressed'), label: (b.getAttribute('aria-label') || '').length } : null; })(),
  };
});

// --- chapters menu: focus management, Escape, trap
await page.evaluate(() => window.scrollTo(0, 0)); await settle();
const toggle = page.locator('button', { hasText: /chapters/i }).first();
report.menu = {};
try {
  await toggle.click({ timeout: 4000 }); await page.waitForTimeout(1200);
  report.menu.focusAfterOpen = await page.evaluate(() => `${document.activeElement?.tagName}.${String(document.activeElement?.className).slice(0, 26)}`);
  report.menu.dialogRole = await page.evaluate(() => { const m = document.querySelector('.menu-overlay'); return m ? { role: m.getAttribute('role'), ariaModal: m.getAttribute('aria-modal'), ariaHidden: m.getAttribute('aria-hidden') } : null; });
  const inside = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(120); inside.push(await page.evaluate(() => !!document.activeElement?.closest('.menu-overlay'))); }
  report.menu.tabStaysInside = inside;
  await page.keyboard.press('Escape'); await page.waitForTimeout(900);
  report.menu.openAfterEscape = await page.evaluate(() => { const m = document.querySelector('.menu-overlay'); if (!m) return null; const s = getComputedStyle(m); return !(s.visibility === 'hidden' || s.opacity === '0' || s.pointerEvents === 'none' || s.display === 'none'); });
} catch (e) { report.menu.error = String(e.message).split('\n')[0]; }
await ctx.close();

// --- contrast of visible text at several scroll positions (approximation against the base colour)
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto(URL, { waitUntil: 'load', timeout: 90_000 });
await p2.waitForTimeout(6000); await p2.mouse.move(1420, 610);
report.contrast = [];
for (const target of [0, 954, 3799, 9976]) {
  let cur = await p2.evaluate(() => scrollY);
  while (Math.abs(target - cur) > 20) { const d = Math.sign(target - cur) * Math.min(150, Math.abs(target - cur)); await p2.mouse.wheel(0, d); cur += d; await p2.waitForTimeout(28); }
  await p2.waitForTimeout(2500);
  report.contrast.push({ y: target, ...(await p2.evaluate(() => {
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
    const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const bg = { r: 7, g: 28, b: 46 };
    const op = (el) => { let o = 1; for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o; };
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || r.width === 0) continue;
      const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none') continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('').trim(); if (own.length < 2) continue;
      const c = parse(s.color); if (!c) continue; const a = c.a * op(el); if (a < 0.1) continue;
      const mix = { r: c.r * a + bg.r * (1 - a), g: c.g * a + bg.g * (1 - a), b: c.b * a + bg.b * (1 - a) };
      const L1 = lum(mix), L2 = lum(bg);
      out.push({ cls: `${el.tagName}.${String(el.className).slice(0, 24)}`, fs: s.fontSize, ff: s.fontFamily.split(',')[0].replace(/"/g, ''), alpha: Math.round(a * 100) / 100, ratio: Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100 });
    }
    out.sort((a, b) => a.ratio - b.ratio);
    return { visibleText: out.length, belowAA_small: out.filter((t) => t.ratio < 4.5 && parseFloat(t.fs) < 24).length, worst: out.slice(0, 6) };
  })) });
}
await ctx2.close();

// --- no-JS render: is the copy in the static HTML (indexable)?
const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
const p3 = await ctx3.newPage();
await p3.goto(URL, { waitUntil: 'load', timeout: 90_000 });
await p3.waitForTimeout(1500);
report.noJs = await p3.evaluate(() => ({ h1: document.querySelectorAll('h1').length, h2: document.querySelectorAll('h2').length, textLen: document.body.innerText.length, noscript: document.querySelectorAll('noscript').length }));
await p3.screenshot({ path: path.join(OUT, '_nojs-desktop.png') });
await ctx3.close();

await browser.close();
await fs.writeFile(path.join(OUT, 'a11y-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));
