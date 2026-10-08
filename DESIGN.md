# DESIGN — Titan Saudi Corporate Gifting

> Creative direction, systems and storyboard. Source of truth for the look and the motion.
> Code mirrors: `src/styles/tokens.css`, `src/lib/motion.ts`, `src/three/choreography.ts`, `config/cameras.json`.

## 1. Concept — "Anatomy of a Gift"

The site takes one Titan watch apart to show the care inside, then puts it back together with the client's name engraved on the back.
**Assemble → Reveal → Personalise → Give.** Every chapter moves the same watch along one continuous camera path; nothing is a cut.

Refinements (decided during the build):
- **The watch tells the real time in Riyadh** from the first frame. The poster shows 10:10; when loading finishes the hands *snap* to the live time. That moment is the "ready" signal, so there's no separate "loaded" message.
- **Time slows as you look closer.** In the movement chapter the gear train runs at its true ratios. Real speed is 8 beats/s; as the camera dives in, playback eases down to about 1/7 so the escapement can be *read*. The ratios stay true and only the playback rate changes. The optional escapement sound slows with it.
- **The caseback is the hero surface.** The illustrative watch has a solid caseback with a large medallion (Ø 26 mm), because engraving is the product. The movement is revealed by taking the watch apart, not through a display window.
- **The watch is honest about being illustrative.** It is an original design labelled "illustrative watch" in the anatomy chapter, so no Titan model is misrepresented. The GLB can be swapped for official CAD (README).
- The process for clients (Brief → Curate → Personalise → Deliver) is drawn as **a dial with four quadrants**, keeping the watch metaphor in the business content.

## 2. Palette — "Midnight atelier"

| Token | Hex | Role |
|---|---|---|
| `--ink-0` | `#0B0A09` | Base (warm near-black), WebGL clear colour |
| `--ink-1` | `#121110` | Graphite layer 1 — panels, inputs |
| `--ink-2` | `#1A1917` | Graphite layer 2 — hover, prefixes |
| `--ink-3` | `#26241F` | Graphite layer 3 — strong rules |
| `--bone` | `#ECE7DF` | Primary text |
| `--bone-2` | `#BDB6AB` | Secondary text (`#CDC6BB` for Arabic — Plex Arabic renders lighter) |
| `--bone-3` | `#8F887D` | Tertiary text, mono labels |
| `--accent` | `#C4A46F` | **The one accent** — atelier brass/champagne. It matches the gilt gear train and the seconds hand |
| `--error` | `#E0A08C` | Form errors (warm, not alarm-red) |
| `--hairline` | bone @ 12% → `#262523` | 1 px rules (decorative) |
| `--ui-border` | `#706A62` | Borders of form fields and controls (≥ 3:1, WCAG 1.4.11) |

**WCAG 2.2 contrast** (computed in `src/lib/contrast.ts`, also shown live at `/lab`):

| Text / UI | Background | Ratio | Level |
|---|---|---|---|
| bone | ink-0 | 16.07 | AAA |
| bone-2 | ink-0 | 9.84 | AAA |
| bone-2-ar | ink-0 | 11.67 | AAA |
| bone-3 (11–12 px mono labels) | ink-0 | 5.64 | AA |
| accent | ink-0 | 8.37 | AAA |
| ink-0 on accent (buttons) | accent | 8.37 | AAA |
| bone / bone-2 / bone-3 | ink-1 | 15.32 / 9.38 / 5.38 | AAA / AAA / AA |
| bone-3 | ink-2 | 5.01 | AA |
| error | ink-0 / ink-1 | 9.02 / 8.60 | AAA |
| ui-border (control edges) | ink-0 / ink-1 / ink-2 | 3.70 / 3.53 / 3.29 | ≥ 3:1 (non-text) |

Hairlines (1.29:1) are decorative separators only and never the only way to identify a control.
No gradients, glows or glass. The single accent is spent on the seconds hand, active states, the process arcs and primary buttons.

## 3. Typography

**Chosen: Pairing C "Gazette", refined.** The QC1 type critic (an independent subagent) ranked the three pairings at `/lab/type`: C 37/50, B 29/50, A 28/50. Evidence: `qa/qc1/type/`.

| Role | Face | Licence | Notes |
|---|---|---|---|
| Display | **Boska** (Fontshare) | ITF FFL v2.0 — commercial web use and self-hosting allowed; **no subsetting or conversion** (§02) → shipped as distributed (variable WOFF2, 47 KB) | Weight **300 only at ≥ 64 px**, 400 below; italic 450. Its hairlines read like dial printing |
| Text | **General Sans** (Fontshare) | ITF FFL v2.0, unmodified | Replaced Geist (the critic flagged it as the Next.js default) |
| Mono / HUD | **IBM Plex Mono** 400/500 | OFL | Specs, labels, live digits — `tabular-nums` |
| Arabic display | **Alexandria** (variable) | OFL | Weight 230, size × 0.92, line-height 1.25 |
| Arabic text | **IBM Plex Sans Arabic** 400/500 | OFL | Size × 1.12, line-height 1.8. Shares the Plex "engineering voice" with the mono |
| Arabic digits | **Alexandria** via `unicode-range` U+0660–0669 | OFL | IBM Plex Sans Arabic draws **٠ as a dash** at HUD sizes (verified, `qa/qc1/type/arabic-digits.png`); Alexandria's ٠ is a dot |
| Engraving (canvas) | **IBM Plex Sans** 500 / **IBM Plex Sans Arabic** 500 | OFL | FFL §02 forbids offering Fontshare fonts for visitor-generated content, so engraving uses OFL faces only |

Why C won: it has the only hero with real "watch dial" contrast, without the 2024–26 Instrument-Serif AI-page cliché (A). Alexandria Light matches Boska's light colour and open width. Plex Mono and Plex Sans Arabic share one superfamily, so HUD, specs and Arabic text read as one spec sheet.

Scale: fluid `clamp()` — mega 13.2vw (hero, footer), d1 8.4vw, d2 5.4vw, d3 3.4vw; body ≈ 16–18 px at line-height 1.6; mono labels 11–12 px, uppercase, +0.12em. Display tracking −0.03em. **Arabic: no letter-spacing, no uppercase** (enforced globally with `:lang(ar)`). `text-wrap: balance` on headings and `pretty` on paragraphs, so no single-word last lines.
Self-hosted via `next/font/local` (Latin, preloaded, metric-matched fallbacks for CLS) and plain `@font-face` for Arabic (preloaded on `/ar` only). `font-display: swap` everywhere.

## 4. Grid and layout

- 12 columns (6 under 768 px), gutter `clamp(12px, 1.5vw, 28px)`, margins `clamp(20px, 4.2vw, 72px)`, max 1680 px. Dev overlay: press **g** (dev builds) or add `?grid`.
- Compositions are asymmetric and editorial. The hero headline is anchored at the bottom-start like a magazine cover, with the watch on the opposite side (the camera lens-shift mirrors in RTL). Anatomy text sits top-start, with the stage list as a narrow procedure column at the far end. Movement copy sits at the end with the specs table bottom-start. The gifting content column runs down the start side while the watch holds the end side.
- Hairline rules (1 px, 12%) structure lists, tables and HUD frames. Panels are solid graphite (no blur).
- All spacing uses CSS logical properties, so RTL mirrors for free. The horizontal collection strip reverses direction in Arabic.
- Mobile is designed separately: the watch occupies the top band, headlines drop to 10–17vw, the stage list and HUD coordinates hide, and the configurator starts below the watch.

## 5. Motion language (tokens: `tokens.css`, `motion.ts`)

| Token | Value | Use |
|---|---|---|
| Reveal ease | `cubic-bezier(0.16, 1, 0.3, 1)` (GSAP CustomEase "reveal") | Headlines, panels |
| Camera ease | `power3.inOut` | Every camera segment, scrubbed to scroll |
| Mechanical | `steps()` / 8 beats per second | Seconds hand, nav-dial hand (1° steps), counters, scroll cue |
| Durations | micro 200 ms (180–240) · reveals 1050 ms (900–1200) | |
| Stagger | lines 80 ms · words 60 ms · chars 35–40 ms | |

- Headlines rise through **SplitText line masks**; display words rise **by character**. **Arabic splits by word**, because splitting by character breaks letter joining. Reveals play on enter and reverse on leave-back. The server HTML is fully visible, so LCP, no-JS and screen readers are unaffected.
- Nothing springs or overshoots. Each camera and 3D move has a reason: it assembles, disassembles, reveals or measures the watch.
- Scroll is native. Lenis smooths the wheel only, and ScrollTrigger reads progress. There is no scroll-jacking: keyboard, scrollbar, anchors and the back button behave normally, and Lenis is off in reduced motion.

## 6. Signature details

1. **Live Riyadh time.** `src/lib/time.ts` gets the offset from `Intl` for Asia/Riyadh. The hands use a high-beat sweep: 8 steps/s, each step settling in about 28 ms like a real escapement.
2. **Scroll progress as a bezel.** The nav dial is a 44 px SVG. Its seconds hand sweeps 0→360° over the page in 1° mechanical steps, with chapters marked as hour indices at their measured scroll positions. The dial is also the chapter index (button → list of 8 chapters).
3. **HUD.** Mono and hairline-framed: Riyadh time (live), Al Khobar coordinates 26°17′N 50°12′E, sound, motion, and chapter `03 / 08` plus name. Eastern Arabic digits on `/ar`.
4. **Sound** (off by default). Web Audio synthesis only (`src/lib/audio.ts`): a noise burst through a bandpass plus a faint case "ring" for tick/tock, and a two-detent crown click. Ambient escapement at 8 beats/s in the movement chapter. The choice persists in `localStorage` with try/catch and is restored on the first user gesture.
5. **Loupe cursor.** A 26 px ring that grows on links. Over the movement chapter it becomes a 224 px loupe with a 60-tick bezel. The magnified image is a **real re-render** of the region under the cursor at 2.6×, using `camera.setViewOffset` into a small render target. It is composited by a custom post effect (barrel distortion, slight lateral colour at the rim, polished ring). It is never shown on touch devices.
6. **Light sweep.** A custom GLSL patch on the metal materials draws a soft specular band in screen space that travels across brushed steel whenever a chapter headline reveals or the finish changes.
7. **Live caseback engraving.** Text from the configurator is drawn to a canvas mask and fed into a shader patch on the caseback medallion. The letters are recessed via bump from screen-space derivatives, rougher and darker, with a brief "laser" flash on change. The mask is debounced at 70 ms. Arabic is shaped by the browser's canvas engine (`direction: rtl`), and the font is OFL.

## 7. Storyboard (camera path: `CAMERA_KEYS` in `src/three/choreography.ts`)

All poses are in watch space (mm): +Z dial normal, +Y 12 o'clock, +X 3 o'clock. Keys sit at (chapter, t). Between keys the camera travels a centripetal Catmull-Rom spline with power3.inOut easing. The lens shift is in units of visible height and is mirrored for RTL.

| # | Chapter | Scroll | Camera | 3D action | DOM | In → out |
|---|---|---|---|---|---|---|
| 00 | Preloader | — | hero pose | assets load; compileAsync; first frames; hands 10:10 → **snap to Riyadh time** | logo rises through a mask; mono counter 000→100 tied to real progress (fonts, poster, engine chunk, model bytes, shaders, first frame); hairline progress bar | curtain lifts (clip-path, 1000 ms reveal ease) |
| 01 | Hero | 150vh | ¾ studio view, fov 24, lens shift ±0.3 | idle drift; pointer tilt ±6°; light sweep on reveal | eyebrow, positioning line, two quiet CTAs, **"Time, well given."** (mega, chars), live-time caption with a dotted leader line to the dial, scroll cue | camera swings toward profile as the headline leaves |
| 02 | Anatomy | 400vh (sticky) | orbits to an oblique profile (az ≈ 70°, el ≈ 25°) | 13 staged explode orders: strap → buckle → screws → caseback → crown/rotor → bridges → train → mainplate → dial → indices → hands → crystal → bezel; ends as an evenly spaced diagram with slow drift | h2 "Every gift has an inside.", body, **PARTS nn / 45** counter (ticks), stage list as a procedure column, DOM leader-line labels on de-overlapped side columns | the movement layer lifts away from the case |
| 03 | Movement | 300vh (sticky) | dives behind the movement to a macro on the balance; DOF on the balance | wheels re-seat in the mainplate, bridges hover, back parts pushed behind the camera; train at true ratios; balance 4 Hz; pallet fork flips; hairspring breathes; time slows to ~1/7 | h2 "Where the time is made.", two Titan facts (official source), "On screen" spec table (illustrative), loupe hint | camera swings round the side |
| 04 | Finishes | 220vh (sticky) | side swing → front ¾, slow orbit | reassembles inside-out (mainplate → … → strap); finish steel → gold-tone → black by scroll (or click); strap options; sweep on change | h2 "Steel, gold-tone, black.", finish list with swatches and notes, strap chips, availability `[[CONFIRM]]` | camera rises |
| 05 | Collections | horizontal (sticky, travel = strip width) | camera rises; the watch leaves the frame | WebGL image planes synced to DOM boxes, bulge and velocity bend on hover/scroll, drawn **after** post (never tone-mapped) | intro, five collection cards (official names and lines with sources), labelled placeholders | watch turns its back as gifting approaches |
| 06 | Corporate gifting | content height | caseback to camera, watch at the end side | **live engraving**, finish, dial and strap update the model; "show dial" flips it | h2 "Your name, on the back.", configurator (aria-live), process dial (DrawSVG, scrubbed), tiers `[[CONFIRM]]`, **Request a proposal** form, WhatsApp | watch turns to face up |
| 07 | Al Khobar | 100vh | pulls back and up | watch settles (tilted back); key light warms toward amber | h2 "Opening in Al Khobar.", body, coordinates, Notify-me | canvas fades |
| 08 | Footer | — | idle | canvas fades out; rendering stops (`frameloop: demand`) | mega sign-off, logo, contact, legal `[[CONFIRM]]`, language switch, back to top | — |

## 8. Architecture notes

- **One persistent `<Canvas>`** is mounted in the root layout (`src/three/StageMount.tsx`). Switching `/en` ⇄ `/ar` is a soft navigation, so the WebGL context survives (unmount is debounced 800 ms). The 3D chunk is lazy-loaded after first paint or idle, so LCP is HTML text plus the poster.
- Scroll → `frame` (mutable, read in `useFrame`) and zustand (discrete state only). No React render per frame.
- Text is always DOM: labels are projected from 3D anchors (`src/three/labels.ts`) and positioned in rAF.

## 9. Device tiers and reduced motion

| | Tier A | Tier B | Tier C |
|---|---|---|---|
| Who | desktop GPU / Apple Silicon | integrated GPUs, high-end phones | low-end, Save-Data, 2G, no WebGL2 |
| Canvas | full scene, DPR ≤ 2 | DPR ≤ 1.5, mobile LOD | none; poster + still renders, 120-frame sequence for anatomy |
| Crystal | transmission | cheap transparent | — |
| Post | DOF (ch. 03), bloom, AgX, SMAA, grain, vignette, loupe | no DOF, half-res bloom | — |

Detection uses `quickTier` (Save-Data, deviceMemory, cores, WebGL2) followed by `detect-gpu` with self-hosted benchmarks. drei `PerformanceMonitor` lowers DPR live, and on a sustained fps fallback tier A drops to B. Override for QA: `?tier=A|B|C`.
**Reduced motion** (system setting or the in-page MOTION toggle, persisted): Lenis off and no camera smoothing. Chapters change by crossfading between static poses; nothing is scrubbed in flight. The idle drift and tilt are disabled. Live time still runs (it is content).
