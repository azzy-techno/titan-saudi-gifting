// Read-only probe of the reference site (study only — nothing is copied into the project).
// Collects DOM / runtime facts used to plan the screenshot pass and to write REFERENCE_NOTES.md.
// Usage (from project root):  node scripts/research/probe-reference.mjs [gpu|default]
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const URL = 'https://500d3913.vision7.pages.dev';
const OUT = path.resolve('qa/reference');
const mode = process.argv[2] ?? 'gpu';
const GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];

const browser = await chromium.launch({
  headless: true,
  channel: mode === 'gpu' ? 'chromium' : undefined, // 'gpu' = new headless (full Chromium); 'shellgpu' = headless shell + GPU flags
  args: mode === 'gpu' || mode === 'shellgpu' ? GPU_ARGS : [],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();

const consoleMsgs = [];
page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text()}`.slice(0, 300)));
page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${String(e).slice(0, 300)}`));
const failed = [];
page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText} ${r.url()}`));

// Capture LCP / long tasks as early as possible.
await page.addInitScript(() => {
  window.__probe = { lcp: [], longtasks: 0, longtaskMs: 0 };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        window.__probe.lcp.push({ t: Math.round(e.startTime), el: e.element ? e.element.tagName + '.' + (e.element.className || '') : null, size: e.size });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) { window.__probe.longtasks++; window.__probe.longtaskMs += e.duration; }
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
});

const t0 = Date.now();
await page.goto(URL, { waitUntil: 'load', timeout: 90_000 });
const loadMs = Date.now() - t0;

// Early frames of the loading sequence.
for (const [i, ms] of [[1, 300], [2, 1200], [3, 2500]]) {
  await page.waitForTimeout(ms);
  await page.screenshot({ path: path.join(OUT, `_probe-load-${i}.png`) });
}
await page.waitForTimeout(4000);

const facts = await page.evaluate(() => {
  const gl = (() => {
    try {
      const c = document.createElement('canvas');
      const g = c.getContext('webgl2') || c.getContext('webgl');
      const ext = g && g.getExtension('WEBGL_debug_renderer_info');
      return g ? { version: g.getParameter(g.VERSION), renderer: ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER) } : null;
    } catch (e) { return String(e); }
  })();
  const cs = (el) => { const s = getComputedStyle(el); return { ff: s.fontFamily, fs: s.fontSize, fw: s.fontWeight, ls: s.letterSpacing, lh: s.lineHeight, tt: s.textTransform, color: s.color }; };
  const canvases = [...document.querySelectorAll('canvas')].map((c) => {
    const s = getComputedStyle(c);
    const r = c.getBoundingClientRect();
    return { w: c.width, h: c.height, cssW: Math.round(r.width), cssH: Math.round(r.height), position: s.position, z: s.zIndex, pe: s.pointerEvents, ariaHidden: c.getAttribute('aria-hidden'), parent: c.parentElement?.tagName + '.' + (c.parentElement?.className || ''), dataEngine: c.getAttribute('data-engine') };
  });
  const fixed = [...document.querySelectorAll('body *')].filter((el) => { const p = getComputedStyle(el).position; return p === 'fixed' || p === 'sticky'; }).slice(0, 40)
    .map((el) => ({ tag: el.tagName, cls: String(el.className).slice(0, 80), id: el.id, pos: getComputedStyle(el).position, text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 80) }));
  const headings = [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => ({ tag: h.tagName, text: h.innerText.replace(/\s+/g, ' ').slice(0, 90), style: cs(h) }));
  const sections = [...document.querySelectorAll('section, [data-chapter], [data-section], [class*="chapter"], [id*="chapter"]')].slice(0, 40).map((s) => {
    const r = s.getBoundingClientRect();
    return { tag: s.tagName, id: s.id, cls: String(s.className).slice(0, 80), data: Object.assign({}, s.dataset), top: Math.round(r.top + scrollY), h: Math.round(r.height) };
  });
  const fonts = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.style} ${f.status}`);
  const scripts = [...document.scripts].map((s) => s.src || `inline(${s.textContent.length})`);
  const styles = [...document.querySelectorAll('link[rel=stylesheet], style')].map((l) => l.href || `inline(${l.textContent.length})`);
  const res = performance.getEntriesByType('resource').map((r) => ({ n: r.name.split('?')[0].slice(-90), t: r.initiatorType, kb: Math.round((r.transferSize || 0) / 1024), dkb: Math.round((r.decodedBodySize || 0) / 1024), dur: Math.round(r.duration) }));
  const nav = performance.getEntriesByType('navigation')[0];
  const paints = performance.getEntriesByType('paint').map((p) => `${p.name}:${Math.round(p.startTime)}`);
  const imgs = [...document.images].map((i) => ({ src: i.src.slice(-60), alt: i.getAttribute('alt') }));
  const interactive = [...document.querySelectorAll('a,button,[role=button],input,select,textarea,[tabindex]')].slice(0, 60).map((el) => ({ tag: el.tagName, role: el.getAttribute('role'), name: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || '').replace(/\s+/g, ' ').slice(0, 50), href: el.getAttribute('href'), tabindex: el.getAttribute('tabindex') }));
  const cssText = (() => { let out = ''; for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) out += r.cssText + '\n'; } catch {} } return out; })();
  return {
    title: document.title,
    lang: document.documentElement.lang, dir: document.documentElement.dir,
    htmlClass: document.documentElement.className, bodyClass: document.body.className,
    metas: [...document.querySelectorAll('meta')].map((m) => `${m.name || m.getAttribute('property') || m.httpEquiv || m.getAttribute('charset')}=${(m.content || '').slice(0, 100)}`),
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    scroll: { scrollHeight: document.documentElement.scrollHeight, bodyHeight: document.body.scrollHeight, scrollY },
    gl, canvases, fixed, headings, sections, fonts, scripts, styles,
    globals: { three: window.__THREE__ ?? null, gsap: !!window.gsap, ScrollTrigger: !!window.ScrollTrigger, lenis: !!(window.lenis || window.Lenis), barba: !!window.barba },
    landmarks: { main: document.querySelectorAll('main').length, nav: document.querySelectorAll('nav').length, header: document.querySelectorAll('header').length, footer: document.querySelectorAll('footer').length, skip: !!document.querySelector('a[href^="#"][class*="skip"], a.skip-link'), ariaLive: document.querySelectorAll('[aria-live]').length, ariaHiddenCount: document.querySelectorAll('[aria-hidden=true]').length },
    imgs, interactive,
    cssHints: {
      reducedMotion: /prefers-reduced-motion/.test(cssText), focusVisible: /:focus-visible/.test(cssText), hoverNone: /hover:\s*none/.test(cssText),
      mediaQueries: [...new Set((cssText.match(/@media[^{]+/g) || []).map((s) => s.trim()))].slice(0, 30),
      fontFaces: (cssText.match(/@font-face\s*{[^}]+}/g) || []).map((s) => s.replace(/src:[^;]+;/, 'src:…;').slice(0, 200)).slice(0, 20),
      cssVars: [...new Set((cssText.match(/--[a-z0-9-]+:\s*[^;]+/gi) || []))].slice(0, 80),
      easing: [...new Set(cssText.match(/cubic-bezier\([^)]+\)/g) || [])],
    },
    nav: nav ? { dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), transferKB: Math.round(nav.transferSize / 1024) } : null,
    paints, res, probe: window.__probe,
    bodyTextSample: document.body.innerText.replace(/\s+/g, ' ').slice(0, 3000),
  };
});

facts.loadMsWall = loadMs;
facts.console = consoleMsgs.slice(0, 60);
facts.failed = failed;
await fs.writeFile(path.join(OUT, `_probe-facts-${mode}.json`), JSON.stringify(facts, null, 2));
console.log(JSON.stringify({ gl: facts.gl, scroll: facts.scroll, canvases: facts.canvases, globals: facts.globals, fonts: facts.fonts.slice(0, 20), loadMs }, null, 2));
await browser.close();
