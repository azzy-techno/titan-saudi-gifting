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
| # | Fact used | Source URL | Status |
|---|---|---|---|

## C. Business details
| # | Placeholder | Where used | Status |
|---|---|---|---|
| C1 | `[[CONFIRM: WhatsApp number]]` (international format, +966…) | WhatsApp CTA (gifting + footer) — `src/lib/site.ts` | ⬜ |
| C2 | `[[CONFIRM: enquiries inbox]]` email for the `mailto:` fallback and footer contact | Form adapter, footer — `src/lib/site.ts` | ⬜ |
| C3 | **Zoho CRM Web-to-Lead** form action URL + hidden field values (xnQsjsdp, xmIwtLD, actionType) + field mapping | Form adapter — `src/lib/lead/zoho.ts` | ⬜ |
| C4 | Legal entity for the franchise (may differ from FAST): name, address, CR, VAT. Currently: FAST Operations and Maintenance Company, Office 308, Balhamer Business Gate, Dammam; CR 2050113965; VAT 312690692600003 — all shown as `[[CONFIRM]]` | Footer, JSON-LD Organization | ⬜ |
| C5 | Al Khobar store: address, opening date/season, opening hours | Chapter 07, JSON-LD LocalBusiness (added only once confirmed) | ⬜ |
| C6 | Order-size tiers: quantity ranges and what each tier includes | Chapter 06 tiers | ⬜ |
| C7 | Typical lead time / delivery windows | Chapter 06 process step "Deliver" | ⬜ |
| C8 | Engraving rules: max characters per line, number of lines, languages, logo engraving allowed?, caseback vs. other positions | Configurator helper text | ⬜ |
| C9 | Production **domain** (canonical URLs, sitemap, hreflang, OG absolute URLs). Placeholder in `src/lib/site.ts` | SEO | ⬜ |
| C10 | **Privacy notice** URL/text for the form consent checkbox (Saudi PDPL) | Form | ⬜ |
| C11 | Which Titan collections to feature for corporate gifting + one approved line each | Chapter 05 | ⬜ |

## D. Copy review
| # | Item | Status |
|---|---|---|
| D1 | **All Arabic copy** (`src/i18n/ar.ts`) written natively by Claude — needs native-speaker review (tone for Saudi corporate audience, terminology, numerals) | ⬜ |
| D2 | English copy (`src/i18n/en.ts`) — tone check by the owner | ⬜ |
