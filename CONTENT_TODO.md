# CONTENT_TODO — what the owner must supply or verify

Every `[[CONFIRM: …]]` placeholder in the site is listed here. Nothing below has been invented; where the site shows a value, it is either a visible placeholder or a fact copied (paraphrased) from an official source listed in §B.

Status key: ⬜ open · ✅ supplied/verified

## A. Assets and brand
| # | Item | Where used | Status |
|---|---|---|---|
| A1 | **Official vector logo** (`brand/titan-logo.svg`). Currently using the 447×447 raster supplied in chat at native resolution, recoloured (bone on dark) by alpha-masking only — not traced | Nav, preloader, footer, dial decal on 3D watch | ⬜ |
| A2 | Titan **brand guidelines** (logo clear-space, minimum size, approved colours, use on dark backgrounds). If supplied they override palette/logo decisions in `DESIGN.md` | Global | ⬜ |
| A3 | **Official product imagery** from the franchise media kit → `brand/products/` (one hero image per collection, transparent or dark-studio background preferred, ≥ 2000px) | Chapter 05 Collections (currently labelled placeholders) | ⬜ |
| A4 | Official product **3D / CAD** (optional). The site's watch is an original illustrative design; the GLB can be swapped (see README "Swap in the official model") | 3D scene | ⬜ |

## B. Facts that need verification (sources)
All Titan facts come from Titan's official websites, paraphrased (never copied). titan.co.in blocks automated fetching (HTTP 403); facts were read from titancompany.in pages and official-domain search results.

| # | Fact used (as written on the site) | Where | Source URL | Status |
|---|---|---|---|---|
| B1 | "Titan opened its watch factory in Hosur, India, in 1988." | Ch. 03 Movement — "From Titan" | https://www.titancompany.in/our-heritage ("Titan Watches Factory (Hosur) inaugurated", 1988) | ⬜ |
| B2 | "In 2020 Titan unveiled a mechanical movement 2.2 mm thin." | Ch. 03 Movement | https://www.titancompany.in/our-heritage (2020: "2.2 mm Slim Mechanical Edge movement") | ⬜ |
| B3 | Edge — "Titan's ultra-slim line, first launched in 2002." | Ch. 05 Collections | https://www.titancompany.in/our-heritage (2002: Titan launches Edge) | ⬜ |
| B4 | Raga — "Watches designed for women, introduced in 1992." | Ch. 05 | https://www.titancompany.in/our-heritage (1992: ladies watches with Indian motifs) · https://www.titan.co.in/40-yoj-history.html | ⬜ |
| B5 | Nebula — "Solid-gold watches in 18k and 22k gold." | Ch. 05 | https://www.titancompany.in/our-brands/nebula-by-titan | ⬜ |
| B6 | Mechanicals — "Titan's collection of mechanical watches." | Ch. 05 | https://www.titancompany.in/our-brands/titan (collection list) | ⬜ |
| B7 | Stellar — "Designs that take their cue from the night sky." | Ch. 05 | https://www.titancompany.in/our-brands/titan (space/cosmic-inspired collection) | ⬜ |
| B8 | Al Khobar coordinates 26°17′N 50°12′E (city centre) | HUD, Ch. 07 | https://en.wikipedia.org/wiki/Khobar — replace with the store's coordinates once the address is confirmed (C5) | ⬜ |
| B9 | On-screen movement data (4 Hz · 28,800 vph, escape wheel 20 teeth, centre wheel 1 turn/hour, fourth wheel 1 turn/minute) describe the **illustrative** model only and are labelled as such — they are NOT Titan product specs | Ch. 03 "On screen" | n/a (design of the illustrative model, `blender/WATCH_SPEC.md`) | ✅ labelled |

## C. Business details
| # | Placeholder | Where used | Status |
|---|---|---|---|
| C1 | `[[CONFIRM: WhatsApp number]]` (international format, +966…) | WhatsApp CTA (gifting + footer) — `src/lib/site.ts` | ⬜ |
| C2 | `[[CONFIRM: enquiries inbox]]` email for the `mailto:` fallback and footer contact | Form adapter, footer — `src/lib/site.ts` | ⬜ |
| C3 | **Zoho CRM Web-to-Lead** form action URL + hidden field values (xnQsjsdp, xmIwtLD, actionType) + field mapping | Form adapter — `src/lib/lead/index.ts` (`viaZoho`) + `src/lib/site.ts` (`zoho`) | ⬜ |
| C4 | Legal entity for the franchise (may differ from FAST): name, address, CR, VAT. Currently: FAST Operations and Maintenance Company, Office 308, Balhamer Business Gate, Dammam; CR 2050113965; VAT 312690692600003 — all shown as `[[CONFIRM]]` | Footer, JSON-LD Organization | ⬜ |
| C5 | Al Khobar store: address, opening date/season, opening hours | Chapter 07, JSON-LD LocalBusiness (added only once confirmed) | ⬜ |
| C6 | Order-size tiers: quantity ranges and what each tier includes | Chapter 06 tiers | ⬜ |
| C7 | Typical lead time / delivery windows | Chapter 06 process step "Deliver" | ⬜ |
| C8 | Engraving rules: max characters per line, number of lines, languages, logo engraving allowed?, caseback vs. other positions | Configurator helper text | ⬜ |
| C9 | Production **domain** (canonical URLs, sitemap, hreflang, OG absolute URLs). Placeholder in `src/lib/site.ts` | SEO | ⬜ |
| C10 | **Privacy notice** URL/text for the form consent checkbox (Saudi PDPL) | Form | ⬜ |
| C11 | Which Titan collections to feature for corporate gifting + one approved line each (currently Edge, Raga, Nebula, Mechanicals, Stellar from the official site, marked `[[CONFIRM]]`) | Chapter 05 | ⬜ |
| C12 | Finishes available for corporate orders (the site shows steel / gold-tone / black on the illustrative watch) | Chapter 04 `[[CONFIRM]]` note | ⬜ |
| C13 | Configurator options (dial: graphite / ivory / deep green; strap: black / brown / sand leather) are illustrative — confirm or replace with real options per collection | Chapter 06 configurator | ⬜ |
| C14 | Response time promise after a proposal request | Form success state `[[CONFIRM]]` | ⬜ |
| C15 | Trademark notice wording ("Titan is a trademark of Titan Company Limited") | Footer `[[CONFIRM]]` | ⬜ |
| C16 | Programme name in Arabic: "تيتان السعودية لهدايا الشركات" (drafted) — confirm official Arabic rendering | Header, preloader, meta (AR) | ⬜ |
| C17 | Form option lists: quantity ranges (10–49 … 500+) and occasions (incl. Saudi National Day / Founding Day) — confirm they match how orders are quoted | Form | ⬜ |

## D. Copy review
| # | Item | Status |
|---|---|---|
| D1 | **All Arabic copy** (`src/i18n/ar.ts`) written natively by Claude — needs native-speaker review (tone for Saudi corporate audience, terminology, numerals) | ⬜ |
| D2 | English copy (`src/i18n/en.ts`) — tone check by the owner | ⬜ |
