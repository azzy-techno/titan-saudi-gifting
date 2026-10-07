# TITAN SAUDI CORPORATE GIFTING — Web Experience Build Brief

> **For Claude Code.** Read this entire file before doing anything. It is the single source of truth for this project. **Work autonomously and non-stop, end to end. There are no approval gates — you make every decision yourself, log it, and keep building until the Definition of Done (section 13) is fully met.** Keep `PROGRESS.md` updated so any new session can resume exactly where the last one stopped.
>
> **If this brief was pasted into the chat rather than read from a file, your very first action is to save it verbatim as `BRIEF.md` in the project root**, so you can re-read it after context compaction or in a new session.

---

## 0. Your role and the bar

You are the creative director, 3D artist, creative technologist and QA lead for a flagship web experience. The bar is **Awwwards Site of the Day**: a site that a design-literate visitor remembers, not a template with a 3D model dropped in.

Three things make this site better than the AI-made scroll sites on Instagram, and you must deliver all three:

1. **Real-time 3D, not a video flipbook.** One persistent WebGL scene. The watch is real geometry with real parts: it reacts to scroll, cursor and touch, it shows the real time in Riyadh, and it can be configured and engraved live.
2. **Craft in typography, layout and motion.** Editorial typography, a disciplined grid, restrained colour, and motion that *explains the object* instead of decorating it.
3. **A real product underneath.** Bilingual EN/AR with proper RTL, a working corporate-gifting enquiry flow, fast loading, accessible, SEO-complete.

**Autonomy.** I will not be reviewing your work mid-build. Replace my judgement with rigour: independent critic subagents at every quality checkpoint (section 12), screenshots as evidence for every visual claim, and measured performance numbers. Take your time — quality over speed. Do not stop at "good enough"; iterate until every checkpoint passes.

---

## 1. Business context

- **Client programme:** "Titan Saudi Corporate Gifting" (this is the official programme name — use it exactly).
- **Operator:** FAST Operations and Maintenance Company (Dammam, KSA), Titan's franchise partner in Saudi Arabia.
- **Two routes to market the site must serve:**
  - **(A) Corporate gifting** — the primary goal. Companies across KSA ordering Titan watches in bulk for employees, clients, long-service awards, events and Saudi national occasions. Personalisation (caseback engraving) is the hero feature.
  - **(B) Retail** — launching first in **Al Khobar**, then other cities. The site announces this and captures interest.
- **Audience:** HR heads, procurement and admin managers, CEOs' offices and marketing teams at mid-to-large Saudi companies (oil & gas, industrial, construction, government-linked). They are busy, judge quality instantly, and read both English and Arabic.
- **Primary conversion:** "Request a corporate proposal" form. Secondary: WhatsApp contact; "Notify me" for the Al Khobar opening.

---

## 2. Non-negotiables

### 2.1 Anti-slop rules (hard bans)
Do **not** produce any of these:
- Purple/blue/neon gradients, gradient text, glowing orbs/blobs, random floating particles with no meaning
- Glassmorphism cards, heavy drop shadows, `rounded-2xl` on everything
- The generic layout: centred hero + subtitle + two buttons, then a 3-card feature grid, then a testimonial carousel
- Inter/Roboto/system-font-only typography; emoji; icon-library icons used as decoration
- Every element fading up identically; parallax on everything; bouncy springs on luxury elements
- Scroll-jacking that breaks native scrolling, keyboard navigation or the browser back button
- Auto-playing sound; cursor trails; lorem ipsum; stock imagery; fake testimonials or client logos
- Copy clichés: "elevate", "unlock", "seamless", "timeless elegance", "in today's fast-paced world", "crafted with passion", "redefine"

### 2.2 What to do instead
- Editorial, asymmetric compositions on a strict 12-column grid; real typographic hierarchy with dramatic scale contrast
- One restrained accent colour; hairline rules; generous negative space
- Motion that has a reason: it assembles, disassembles, reveals or measures the watch
- Every scroll animation is reversible and scrubbed; the camera never cuts — it travels one continuous path
- Text is real HTML (crisp, selectable, translatable, indexable), never baked into the canvas

### 2.3 Signature details (these are what make it memorable — all required)
1. **Live time:** the hero watch's hands show the actual current time in **Asia/Riyadh**, with a smooth mechanical sweep on the seconds hand (simulate a high-beat sweep, ~6–8 steps per second).
2. **Scroll progress as a bezel:** the nav holds a small dial whose seconds hand sweeps 0→360° across the whole page; chapter positions are marked as hour indices on that dial.
3. **HUD layer:** live Riyadh time, current chapter index (e.g., `03 / 08`), Al Khobar coordinates, sound toggle, language switch — set in mono, hairline-framed.
4. **Sound (off by default):** a Web Audio–synthesised watch tick and crown-click sounds (no external audio files). The user turns it on; the choice persists.
5. **Loupe cursor:** on desktop, the cursor is a small ring; over the movement chapter it becomes a **jeweller's loupe** that magnifies the 3D movement through a shader. Disabled on touch devices.
6. **Light sweep:** a soft specular highlight travels across brushed surfaces when a chapter's headline reveals.
7. **Live caseback engraving:** in the gifting chapter, the visitor types a company name or message and sees it engraved on the 3D caseback in real time.

---

## 3. Environment and setup (Windows)

This is a **Windows 11** machine (user `FAST-PM`). Use **winget**, not Homebrew. Do **all** installs that could need admin rights or a Windows UAC prompt first, in one batch, at the very start of Phase 0 (I'll be present for the first few minutes) — after that, nothing should need me.

1. **Prerequisites:** check for and install if missing — Node.js LTS, Git, uv. Enable pnpm via `corepack enable`. Also install every global tool you'll need later (e.g. `@gltf-transform/cli`, KTX-Software/`toktx`, `wrangler`) in this same batch.
2. **Smart App Control:** if any Python or uv-launched executable fails with `os error 4551` ("An Application Control policy has blocked this file"), Windows Smart App Control is on. Do not try to work around it. Log it as a blocker in `PROGRESS.md`, keep building everything that doesn't need Blender (grey-box storyboard, app, UI, copy, form, i18n), and retry Blender every so often.
3. **MCP servers** (user scope, verify each with `claude mcp list`):
   - `playwright` → `npx @playwright/mcp@latest`
   - `chrome-devtools` → `npx chrome-devtools-mcp@latest`
   - `context7` → `npx -y @upstash/context7-mcp@latest` (use it for current docs of every library before writing code against it)
4. **Blender MCP:** Blender 5.2 is open with the **official Blender Lab MCP add-on** running (localhost:9876), and the official Blender extension is installed in the Claude desktop app — since you run inside the desktop app, its tools should already be available to you. Check that first. Only if they are not, register the same server the Claude desktop extension uses: the extension lives in `C:\Users\FAST-PM\AppData\Roaming\Claude\Claude Extensions\ant.dir.gh.blender.blender-mcp` and runs `uv run blender-mcp` from that folder — register it at user scope with absolute paths. **Never** install the community `blender-mcp` package or add-on. Verify by listing the objects in the current scene. If the connection fails or another client holds it, retry with backoff; meanwhile continue with non-Blender work and log it.
5. **Skills:** I have installed Anthropic's `frontend-design` plugin. Use it for all UI work.
6. **Project location:** `D:\Titan - 3D - site` (this folder; it starts empty). `git init`, commit after every meaningful step (local commits only — never push to a remote).
   - The path contains **spaces**: always quote it in shell commands and scripts; if any tool breaks on the spaces, work around it inside the project (e.g. relative paths) rather than moving the project.
   - Check the D: drive's file system first. If it is not NTFS (e.g. exFAT on an external drive), symlinks may fail — set pnpm `node-linker=hoisted` in `.npmrc` and note it in `PROGRESS.md`.
7. **You are running inside the Claude desktop app with bypass permissions — nothing reviews your commands, so you are the only safeguard.** Hard rules:
   - Create, edit and delete files only inside `D:\Titan - 3D - site`. Global installs from step 1 are the only exception.
   - Never change Windows, security, antivirus, firewall, registry, PATH-wide or system settings; never disable or work around a security control.
   - Install packages only from the official npm registry, PyPI, winget or the official sources named in this brief; no `curl | sh`-style scripts from elsewhere.
   - No `git push`, no publishing packages, no outbound messages or emails, no form submissions on external sites.
   - Never read, print or copy credentials, tokens, browser data or files from other folders on this machine (the only exception is the Blender extension folder in step 4, and only if you need it).
8. **Create on day one:**
   - `CLAUDE.md` — a condensed version of section 2, the hard rules in step 7 above, and sections 5, 8, 9 and 11 (the rules you must follow every session)
   - `PROGRESS.md` — running log: done, decisions made (with reasons), open questions, next steps
   - `CONTENT_TODO.md` — every placeholder, unverified claim and asset I must supply

---

## 4. Inputs and references

- **Logo:** `brand/` folder (`titan-logo.svg` preferred, else `.png`). If only a raster logo exists, use it at native resolution and log "official vector logo needed" in `CONTENT_TODO.md` — don't trace the trademark yourself. If no logo is there at all, use a clearly marked neutral placeholder and log it. If Titan brand guidelines appear in `brand/`, they override your logo and colour choices.
- **Product imagery:** only from the official franchise media kit, which I'll place in `brand/products/`. **Never** download images from Titan's websites or anywhere else.
- **Reference site (for study only):** https://500d3913.vision7.pages.dev — what it does well: one persistent full-page WebGL canvas behind the DOM; a chapter system with a HUD (chapter counter, coordinates, sound toggle); Lenis smooth scroll; scroll-driven 3D set pieces (a particle "7", interactive zones, a scroll-rotated ring, a self-drawing pathway). Where we must surpass it: luxury-grade typography (it uses Inter + IBM Plex Mono), real PBR materials and a real object instead of mostly particles, configurability, Arabic/RTL. **Do not copy its code, assets, text or visual identity.**

---

## 5. Creative direction

### 5.1 Concept — "Anatomy of a Gift"
The site literally takes a Titan watch apart to show the care inside, then puts it back together with the client's name engraved on it. Narrative arc: **Assemble → Reveal → Personalise → Give.** This is the concept — build it. Record any refinements and the reasoning in `DESIGN.md`.

### 5.2 Palette — "Midnight atelier"
- Base: warm near-black (around `#0A0A0B`), graphite layers, bone-white text (around `#ECE7DF`)
- **One** metal accent (default: champagne/brass) — refine it against the logo and any brand guidelines
- Validate all text/background pairs for WCAG AA contrast and document the results in `DESIGN.md`

### 5.3 Typography
- **Display:** a high-contrast serif for headlines. Free candidates: Instrument Serif, Gambetta, Zodiak, Boska (Fontshare).
- **Text:** a refined grotesk. Candidates: General Sans, Satoshi (Fontshare), Geist.
- **Technical / HUD:** a mono for specs, labels and numbers. Candidates: Geist Mono, JetBrains Mono, IBM Plex Mono.
- **Arabic:** a display face and a text face that genuinely pair with the Latin choices. Candidates: IBM Plex Sans Arabic, Readex Pro, Alexandria, Noto Naskh Arabic.
- Confirm each font's licence allows commercial web use. Self-host, subset, preload, `font-display: swap`.
- Fluid type scale with `clamp()`; hero display words up to ~12–14vw with tight tracking (≈ −0.03em); body line-height ≈ 1.6; mono labels 11–12px, uppercase, +0.12em tracking.
- Build a type specimen at `/lab/type` showing three pairings in EN and AR. Choose the strongest yourself: screenshot all three, have a critic subagent rank them against sections 2 and 5, pick, and record why in `DESIGN.md`.

### 5.4 Layout
12-column grid with a dev-only overlay toggle. Asymmetric editorial layouts, numbers and specs set in mono, hairline rules (1px at ~12% opacity), deliberate white space. Mobile layouts are designed, not just stacked.

### 5.5 Motion language (write these as tokens in code)
- Reveal ease: `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out); camera ease: `power3.inOut`; mechanical steps for anything referencing ticking
- Durations: micro 180–240 ms; reveals 900–1200 ms; camera moves scrubbed to scroll
- Stagger 0.04–0.08 s
- Headlines: SplitText line masks rising; display words by character
- No springy overshoot on luxury elements; nothing moves without a reason

---

## 6. Experience storyboard

One persistent 3D scene; the camera travels a single continuous path. Scroll lengths are starting points — tune for pacing.

| # | Chapter | Scroll | 3D / camera | DOM content |
|---|---|---|---|---|
| 00 | **Preloader** | — | Assets load; at 100% the hands snap to the current Riyadh time | Mono counter 000→100 tied to real loading progress; logo reveal. Target ≤ 2 s on desktop |
| 01 | **Hero** | 150vh | Watch at ¾ view in a dark studio; slow idle drift; cursor tilts it ±6°; light sweep on reveal | Headline (split reveal), one-line positioning, two quiet CTAs: "Corporate gifting" / "Explore the watch". The LCP element is HTML text plus a poster image, never the canvas |
| 02 | **Anatomy (exploded view)** | pinned ~400vh | Camera orbits to profile; parts separate along their own axes in a staged order (strap → buckle → caseback → rotor → movement → dial → hands → crystal → bezel), ending in a clean exploded-diagram spread with slow drift. Fully reversible | Mono part labels with leader lines tracked to projected 3D positions; a parts counter (`PARTS 00 / NN`) |
| 03 | **The movement** | pinned ~300vh | Camera dives into the movement; depth of field; gear train turns at correct relative ratios; balance wheel oscillates; loupe cursor active | Short copy on precision and assembly — facts verified or `[[CONFIRM]]` |
| 04 | **Finishes** | ~200vh | Watch reassembles; finish changes steel → gold-tone → black on scroll and on click; light sweep on brushed surfaces; strap swaps | Finish names in mono; material notes |
| 05 | **Collections** | pinned horizontal | Real Titan collection images on WebGL planes synced to DOM positions; hover distortion shader; RTL reverses direction | Collection names and one line each — official kit only; clearly labelled placeholders until it arrives |
| 06 | **Corporate gifting** (core) | ~300vh | Watch turns to show the caseback; **live engraving** of typed text; dial and strap options update the model | Four-step process (Brief → Curate → Personalise → Deliver) drawn as a dial with four quadrants (DrawSVG); order-size tiers (placeholders); configurator; **"Request a proposal"** form |
| 07 | **Al Khobar** | 100vh | Camera pulls back; watch settles; scene lighting warms | "Opening in Al Khobar" announcement; coordinates; "Notify me" field |
| 08 | **Footer** | — | Canvas idles or fades out | Large typographic sign-off, logo per brand rules, contact, language switch, legal entity details `[[CONFIRM]]` |

---

## 7. 3D asset pipeline (Blender 5.2 via the Blender MCP)

**Before writing any `bpy` code, check the Blender 5.2 API with the MCP's documentation search tools.** Keep every script scoped to the scene and to this project folder; never delete or write files outside `D:\Titan - 3D - site`, and never touch other `.blend` files on this machine. Save the `.blend` before any destructive operation.

### 7.1 The hero watch
- An **original** analogue watch design in a refined, contemporary dress/sport style — no other brand's signature design cues. Titan logo on the dial as a decal from `brand/`. It is an illustrative brand piece, not a specific Titan model; if Titan later supplies official product CAD/3D, the pipeline must accept it as a drop-in replacement.
- Metric, real scale: case Ø ≈ 41 mm, lug-to-lug ≈ 48 mm, thickness ≈ 11 mm, 20 mm strap.
- **35–45 separately named parts** using a clear prefix scheme, e.g. `case_body`, `bezel`, `crystal`, `gasket`, `dial`, `index_01…12`, `logo_plate`, `hand_hour`, `hand_minute`, `hand_seconds`, `crown`, `crown_tube`, `caseback`, `caseback_window`, `caseback_screw_01…06`, `mvmt_mainplate`, `mvmt_bridge_01…03`, `wheel_center`, `wheel_third`, `wheel_fourth`, `wheel_escape`, `pallet_fork`, `balance_wheel`, `hairspring`, `barrel`, `rotor`, `jewel_*` (instanced), `strap_a`, `strap_b`, `spring_bar_*`, `buckle`.
- Each part: origin at its own centre (hands pivot exactly on the centre pinion); custom properties `explode_axis` (vec3), `explode_distance` (mm), `explode_order` (int), `label_en`, `label_ar` — exported as glTF extras so the web app drives the explode procedurally (no baked animation needed).
- Clean topology; bevels applied; detail via normal maps where cheaper. Budget: ≤ 250k triangles desktop, plus an LOD ≤ 80k for mobile.
- Materials — glTF-compatible Principled BSDF only: polished steel, brushed steel (use `KHR_materials_anisotropy` if three.js supports it — verify), sapphire crystal (transmission + IOR), sunburst dial (normal/roughness maps), lume, ruby jewels, gold-tone and black variants for the Finishes chapter.
- Studio lighting reference: a CC0 studio HDRI from Poly Haven, used for renders and as a fallback environment on the web.
- Save versioned `.blend` files in `blender/`.

### 7.2 Export and optimisation
- Export GLB (+Y up, modifiers applied, custom properties on).
- Optimise with `gltf-transform`: Meshopt geometry; KTX2 textures if `toktx` installs cleanly on Windows, otherwise WebP. Budget: hero GLB ≤ 3 MB desktop, ≤ 1.5 MB mobile LOD.
- Generate a typed React component with `gltfjsx`.

### 7.3 Renders (Cycles)
- Hero poster (AVIF/WebP, used as the LCP image), OG image 1200×630, product stills for the gifting section, and a 120-frame explode sequence (WebP; 1080w desktop / 720w mobile) used only as the low-tier fallback.

### ✅ Quality checkpoint QC2 (self-run) — before web integration
Render six views: hero ¾, full exploded view, movement macro, engraved caseback, and the three finishes. A fresh critic subagent reviews them against luxury watch product photography standards (proportions, material realism, edge highlights, part believability, logo placement). Iterate on the model and materials until every view scores ≥ 8/10, then integrate. Save the renders and scores in `qa/qc2/`.

---

## 8. Technical architecture

- **Framework:** Next.js (latest stable, App Router), TypeScript strict, `output: 'export'` (static), deployed to **Cloudflare Pages**. Locales `/en` and `/ar` via `generateStaticParams`; root picks a language on the client or via Cloudflare `_redirects`.
- **Styling:** Tailwind CSS v4 with design tokens as CSS variables; CSS logical properties everywhere for RTL.
- **3D:** three.js + React Three Fiber + drei + `@react-three/postprocessing` (latest stable — check docs via Context7). **One persistent `<Canvas>`** fixed behind the content, mounted once in the root layout so it survives route and language changes. Default to WebGL2; only consider WebGPU/TSL as an optional enhancement if it's stable.
- **Scroll and animation:** GSAP (all plugins are free: ScrollTrigger, SplitText, Flip, DrawSVG, CustomEase) + Lenis synced to the GSAP ticker (`lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.lagSmoothing(0)`). ScrollTrigger writes normalised chapter progress into a **zustand** store; `useFrame` reads it directly — no React re-renders per frame. Use `motion` only for small UI interactions and never animate the same element with two systems.
- **Labels:** projected SVG/HTML overlay synced to 3D part positions; text stays crisp DOM.
- **Shaders (custom GLSL):** light sweep, collection-image distortion, loupe magnifier.
- **Engraving:** canvas-rendered text → normal/roughness map on the caseback, updated live (debounced), with an engraving-appropriate typeface; support Arabic text correctly.
- **Post-processing by tier:** bloom on speculars only, depth of field in chapter 03, SMAA, very subtle grain and vignette. AgX or ACES tone mapping — pick by testing renders.
- **Form:** React Hook Form + zod. Fields: company, contact name, role, email, phone (+966), quantity range, occasion, target delivery date, engraving text, message, consent checkbox. Honeypot field and basic rate limiting. Submission goes through an adapter with these modes: Zoho CRM Web-to-Lead (I'll provide the form URL), email (later), and a `mailto:` fallback that works from day one. A Cloudflare Pages Function at `/api/lead` is the placeholder endpoint. Show a designed success state.
- **WhatsApp CTA:** number `[[CONFIRM]]`.
- **Audio:** Web Audio API synthesis only; muted by default; preference stored in `localStorage` with try/catch.
- **Quality:** ESLint + Prettier, no `any`, small components; 3D code in `src/three/`, chapters in `src/chapters/`, tokens in `src/styles/tokens.css`.

---

## 9. Performance budgets and device tiers

### 9.1 Tiers (detect with drei `PerformanceMonitor` + pmndrs `detect-gpu` + `deviceMemory`/`hardwareConcurrency`; degrade live if fps drops)
- **Tier A** (desktop GPU / Apple Silicon): full scene, transmission crystal, all post-processing, DPR up to 2.
- **Tier B** (integrated GPUs, high-end phones): DPR ≤ 1.5, no depth of field, cheaper crystal, half-resolution bloom, mobile LOD.
- **Tier C** (low-end devices, Save-Data on): no live WebGL beyond the poster; the 120-frame sequence or still renders; all content and the form fully usable.
- **`prefers-reduced-motion`:** no scrubbed camera flights or smooth scrolling; chapters crossfade between still renders. Also offer an in-page "reduce motion" toggle.

### 9.2 Budgets (verify with Chrome DevTools MCP traces and Lighthouse)
- LCP ≤ 2.5 s mobile (simulated 4G); CLS < 0.05; INP < 200 ms
- Initial JS ≤ 250 KB gzipped before the lazy-loaded 3D chunk
- Data before first interaction ≤ 4 MB desktop / ≤ 2.5 MB mobile
- 60 fps on desktop through chapter 02; ≥ 45 fps on mid-range Android emulation (4× CPU slowdown)
- Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95, SEO 100
- Zero console errors or warnings

---

## 10. Language, accessibility and SEO

- **Full English and Arabic.** `dir="rtl"`, mirrored layouts, horizontal scroll reversed, Arabic typography tuned (line-height, no letter-spacing on Arabic). Arabic copy is written natively, not translated literally, and is flagged in `CONTENT_TODO.md` for native-speaker review. Use Eastern Arabic numerals (٠١٢٣) in Arabic text, controlled by a single config switch so it can be changed later.
- **Accessibility:** semantic landmarks, skip link, visible focus states, keyboard-operable configurator and form, `aria-live` announcements for configurator changes, canvas `aria-hidden` with equivalent text content, alt text, AA contrast.
- **SEO:** per-locale metadata, `hreflang`, OG images from the Blender renders, JSON-LD (Organization; LocalBusiness once the address is confirmed), `sitemap.xml`, `robots.txt`, one `h1` per page, logical heading order.

---

## 11. Content rules (strict)

- **Never invent** facts, statistics, prices, client logos, testimonials, awards, certifications, warranty terms, water resistance, movement specs or delivery times. Use visible placeholders formatted `[[CONFIRM: what's needed]]` and list each one in `CONTENT_TODO.md`.
- Facts about Titan come only from Titan's official websites; use them, and record each with its source URL in `CONTENT_TODO.md` so I can verify later. Paraphrase — never copy text.
- Legal footer (all `[[CONFIRM]]` — the franchise entity may differ): FAST Operations and Maintenance Company, Office 308, Balhamer Business Gate, Dammam; CR 2050113965; VAT 312690692600003.
- **Voice:** quiet confidence, short sentences, concrete nouns, no hype. Every headline must make sense to a Saudi HR director in five seconds.

---

## 12. Working method

### 12.1 Phases
**Phase 0 — Setup** (section 3). Log what you installed and anything that failed in `PROGRESS.md`, then continue straight into Phase 1.

**Phase 1 — Research and direction**
1. Study the reference site with Playwright: screenshots at 8+ scroll positions on desktop and mobile; write `REFERENCE_NOTES.md` (adopt / surpass / avoid).
2. Find 6–10 current Awwwards or FWA Site-of-the-Day luxury or product sites as benchmarks; one-line takeaway each.
3. Write `DESIGN.md`: concept, palette with contrast checks, type system, grid, motion tokens, sound, cursor, the full storyboard (expanding section 6: camera, 3D action, DOM content, transitions in/out), and device-tier behaviour.
4. Build `/lab`: type specimen (three pairings, EN + AR), palette, motion-token demos, and a **grey-box version of the whole scroll storyboard** using a primitive placeholder watch, to validate pacing before any real asset exists.

**✅ QC1 (self-run)** — screenshot `/lab` and record a scroll-through of the grey-box (Playwright video or frame sequence). A fresh critic subagent reviews pacing, hierarchy and type choice against sections 2 and 5. Fix anything below 8/10, then proceed. Save evidence in `qa/qc1/`.

**Phase 2 — 3D asset** (section 7), ending with **QC2**. Run Phase 2 in parallel with the Phase 3 app scaffold where possible.

**Phase 3 — Build**, chapter by chapter in storyboard order. For each chapter: implement → Playwright screenshots (1440, 1280, 768, 390 widths; EN and AR) → self-critique against sections 2 and 5 → fix. Commit after each chapter.

**Phase 4 — QA and polish**
- Chrome DevTools MCP performance traces on each pinned chapter; Lighthouse; fix until the section 9 budgets pass.
- Accessibility: axe-core via Playwright with zero serious or critical issues; manual keyboard pass.
- Cross-browser via Playwright: Chromium, Firefox, WebKit; mobile emulation.
- **Independent design critique:** a fresh subagent that sees only the screenshots, `DESIGN.md` and section 2, and scores Typography, Layout, Motion, 3D, Copy, Originality and Performance from 1 to 10. Anything below 8 gets fixed and re-scored.

**✅ QC3 (self-run)** — the full critique above plus every section 9 budget, evidenced in `qa/qc3/`. Loop Phase 3–4 until all pass.

**Phase 5 — Handover**
- Produce a production build and confirm it runs locally (`pnpm build` + a static preview server), and record a full desktop scroll-through video and a mobile one into `qa/final/`.
- If `wrangler` is already authenticated, deploy to a **Cloudflare Pages preview** URL. If it isn't, don't wait — skip deployment and note the one command I need to run. **Never deploy to a production or custom domain.**
- Write `HANDOVER.md`: what was built, the preview URL (if any), how to run it, critique scores, Lighthouse and trace results, open blockers, and the full `CONTENT_TODO.md` list.

Then continue with the stretch goals in section 14, keeping every budget green.

### 12.2 Subagents
Run independent work in parallel: e.g. the Blender asset, the app scaffold and the reference research in Phase 1–2; then the design critic, performance auditor and accessibility/RTL auditor in Phase 4. The critic must never be the same agent that built the thing it is judging.

### 12.3 Behaviour (autonomous run)
- **Do not ask me questions and do not wait for me.** Make the call, record it under "Decisions" in `PROGRESS.md` with one line of reasoning, and keep going. Anything that is genuinely mine (brand, legal, money, content facts) becomes a `[[CONFIRM]]` placeholder plus a `CONTENT_TODO.md` entry — never a reason to stop.
- The only things you may not do without me: spend money, create accounts, enter credentials, deploy to a production/custom domain, or touch files outside `D:\Titan - 3D - site`. If one of these blocks a task, log it and move on to the next task.
- Look before you claim: every visual claim is backed by a screenshot you just took.
- When an approach fails twice, step back, write down what you tried in `PROGRESS.md`, choose a different approach, and continue — don't loop on the same failure.
- **Long-run discipline:** commit after every meaningful step; update `PROGRESS.md` after every work block. If your context is compacted or a new session starts, re-read `CLAUDE.md`, `BRIEF.md` and `PROGRESS.md` before doing anything else. If the run is interrupted by a usage limit, resume from `PROGRESS.md` exactly where you stopped.
- Keep going until the Definition of Done is met and evidenced, then continue with the stretch goals.

---

## 13. Definition of done

- [ ] All eight chapters built and reversible, with the seven signature details from 2.3 working
- [ ] EN and AR complete, RTL correct, Arabic flagged for native-speaker review
- [ ] Watch shows live Riyadh time; engraving works for English and Arabic text
- [ ] Device tiers A/B/C and reduced motion verified
- [ ] Section 9 budgets met and evidenced (traces and Lighthouse reports saved in `qa/`)
- [ ] axe: zero serious/critical issues; keyboard pass complete
- [ ] Design critique: every category ≥ 8
- [ ] Zero console errors; no fabricated content; `CONTENT_TODO.md` complete
- [ ] QC1, QC2 and QC3 passed with evidence in `qa/`
- [ ] Production build verified locally; preview deployed if `wrangler` was already authenticated; `HANDOVER.md`, `PROGRESS.md`, `DESIGN.md` and a short `README.md` (run, build, deploy, swap in the official 3D model) up to date

---

## 14. Stretch goals (implement in this order after the Definition of Done is met; each one must keep all budgets and checkpoints green — revert it if it doesn't)
- **Gift-box finale:** the watch settles into a Blender-modelled gift box and the lid closes as the transition into the proposal form
- **Light follows the sun:** studio lighting shifts with the actual time of day in Riyadh
- **"See it on your wrist":** AR view on phones (USDZ / Scene Viewer export from Blender)
- **WebGPU renderer** path for capable browsers
