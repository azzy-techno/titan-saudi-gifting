// Study-only screenshot + inspection pass of the reference site (BRIEF §4, §12.1 Phase 1 step 1).
// Output goes to qa/reference/ only. Nothing from the reference site is copied into the product:
// no assets are saved (screenshots only), and copy text is not persisted (only lengths / counts).
//
// Usage (from project root):  node scripts/research/capture-reference.mjs [all|desktop|mobile]
//
// Notes
// - WebGL + Lenis site: we scroll with page.mouse.wheel in small steps, wait until scrollY is stable,
//   then wait SETTLE_MS more for the scene to settle before every shot.
// - Launch order: full Chromium + GPU flags -> headless shell + GPU flags -> default (SwiftShader).
// - A __THREE_DEVTOOLS__ EventTarget (three.js' official devtools hook) is registered before page
//   scripts run, so we can read renderer.info and count scene objects/materials read-only.
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const URL = 'https://500d3913.vision7.pages.dev';
const OUT = path.resolve('qa/reference');
const which = process.argv[2] ?? 'all';
const GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];
const SETTLE_MS = 1800; // >= 1.5 s after scroll has stopped
const INTRO_MS = 6000; // preloader + hero reveal

const PROFILES = {
  desktop: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    mouse: [1420, 610],
  },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: devices['Pixel 7'].userAgent,
    mouse: [370, 620],
  },
};

// ---------------------------------------------------------------- browser launch
async function launch() {
  const attempts = [
    { label: 'chromium (new headless) + GPU flags', opts: { headless: true, channel: 'chromium', args: GPU_ARGS } },
    { label: 'chromium-headless-shell + GPU flags', opts: { headless: true, args: GPU_ARGS } },
    { label: 'chromium-headless-shell default', opts: { headless: true } },
  ];
  const log = [];
  for (const a of attempts) {
    try {
      const browser = await chromium.launch(a.opts);
      const p = await browser.newPage();
      const renderer = await p.evaluate(() => {
        const g = document.createElement('canvas').getContext('webgl2');
        const e = g && g.getExtension('WEBGL_debug_renderer_info');
        return g ? g.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : g.RENDERER) : 'no webgl2';
      });
      await p.close();
      log.push(`${a.label}: OK — ${renderer}`);
      if (/SwiftShader/i.test(renderer) && a !== attempts[attempts.length - 1]) {
        log.push(`  (software renderer, trying next option)`);
        await browser.close();
        continue;
      }
      return { browser, renderer, launchLog: log, launchLabel: a.label };
    } catch (e) {
      log.push(`${a.label}: FAILED — ${String(e.message).split('\n')[0]}`);
    }
  }
  throw new Error('No browser could be launched:\n' + log.join('\n'));
}

// ---------------------------------------------------------------- in-page instrumentation
function initScript() {
  const hook = new EventTarget();
  const seen = { scenes: [], renderers: [] };
  hook.addEventListener('observe', (e) => {
    const o = e.detail;
    if (!o) return;
    if (o.isScene) seen.scenes.push(o);
    else if (o.isWebGLRenderer || (o.domElement && o.render && o.info)) seen.renderers.push(o);
  });
  window.__THREE_DEVTOOLS__ = hook;
  window.__probeThree = seen;
  window.__probe = { lcp: [], longtasks: 0, longtaskMs: 0, cls: 0 };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__probe.lcp.push({ t: Math.round(e.startTime), el: e.element ? e.element.tagName : null, size: e.size });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) { window.__probe.longtasks++; window.__probe.longtaskMs += e.duration; }
    }).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__probe.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  window.__ft = {
    on: false, t: [],
    start() { this.t = []; this.on = true; const loop = (ts) => { if (!this.on) return; this.t.push(ts); requestAnimationFrame(loop); }; requestAnimationFrame(loop); },
    stop() {
      this.on = false;
      const d = []; for (let i = 1; i < this.t.length; i++) d.push(this.t[i] - this.t[i - 1]);
      return d;
    },
  };
}

// renderer.info + scene census (counts only)
function threeCensus() {
  const P = window.__probeThree;
  if (!P) return null;
  const r = P.renderers[0];
  const info = r
    ? {
        calls: r.info.render.calls, triangles: r.info.render.triangles, points: r.info.render.points, lines: r.info.render.lines,
        geometries: r.info.memory.geometries, textures: r.info.memory.textures,
        programs: (r.info.programs || []).map((p) => p.name),
        pixelRatio: r.getPixelRatio(), toneMapping: r.toneMapping, exposure: r.toneMappingExposure,
        colorSpace: r.outputColorSpace, shadows: r.shadowMap?.enabled, canvas: [r.domElement.width, r.domElement.height],
      }
    : null;
  const scenes = P.scenes.map((s) => {
    const types = {}, mats = {}, lights = {}, texSizes = new Set();
    let pts = 0, tris = 0, inst = 0;
    s.traverse((o) => {
      types[o.type] = (types[o.type] || 0) + 1;
      if (o.isLight) lights[o.type] = (lights[o.type] || 0) + 1;
      if (o.material) for (const m of [].concat(o.material)) {
        const k = m.type + (m.name ? `:${m.name}` : '');
        mats[k] = (mats[k] || 0) + 1;
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'envMap', 'emissiveMap', 'alphaMap']) {
          const t = m[key]; if (t && t.image) texSizes.add(`${key}:${t.image.width}x${t.image.height}`);
        }
      }
      const g = o.geometry;
      if (g && g.attributes && g.attributes.position) {
        const n = o.isInstancedMesh ? o.count : 1;
        const verts = g.attributes.position.count;
        if (o.isPoints) pts += verts * n;
        else if (o.isMesh) tris += ((g.index ? g.index.count : verts) / 3) * n;
        if (o.isInstancedMesh) inst += o.count;
      }
    });
    return {
      children: s.children.length, types, mats, lights, pts, tris: Math.round(tris), instances: inst,
      fog: s.fog ? s.fog.type || 'fog' : null, environment: !!s.environment,
      background: s.background ? (s.background.isColor ? `#${s.background.getHexString()}` : s.background.constructor?.name) : null,
      textures: [...texSizes].slice(0, 20),
    };
  });
  return { info, scenes };
}

// DOM / a11y / type facts (no copy text persisted — lengths and counts only)
function domFacts() {
  const parseRGBA = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bg = { r: 7, g: 28, b: 46 }; // site base colour token (--bg)
  const effOpacity = (el) => { let o = 1; for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o; };
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const texts = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (own.length < 2) continue;
    const s = getComputedStyle(el); const c = parseRGBA(s.color); if (!c) continue;
    const a = c.a * effOpacity(el);
    const mix = { r: c.r * a + bg.r * (1 - a), g: c.g * a + bg.g * (1 - a), b: c.b * a + bg.b * (1 - a) };
    const ratio = (Math.max(lum(mix), lum(bg)) + 0.05) / (Math.min(lum(mix), lum(bg)) + 0.05);
    texts.push({ tag: el.tagName, cls: String(el.className).slice(0, 40), len: own.length, fs: s.fontSize, ff: s.fontFamily.split(',')[0], ratio: Math.round(ratio * 100) / 100 });
  }
  texts.sort((x, y) => x.ratio - y.ratio);
  const name = (el) => (el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.innerText) || el.innerText || el.getAttribute('title') || el.querySelector('img[alt]')?.alt || '').trim();
  const buttons = [...document.querySelectorAll('button, [role=button], a[href]')];
  const unnamed = buttons.filter((b) => !name(b)).map((b) => `${b.tagName}.${String(b.className).slice(0, 30)}`);
  const inputs = [...document.querySelectorAll('input, textarea, select')].filter((i) => i.type !== 'hidden').map((i) => ({ type: i.type || i.tagName, label: i.labels?.length || 0, ariaLabel: !!i.getAttribute('aria-label'), placeholder: !!i.placeholder, required: i.required, autocomplete: i.autocomplete || null }));
  const h = (sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { ff: s.fontFamily.split(',')[0], fs: s.fontSize, fw: s.fontWeight, ls: s.letterSpacing, lh: s.lineHeight }; };
  const hud = document.querySelector('.hud-frame');
  const rail = document.querySelector('.chapter-rail');
  const cursor = document.querySelector('.cursor');
  const canvas = document.querySelector('canvas');
  const cr = canvas?.getBoundingClientRect();
  return {
    scrollHeight: document.documentElement.scrollHeight, innerH: innerHeight, innerW: innerWidth,
    overflowX: document.documentElement.scrollWidth > innerWidth,
    htmlClass: document.documentElement.className,
    sections: [...document.querySelectorAll('section')].map((s) => { const r = s.getBoundingClientRect(); return { id: s.id || String(s.className), top: Math.round(r.top + scrollY), h: Math.round(r.height) }; }),
    canvas: canvas ? { px: [canvas.width, canvas.height], css: [Math.round(cr.width), Math.round(cr.height)], dprUsed: Math.round((canvas.width / cr.width) * 100) / 100 } : null,
    type: { h1: h('h1'), h2: h('h2'), h3: h('h3'), p: h('main p'), mono: h('.hud-frame') },
    hudVisible: hud ? visible(hud) : null, railVisible: rail ? visible(rail) : null, cursorVisible: cursor ? visible(cursor) && getComputedStyle(cursor).opacity !== '0' : null,
    a11y: {
      unnamedControls: unnamed.length, unnamedSamples: unnamed.slice(0, 12), inputs,
      skipLink: !!document.querySelector('a[href="#main"], a[href="#content"], .skip-link, [class*="skip"]'),
      canvasAriaHidden: canvas?.getAttribute('aria-hidden') ?? null, canvasParentAriaHidden: canvas?.closest('[aria-hidden="true"]') ? true : false,
      ariaLive: document.querySelectorAll('[aria-live]').length, h1Count: document.querySelectorAll('h1').length,
      emptyHeadings: [...document.querySelectorAll('h1,h2,h3,h4')].filter((x) => !x.innerText.trim()).length,
      lowestContrast: texts.slice(0, 12), textNodes: texts.length,
      belowAA: texts.filter((t) => t.ratio < 4.5 && parseFloat(t.fs) < 24).length,
    },
  };
}

// ---------------------------------------------------------------- scrolling helpers
async function settle(page, quietMs = 450, timeout = 7000) {
  const start = Date.now();
  let last = await page.evaluate(() => scrollY), since = Date.now();
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(100);
    const y = await page.evaluate(() => scrollY);
    if (Math.abs(y - last) > 0.5) { last = y; since = Date.now(); }
    else if (Date.now() - since > quietMs) break;
  }
  return last;
}

async function wheelTo(page, target, method, cdp, mouse) {
  const step = 150;
  for (let attempt = 0; attempt < 5; attempt++) {
    const y = await page.evaluate(() => scrollY);
    let remaining = target - y;
    if (Math.abs(remaining) < 20) break;
    if (method.kind === 'wheel') {
      while (Math.abs(remaining) >= 1) {
        const d = Math.sign(remaining) * Math.min(step, Math.abs(remaining));
        await page.mouse.wheel(0, d);
        remaining -= d;
        await page.waitForTimeout(28);
      }
    } else if (method.kind === 'touch') {
      await cdp.send('Input.synthesizeScrollGesture', { x: mouse[0] - 150, y: 420, xDistance: 0, yDistance: -remaining, speed: 1800, gestureSourceType: 'touch', preventFling: true });
    } else {
      await page.evaluate((t) => window.scrollTo(0, t), target);
    }
    await settle(page);
  }
  return page.evaluate(() => scrollY);
}

function plan(sections, vh, maxY) {
  const shots = [];
  sections.forEach((s, idx) => {
    if (idx > 0) shots.push({ label: `enter ${s.id}`, y: Math.max(0, Math.round(s.top - vh * 0.45)), transition: true });
    const range = Math.max(0, s.h - vh);
    const n = s.h <= vh * 1.15 ? 1 : Math.max(2, Math.ceil(s.h / (1.5 * vh)));
    const fr = n === 1 ? [range > 0 ? 0.5 : 0] : Array.from({ length: n }, (_, i) => 0.1 + (0.8 * i) / (n - 1));
    for (const f of fr) shots.push({ label: `${s.id} ${Math.round(f * 100)}%`, y: Math.min(maxY, Math.round(s.top + range * f)) });
  });
  shots.push({ label: 'page end', y: maxY });
  // keep only a few transition shots (between the biggest set-piece changes) to stay readable
  const keepT = new Set(['enter indoor-hub', 'enter values', 'enter pathway']);
  const filtered = shots.filter((s) => !s.transition || keepT.has(s.label));
  return filtered.filter((s, i, a) => i === 0 || Math.abs(s.y - a[i - 1].y) > vh * 0.25).sort((a, b) => a.y - b.y);
}

const stats = (d) => {
  if (!d.length) return null;
  const s = [...d].sort((a, b) => a - b);
  const q = (p) => Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 10) / 10;
  return { frames: s.length, medianMs: q(0.5), p95Ms: q(0.95), maxMs: Math.round(s[s.length - 1]), over50ms: s.filter((x) => x > 50).length };
};

// ---------------------------------------------------------------- one profile pass
async function runProfile(browser, key) {
  const prof = PROFILES[key];
  const { mouse, ...ctxOpts } = prof;
  const context = await browser.newContext(ctxOpts);
  await context.addInitScript(initScript);
  const page = await context.newPage();
  const consoleMsgs = []; const net = { requests: 0, bytes: 0, byType: {}, largest: [], audio: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${String(e).slice(0, 160)}`));
  page.on('requestfinished', async (req) => {
    try {
      const sz = await req.sizes(); const b = sz.responseBodySize + sz.responseHeadersSize; const t = req.resourceType();
      net.requests++; net.bytes += b; net.byType[t] = (net.byType[t] || 0) + b;
      net.largest.push({ kb: Math.round(b / 1024), t, u: req.url().split('?')[0].slice(-70) });
      if (/\.(mp3|ogg|wav|m4a|aac|webm)$/i.test(req.url().split('?')[0])) net.audio.push(req.url().split('?')[0].slice(-60));
    } catch {}
  });

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'load', timeout: 90_000 });
  const loadWallMs = Date.now() - t0;
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, `${key}-00.png`) }); // preloader frame
  await page.mouse.move(mouse[0], mouse[1]);
  await page.waitForTimeout(INTRO_MS);

  const loadFacts = await page.evaluate(() => ({ probe: window.__probe, nav: (() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) } : null; })(), paints: performance.getEntriesByType('paint').map((p) => `${p.name}:${Math.round(p.startTime)}`) }));
  const dom0 = await page.evaluate(domFacts);
  const maxY = dom0.scrollHeight - dom0.innerH;

  // pick a scroll method that actually moves the page
  let method = { kind: 'wheel' };
  const cdp = await context.newCDPSession(page);
  await page.mouse.wheel(0, 300); await settle(page);
  let moved = await page.evaluate(() => scrollY);
  if (moved < 50) {
    method = { kind: 'touch' };
    await cdp.send('Input.synthesizeScrollGesture', { x: 200, y: 420, xDistance: 0, yDistance: -300, speed: 1800, gestureSourceType: 'touch', preventFling: true });
    await settle(page); moved = await page.evaluate(() => scrollY);
    if (moved < 50) method = { kind: 'scrollTo' };
  }
  await wheelTo(page, 0, method, cdp, mouse); await page.waitForTimeout(SETTLE_MS);

  const shots = plan(dom0.sections, dom0.innerH, maxY);
  const results = []; const allFrames = [];
  let n = 1;
  for (const s of shots) {
    await page.evaluate(() => window.__ft.start());
    const actual = await wheelTo(page, s.y, method, cdp, mouse);
    const frames = await page.evaluate(() => window.__ft.stop());
    allFrames.push(...frames);
    await page.waitForTimeout(SETTLE_MS);
    const file = `${key}-${String(n).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    const census = await page.evaluate(threeCensus);
    const chapter = await page.evaluate(() => (document.querySelector('.hud-frame')?.innerText.match(/\d{2}\s*\/\s*\d{2}|\b0\d\b/) || [null])[0]);
    results.push({ file, label: s.label, targetY: s.y, actualY: Math.round(actual), progress: Math.round((actual / maxY) * 1000) / 10, hudChapter: chapter, gl: census?.info ? { calls: census.info.calls, tris: census.info.triangles, points: census.info.points, lines: census.info.lines } : null, scrollFrames: stats(frames) });
    console.log(`${file}  ${s.label.padEnd(22)} y=${Math.round(actual)} (${results.at(-1).progress}%)  hud=${chapter}`);
    n++;
  }

  const extra = {};
  // reversibility: wheel back up to the middle shot and compare with the forward shot
  const mid = results[Math.floor(results.length / 2)];
  const back = await wheelTo(page, mid.actualY, method, cdp, mouse); await page.waitForTimeout(SETTLE_MS);
  const revFile = `${key}-${String(n).padStart(2, '0')}-reverse.png`;
  await page.screenshot({ path: path.join(OUT, revFile) });
  extra.reverse = { file: revFile, comparesWith: mid.file, y: Math.round(back) }; n++;

  if (key === 'desktop') {
    // interactive zone in the "indoor hub" chapter: click the first zone card (in-page UI only, no forms)
    const hub = dom0.sections.find((s) => /hub/i.test(s.id));
    if (hub) {
      await wheelTo(page, Math.round(hub.top + (hub.h - dom0.innerH) * 0.3), method, cdp, mouse); await page.waitForTimeout(SETTLE_MS);
      const card = page.locator('button.zone-card').first();
      if (await card.count()) {
        try {
          await card.click({ timeout: 4000 }); await page.waitForTimeout(SETTLE_MS + 400);
          const f = `${key}-${String(n).padStart(2, '0')}-zone-open.png`; await page.screenshot({ path: path.join(OUT, f) }); n++;
          extra.zone = { file: f, focusAfterOpen: await page.evaluate(() => `${document.activeElement?.tagName}.${String(document.activeElement?.className).slice(0, 30)}`), dialogs: await page.evaluate(() => document.querySelectorAll('[role=dialog],dialog[open]').length) };
          await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
          extra.zone.escapeCloses = await page.evaluate(() => document.querySelectorAll('[role=dialog],dialog[open]').length === 0);
        } catch (e) { extra.zone = { error: String(e.message).split('\n')[0] }; }
      }
    }
    // chapters menu overlay
    try {
      await page.getByRole('button', { name: /chapters/i }).first().click({ timeout: 4000 }); await page.waitForTimeout(1400);
      const f = `${key}-${String(n).padStart(2, '0')}-menu.png`; await page.screenshot({ path: path.join(OUT, f) }); n++;
      extra.menu = { file: f, ariaExpanded: await page.getByRole('button', { name: /chapters/i }).first().getAttribute('aria-expanded') };
      await page.keyboard.press('Escape'); await page.waitForTimeout(900);
      extra.menu.escapeCloses = await page.evaluate(() => { const m = document.querySelector('.menu-overlay'); return m ? getComputedStyle(m).visibility === 'hidden' || getComputedStyle(m).opacity === '0' || getComputedStyle(m).pointerEvents === 'none' : null; });
    } catch (e) { extra.menu = { error: String(e.message).split('\n')[0] }; }
    // keyboard: Home / PageDown / Tab focus visibility
    await page.keyboard.press('Home'); await settle(page); extra.homeKeyY = await page.evaluate(() => Math.round(scrollY));
    await page.keyboard.press('PageDown'); await settle(page); extra.pageDownY = await page.evaluate(() => Math.round(scrollY));
    await page.keyboard.press('Home'); await settle(page); await page.waitForTimeout(600);
    extra.tabOrder = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab'); await page.waitForTimeout(150);
      extra.tabOrder.push(await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return `${a.tagName}.${String(a.className).slice(0, 24)} outline=${s.outlineStyle}/${s.outlineWidth} shadow=${s.boxShadow !== 'none'}`; }));
    }
    const f = `${key}-${String(n).padStart(2, '0')}-focus.png`; await page.screenshot({ path: path.join(OUT, f) }); n++;
    extra.focusShot = f;
    // sound toggle: does it fetch audio files or synthesise?
    try {
      await page.getByRole('button', { name: /sound/i }).first().click({ timeout: 3000 }); await page.waitForTimeout(1500);
      extra.soundAfterClick = { audioRequests: [...net.audio], audioContext: await page.evaluate(() => typeof AudioContext !== 'undefined') };
      await page.getByRole('button', { name: /sound/i }).first().click({ timeout: 3000 });
    } catch (e) { extra.soundAfterClick = { error: String(e.message).split('\n')[0] }; }
  }

  const census = await page.evaluate(threeCensus);
  const domEnd = await page.evaluate(domFacts);
  net.largest = net.largest.sort((a, b) => b.kb - a.kb).slice(0, 12);
  net.kb = Math.round(net.bytes / 1024);
  for (const k of Object.keys(net.byType)) net.byType[k] = Math.round(net.byType[k] / 1024);
  delete net.bytes;
  await context.close();
  return { profile: key, viewport: prof.viewport, dpr: prof.deviceScaleFactor, loadWallMs, loadFacts, scrollMethod: method.kind, maxY, dom: dom0, domEnd: { a11y: domEnd.a11y.unnamedControls, hudVisible: domEnd.hudVisible }, shots: results, scrollFrameStats: stats(allFrames), extra, census, net, console: [...new Set(consoleMsgs)].slice(0, 20) };
}

async function reducedMotionCheck(browser) {
  const { mouse: _m, ...desktopCtx } = PROFILES.desktop;
  const context = await browser.newContext({ ...desktopCtx, reducedMotion: 'reduce' });
  await context.addInitScript(initScript);
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'load', timeout: 90_000 });
  await page.waitForTimeout(INTRO_MS);
  await page.mouse.move(1420, 610);
  const before = await page.evaluate(() => ({ htmlClass: document.documentElement.className, canvases: document.querySelectorAll('canvas').length }));
  await page.evaluate(() => window.__ft.start());
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 150); await page.waitForTimeout(28); }
  // sample scrollY shortly after the wheel burst: smooth scroll keeps easing, native scroll jumps
  const ys = []; for (let i = 0; i < 8; i++) { ys.push(await page.evaluate(() => Math.round(scrollY))); await page.waitForTimeout(80); }
  await page.evaluate(() => window.__ft.stop());
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: path.join(OUT, '_reduced-motion-desktop.png') });
  const out = { ...before, scrollYSamplesAfterWheel: ys, stillEasing: ys[ys.length - 1] !== ys[0] };
  await context.close();
  return out;
}

// ---------------------------------------------------------------- main
await fs.mkdir(OUT, { recursive: true });
const { browser, renderer, launchLog, launchLabel } = await launch();
console.log(launchLog.join('\n'));
const report = { url: URL, date: new Date().toISOString(), launch: launchLabel, renderer, launchLog, settleMs: SETTLE_MS, runs: [] };
for (const key of which === 'all' ? ['desktop', 'mobile'] : [which]) report.runs.push(await runProfile(browser, key));
if (which === 'all' || which === 'desktop') report.reducedMotion = await reducedMotionCheck(browser);
await browser.close();
await fs.writeFile(path.join(OUT, `capture-report${which === 'all' ? '' : '-' + which}.json`), JSON.stringify(report, null, 2));

// short human note: page height / chapters / shot list
const lines = [`# Reference capture notes`, ``, `- URL: ${URL} (study only)`, `- Captured: ${report.date} with ${launchLabel} — WebGL renderer: ${renderer}`, `- Settle: scroll stable ≥ 450 ms, then ${SETTLE_MS} ms before each shot`, ``];
for (const r of report.runs) {
  lines.push(`## ${r.profile} ${r.viewport.width}×${r.viewport.height} @${r.dpr}x (scroll via ${r.scrollMethod})`);
  lines.push(`- Total page height: ${r.dom.scrollHeight}px = ${(r.dom.scrollHeight / r.dom.innerH).toFixed(1)} viewports; max scrollY ${r.maxY}px`);
  lines.push(`- Chapters detected: ${r.dom.sections.length} (${r.dom.sections.map((s) => `${s.id} ${s.h}px`).join(', ')})`);
  lines.push(`- Canvas: ${JSON.stringify(r.dom.canvas)}; HUD visible: ${r.dom.hudVisible}; chapter rail visible: ${r.dom.railVisible}`);
  lines.push(`- Shots:`);
  for (const s of r.shots) lines.push(`  - ${s.file} — ${s.label}, scrollY ${s.actualY} (${s.progress}%), HUD ${s.hudChapter ?? '–'}`);
  if (r.extra.reverse) lines.push(`  - ${r.extra.reverse.file} — scrolled back up (compare with ${r.extra.reverse.comparesWith})`);
  for (const k of ['zone', 'menu']) if (r.extra[k]?.file) lines.push(`  - ${r.extra[k].file} — ${k === 'zone' ? 'interactive zone card opened' : 'chapters menu open'}`);
  if (r.extra.focusShot) lines.push(`  - ${r.extra.focusShot} — after menu open + Escape, Home/PageDown and 8× Tab (shows whether Escape closed the menu and where focus went)`);
  lines.push(``);
}
await fs.writeFile(path.join(OUT, `capture-notes${which === 'all' ? '' : '-' + which}.md`), lines.join('\n'));
console.log('done');
