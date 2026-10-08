# REFERENCE_NOTES — Titan Saudi Corporate Gifting

> Phase 1 steps 1–2. Study only: nothing is copied. Evidence is in `qa/reference/` (index in `capture-notes.md`); scripts are in `scripts/research/`. Captured 2026-10-08.

## 1. Reference site: "Vision 7" (football academy, Jubail)

**What it is.** A 7-chapter scroll story, 12.4 viewports tall (11,196 px at 1440×900).

**Build.** Vite + React Three Fiber (three r185) + Lenis, with one fixed full-viewport canvas behind the DOM. A composer adds heavy bloom-style glow, tone mapping is Neutral, and reflections come from procedural light-formers (no HDRI).

**Set pieces, in order:**
1. A gold extruded "7" over a hex floor (`desktop-01`).
2. The 7 dissolves into particle orbits (`02–03`).
3. A wire-line pitch whose five zones are photo + depth-map point clouds. Clicking a zone "steps inside" a depth-displaced room (`05–07`, `18`).
4. A bloomed 7 in a particle ring, with canvas-text values (`08–10`).
5. A self-drawing path (`11–13`), a particle network (`14`), then a centred form (`15–16`).

**Census.** 137 meshes, 118 of them unlit `MeshBasicMaterial`; 66k particles on desktop, 16.6k on mobile; about 2.25M triangles on both.

**Interface.**
- HUD: corner captions plus a `01 / 07` counter, a left rail, a top progress line and a ring cursor.
- Preloader: a line-drawn crest with a 3-digit counter.
- Type: Inter 900 (120 px, −0.04em) and IBM Plex Mono at 9.6–11 px.
- Colour: navy `#071c2e` with yellow `#f2c814`.

### Adopt (in our own language)
1. **Scroll-scrubbed chapters on one persistent canvas.** States reverse exactly (`desktop-17-reverse` matches `desktop-09`).
2. **Native scroll survives the smoothing.** PageDown, Space, End and Home work, and Lenis is off under `prefers-reduced-motion`.
3. **HTML text is the LCP element.** CLS is 0.003. About 0.4 MB loads first; 3.2 MB of set-piece images are deferred.
4. **Touch tier.** DPR capped at 1.5, 4× fewer particles, no rail and no cursor.
5. **An inspect mode with real affordances** (`desktop-18`): Exit, prev/next with `01 / 05`, Esc and arrow-key hints, and a DOM spec panel. This is the template for our part inspector.
6. **Smaller wins:** the chapter index overlay (`desktop-19`), an `aria-pressed` sound toggle, and zero-byte light-former reflections.

### Surpass
1. **Typography.** One weight-900 grotesk does everything, labels are 9.6–10.4 px, and the H1 is gradient-filled. We need a serif display, a grotesk text face, mono at ≥ 11 px, and a real Arabic pairing.
2. **Object and materials.** Their numeral sits under bloom that blows out the floor and reads as neon, not metal (`desktop-09/10`, `mobile-09`). Ours is a 35–45-part watch on physical materials, with bloom on speculars only.
3. **Labels.** Theirs are canvas-baked, so they clip and overprint DOM copy (`desktop-10/11`, `mobile-08/12`). Ours are projected DOM.
4. **Configurability and language.** They have none. It is a Saudi site that is English-only.
5. **Accessibility.**
   - Fields use placeholders as labels, with `outline: none`.
   - No skip link.
   - The menu has no dialog semantics, no focus trap, and ignores Escape (`desktop-20`).
   - Tab jumps from the nav straight to the form.
   - About 10 small labels per viewport fall below 4.5:1.
6. **Layout.**
   - Copy slides under the unbacked nav (`desktop-03/05/15`).
   - The rail and HUD overprint text (`desktop-01/02`, `mobile-02/08`).
   - The HUD index lags one chapter behind (`desktop-04/08/11`).
7. **Performance and SEO.**
   - Up to a 2.4 s stall on chapter entry.
   - Mobile gets the same 2.25M triangles and 3.8 MB.
   - Console warnings.
   - Fonts from Google's CDN.
   - With JS off the page is blank, with no description, OG or JSON-LD.

### Avoid
- Meaningless particles, glowing orbs, comet trails and sparkle dust.
- Gradient headline words. Saturated yellow blooming on matte surfaces reads sport/tech, not atelier.
- Generic blocks: hairline card grids (`desktop-02/14`) and the centred form (`desktop-15`).
- Smeared depth-displaced rooms (`desktop-18`) and game-UI hex floors.
- **Their identity markers:**
  - corner HUD captions;
  - the numeric rail and the progress line;
  - the crest line-draw preloader;
  - Inter + IBM Plex Mono;
  - `WAY_01`-style codes;
  - Instrument Serif (they use it) as our lead display face.

## 2. Benchmarks
Awards were checked on each awwwards.com page: all 10 by a research subagent, 6 re-fetched by me.

| Site (studio) | URL | Award | What to learn |
|---|---|---|---|
| Cartier Watches & Wonders 2026 (Immersive Garden) | cartier.com/en-fr/watchesandwonders | Awwwards SOTD, 25 May 2026 | A hairline serif title over a warm-lit 3D room; the camera moves into staged scenes with the watch at monument scale. |
| GQ × AP The Extraordinary Lab (Immersive Garden) | gq.com/sponsored/story/the-extraordinary-lab | SOTD, 26 Mar 2026 | A wireframe blueprint resolves into shaded materials, and captions light up word by word. This is our "Assemble" beat. |
| The Watch FS 60P (60fps) | thewatch.60fps.fr | SOTD, 17 Aug 2026 | Giant type layered in depth with the live watch (letters pass through the bracelet); the watch holds still while copy scrolls. |
| Urban Jürgensen (DLG, Numbered) | urbanjurgensen.com | SOTD, 30 Oct 2025 | A print-heritage editorial frame turns one 3D watch moment into an event. Spend the 3D where it pays. |
| Girard-Perregaux Casquette (Immersive Garden) | girard-perregaux.com/casquette-collection | SOTD, 31 Jul 2024 | A labelled "Drag" turntable ring, with raking warm light that sells the brushed titanium. |
| WRK ACF-01 (Studio 28K) | wrk-timepieces.com/products/acf-01 | SOTD, 10 Apr 2024 | Lettered movement callouts tied to a per-part material/weight table, the model for our `PARTS` spec table. |
| Find Your Love, Cartier configurator (Decimal) | cartier.com/en-us/loveconfigurator.html | SOTD, 2 Jan 2026 | Swapping the metal keeps the same model, pose and light, and the state lives in the URL hash, so a configuration can be forwarded. |
| iyO | iyo.ai | SOTD, 2 Apr 2026 | A scrubbed exploded view with one HTML caption per part, then finish swatches: our chapters 02→04. |
| Ford M-Sport Raptor T1+ (Ryze) | msport-raptor.com | SOTD, 22 Feb 2025 | Verb-phrased buttons open spec overlays, the pattern for our inspector entry points. |
| AVATR Vision Xpectra (Mubien) | vision.avatr.com | SOTD, 12 Nov 2025 | The preloader doubles as a title card ending in an "Enter" gate, and the language switch sits in a fixed header slot. |

**Arabic is open ground.** None of these offers Arabic. The nearest RTL precedent is Aramco "The Birth of Oil" (Immersive Garden, SOTD 27 May 2025).

## 3. Implications for our build (prioritised)
1. **Scroll engine.**
   - Lenis on the GSAP ticker, with native keys verified.
   - Chapters write 0–1 progress into zustand.
   - Dial jumps use `lenis.scrollTo`, then focus the chapter `h2`.
   - Reduced motion means still crossfades only. They keep the WebGL running.
2. **No entry stalls.**
   - Run `renderer.compileAsync()` and upload all textures during the preloader; the counter tracks real bytes plus programs.
   - QC3 gate: no frame over 50 ms on chapter entry, measured with the rAF recorder in `capture-reference.mjs`.
3. **One camera spline, one object.** The camera never cuts, and the watch is the only hero. They cross-fade between unrelated set pieces.
4. **Labels are DOM.**
   - glTF-extras anchors are projected each frame (transforms, no React renders), with SVG leaders.
   - Labels are clamped to a safe rect, avoid headlines, and flip in RTL.
5. **Safe-area composition.**
   - A solid fade band under the nav, plus a dedicated HUD lane.
   - The watch is framed in columns 7–12 in EN and 1–6 in AR.
   - The HUD index flips as the incoming headline reveals.
6. **Materials and grade.**
   - MeshPhysical with anisotropic brushing; transmission crystal on Tier A only.
   - Light-formers plus a small CC0 HDRI.
   - Test AgX, ACES and Neutral on the champagne accent.
   - Bloom threshold above 1.0.
7. **Tiers in numbers.**
   - DPR ≤ 2 on Tier A, ≤ 1.5 on Tier B.
   - Mobile LOD ≤ 80k triangles (they ship 2.25M).
   - ≤ 2.5 MB before first interaction.
   - Tier C is static.
8. **Static-first SEO.** Real headings and copy in the export, plus per-locale metadata, hreflang, JSON-LD and OG images from the renders.
9. **Accessible overlays and form.**
   - The dial and menu work as dialogs: focus moves in and is trapped, Escape closes, focus returns.
   - `aria-live` configurator radio groups.
   - Visible labels and `autocomplete`; a skip link; the canvas is `aria-hidden`.
   - Mono at ≥ 11 px and ≥ 4.5:1.
10. **Configurator and inspector.**
    - Same pose and light during material swaps, with state in the URL so a configuration can be shared.
    - Part inspector: Enter or click flies to the part, ←/→ steps between parts, Esc exits, with a `PARTS 07 / 42` counter, reachable by Tab from anywhere.
11. **A distinct identity.**
    - The bezel dial replaces their rail and progress line.
    - One hairline HUD strip: Riyadh time · `03 / 08` · Al Khobar coordinates · sound · EN/AR.
    - The preloader counter sits in the dial and ends as the hands snap to Riyadh time.
    - Mono face: Geist Mono or JetBrains Mono.
12. **Zero-warning stack.** R3F 9.8.1 still calls `new THREE.Clock`, which three r186 deprecates with a console warning (they ship the same warning). Patch R3F to use `THREE.Timer` (`pnpm patch`), or filter that single warning via three's `setConsoleFunction`.
