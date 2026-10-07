# CLAUDE.md — Titan Saudi Corporate Gifting (web experience)

Read this every session, then `BRIEF.md` (source of truth) and `PROGRESS.md` (where we are).
Work autonomously. No approval gates: decide, log the decision in `PROGRESS.md`, keep going.

## Hard rules (safety — you are the only safeguard)
- Create / edit / delete files **only inside `D:\Titan - 3D - site`**. (Global tool installs in Phase 0 were the only exception — done.)
- The path has **spaces** — always quote it. Prefer relative paths inside the project.
- Never change Windows, security, antivirus, firewall, registry, PATH-wide or system settings. Never work around a security control (e.g. Smart App Control `os error 4551` → log as blocker, continue other work).
- Install packages only from npm, PyPI, winget or official sources named in the brief. No `curl | sh`.
- **No `git push`**, no publishing packages, no outbound messages/emails, no form submissions on external sites.
- Never read/print/copy credentials, tokens, browser data or files from other folders.
- Never: spend money, create accounts, enter credentials, deploy to production/custom domain. Cloudflare **preview** deploy only, and only if `wrangler` is already authenticated (it was NOT on day one → skip, note the command).
- Blender: check the Blender 5.2 API docs (MCP doc search) before writing `bpy`. Scripts scoped to our scene and this folder. Save `.blend` before destructive ops. Never touch other `.blend` files.
- Commit after every meaningful step (local only). Update `PROGRESS.md` after every work block.

## Anti-slop (hard bans)
- No purple/blue/neon gradients, gradient text, glowing orbs/blobs, meaningless particles.
- No glassmorphism, heavy drop shadows, `rounded-2xl` everywhere.
- No generic layout (centred hero + subtitle + 2 buttons → 3-card grid → testimonial carousel).
- No Inter/Roboto/system-only type, no emoji, no decorative icon-library icons.
- No identical fade-ups everywhere, no parallax-on-everything, no bouncy springs on luxury elements.
- No scroll-jacking that breaks native scroll / keyboard / back button.
- No autoplay sound, cursor trails, lorem ipsum, stock imagery, fake testimonials/logos.
- Banned words: "elevate", "unlock", "seamless", "timeless elegance", "in today's fast-paced world", "crafted with passion", "redefine".

## Do instead
- Editorial asymmetric compositions on a strict 12-col grid; dramatic type scale contrast.
- One restrained metal accent; hairline rules (1px ≈ 12% opacity); generous negative space.
- Motion with a reason: assembles, disassembles, reveals or measures the watch.
- Scroll animation reversible + scrubbed; camera travels ONE continuous path, never cuts.
- Text is real HTML (never baked into canvas).

## Signature details (all required)
1. Live Asia/Riyadh time on hero watch; seconds hand high-beat sweep (8 steps/s).
2. Nav dial = scroll progress (seconds hand 0→360° over page; chapters = hour indices).
3. HUD: Riyadh time, chapter `03 / 08`, Al Khobar coordinates, sound toggle, language switch — mono, hairline frames.
4. Sound off by default; Web Audio synthesised tick + crown click; preference persisted (try/catch).
5. Loupe cursor (desktop only): ring → jeweller's loupe over movement chapter (shader magnifier).
6. Light sweep across brushed metal when a chapter headline reveals.
7. Live caseback engraving (EN + AR) in gifting chapter.

## Creative direction (section 5)
- Concept "Anatomy of a Gift": Assemble → Reveal → Personalise → Give. Refinements in `DESIGN.md`.
- Palette "Midnight atelier": base ≈ #0A0A0B, graphite layers, bone text ≈ #ECE7DF, ONE metal accent (champagne/brass). WCAG AA documented in `DESIGN.md`.
- Type: high-contrast serif display + refined grotesk text + mono for HUD/specs + Arabic display & text faces. Self-host, subset, preload, `font-display: swap`. Fluid `clamp()` scale; hero display up to 12–14vw, tracking ≈ −0.03em; body lh ≈ 1.6; mono labels 11–12px uppercase +0.12em. **No letter-spacing on Arabic.**
- Layout: 12 columns, dev-only grid overlay toggle (`g` key in dev), designed mobile layouts.
- Motion tokens (in code, `src/styles/tokens.css` + `src/lib/motion.ts`): reveal ease `cubic-bezier(0.16,1,0.3,1)`; camera ease `power3.inOut`; mechanical `steps()` for ticking; micro 180–240ms; reveals 900–1200ms; stagger 0.04–0.08s; headlines = SplitText line masks; display words by char; no overshoot.

## Technical architecture (section 8)
- Next.js (App Router, latest stable), TS strict, `output: 'export'`, Cloudflare Pages. Locales `/en`, `/ar` via `generateStaticParams`. Root `/` picks language on client.
- Tailwind v4, tokens as CSS variables, **CSS logical properties** everywhere (RTL).
- three.js + R3F + drei + @react-three/postprocessing. **One persistent `<Canvas>`** in the ROOT layout (survives locale changes). WebGL2.
- GSAP (ScrollTrigger, SplitText, Flip, DrawSVG, CustomEase) + Lenis synced to GSAP ticker (`lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.lagSmoothing(0)`). ScrollTrigger writes normalised chapter progress into **zustand**; `useFrame` reads `store.getState()` — no per-frame React renders. `motion` only for small UI; never two systems on one element.
- Labels: projected DOM/SVG overlay synced to 3D parts.
- Custom GLSL: light sweep, collection-image distortion, loupe magnifier.
- Engraving: canvas text → bump/roughness on caseback, live (debounced), Arabic-capable.
- Post by tier: bloom (speculars only), DOF (ch.03), SMAA, subtle grain + vignette, AgX/ACES chosen by test.
- Form: RHF + zod; fields per brief; honeypot + rate limit; adapter = Zoho Web-to-Lead | email (later) | `mailto:` fallback; `/api/lead` Pages Function placeholder; designed success state.
- WhatsApp number `[[CONFIRM]]`. Audio via Web Audio only, muted by default.
- ESLint + Prettier, **no `any`**, small components. 3D in `src/three/`, chapters in `src/chapters/`, tokens in `src/styles/tokens.css`.

## Performance budgets & tiers (section 9)
- Tier A: full scene, transmission crystal, all post, DPR ≤ 2. Tier B: DPR ≤ 1.5, no DOF, cheap crystal, half-res bloom, mobile LOD. Tier C (low-end / Save-Data): poster + still renders / 120-frame sequence, no live WebGL; content + form fully usable.
- `prefers-reduced-motion`: no scrubbed camera / smooth scroll; chapters crossfade between still renders; in-page "reduce motion" toggle.
- Detect with drei `PerformanceMonitor` + `detect-gpu` + `deviceMemory`/`hardwareConcurrency`; degrade live.
- LCP ≤ 2.5s mobile (sim 4G); CLS < 0.05; INP < 200ms. Initial JS ≤ 250KB gz before lazy 3D chunk. Data before first interaction ≤ 4MB desktop / ≤ 2.5MB mobile. 60fps desktop through ch.02; ≥ 45fps mid Android (4× CPU). Lighthouse mobile: Perf ≥ 85, A11y ≥ 95, BP ≥ 95, SEO 100. Zero console errors/warnings.

## Content rules (section 11)
- **Never invent** facts, stats, prices, client logos, testimonials, awards, certifications, warranty, water resistance, movement specs, delivery times → `[[CONFIRM: what's needed]]` + entry in `CONTENT_TODO.md`.
- Titan facts only from Titan's official websites, paraphrased, source URL logged in `CONTENT_TODO.md`.
- Legal footer all `[[CONFIRM]]`: FAST Operations and Maintenance Company, Office 308, Balhamer Business Gate, Dammam; CR 2050113965; VAT 312690692600003.
- Voice: quiet confidence, short sentences, concrete nouns, no hype. Headlines legible to a Saudi HR director in 5 seconds.
- Programme name exactly: **"Titan Saudi Corporate Gifting"**.
- Arabic written natively, flagged for native review; Eastern Arabic numerals in AR via one config switch (`src/lib/i18n/config.ts`).
- Product imagery only from `brand/products/` (official kit). Never download Titan images.

## Working method
- Phases 0–5 per BRIEF §12. QC1/QC2/QC3 critics are always FRESH subagents (never the builder). Evidence in `qa/`.
- Look before you claim — screenshot every visual claim.
- Approach fails twice → write it down in `PROGRESS.md`, change approach.
- After compaction / new session: re-read `CLAUDE.md`, `BRIEF.md`, `PROGRESS.md` first.
