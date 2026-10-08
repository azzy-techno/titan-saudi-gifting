# Reference capture notes (study only)

URL: https://500d3913.vision7.pages.dev ("Vision 7", a football academy in Jubail, KSA). Captured 2026-10-08.
Scripts: `scripts/research/capture-reference.mjs` (shots + census), `a11y-reference.mjs` (keyboard/a11y/SEO), `probe-reference.mjs` (first DOM probe).
Browser: chromium-headless-shell + `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist`, giving ANGLE D3D11 on Intel UHD (integrated GPU).
The full Chromium build (`channel: 'chromium'`) could not start: "spawn UNKNOWN" / "Permission denied", which looks like Windows application control. I did not work around it.
Scrolling: `page.mouse.wheel` in 150 px steps. Each shot waits until scrollY has been stable for at least 450 ms, then 1.8 s more for the scene to settle.

## Page height and chapters
| | Desktop 1440×900 @1x | Mobile 390×844 @2x (Pixel UA, touch) |
|---|---|---|
| Total height | 11,196 px = 12.4 viewports (max scrollY 10,296) | 10,462 px = 12.4 viewports (max scrollY 9,618) |
| Chapters | 7 `<section>`s: monument 900, the-way 1440, indoor-hub 3818, values 1440, pathway 1440, network 900, contact 976 px, plus a footer of about 280 px | same 7: 844 / 1422 / 3287 / 1350 / 1350 / 972 / 954 px |
| Canvas | 1 × 1440×900 (DPR 1) | 585×1266 for 390×844 CSS, so DPR is capped at 1.5 |
| HUD / rail / cursor | all visible | HUD only (rail and custom cursor hidden) |

## Shot index
- `desktop-00` / `mobile-00`: preloader (line-drawn crest and a 000→100 counter).
- `desktop-01…16`: monument 0%, the-way 10%/90%, entering indoor hub, indoor-hub 10/50/90%, entering values, values 10/90%, entering pathway, pathway 10/90%, network, contact, page end.
- `desktop-17-reverse`: scrolled back up to the same position as `desktop-09` (reversibility check).
- `desktop-18-zone-open`: an indoor-hub zone card clicked (the "step inside" view).
- `desktop-19-menu`: chapters menu open.
- `desktop-20-focus`: Escape and 8×Tab pressed after opening the menu. The menu is still open, and focus has escaped into the form behind it, which scrolled the page to chapter 07.
- `mobile-01…16`: the same plan at mobile section offsets. `mobile-17-reverse`: compare with `mobile-09`.
- `_reduced-motion-desktop`: with `prefers-reduced-motion: reduce`, Lenis is off (native jump scroll) but the scroll-driven WebGL still runs.
- `_nojs-desktop`: with JS disabled the page is blank (0 headings, 0 text).
- `_probe-load-1…3`: preloader to hero, the first ~4 s.
- Data: `capture-report-desktop.json`, `capture-report-mobile.json`, `a11y-report.json`, `_probe-facts.json` (reference copy stripped).
