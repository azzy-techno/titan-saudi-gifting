# WATCH_SPEC — the hero watch ("TSG-01", illustrative)

Contract between the Blender build (`blender/scripts/`) and the web app (`src/three/`).
If official Titan CAD arrives later it must satisfy the same contract (names + extras), or the loader config in `src/three/watchConfig.ts` is adapted.

## 1. Design intent
An **original** contemporary dress/sport watch: calm, precise, quietly luxurious. No signature cues of any other brand
(no octagonal/porthole bezels, no integrated-bracelet "Royal Oak/Nautilus" shapes, no Mercedes hands, no coin-edge bezels, no crown guards).
Mood: "Midnight atelier" — warm near-black studio, bone-white highlights, ONE champagne/brass accent (the seconds hand and the gilt gear train echo the site's accent colour).

- **Case:** round, Ø 41.0 mm, lug-to-lug 48.0 mm, total thickness 11.0 mm (crystal apex → caseback), lug width 20 mm.
  Case middle with **vertically brushed flanks**; top of the lugs **linearly brushed** (along Y); a crisp **polished chamfer** (≈0.5 mm) runs along the lug/case top edge.
  Lugs: integrated, tapering, gently down-curved (follow a wrist), faceted — not wire lugs.
- **Bezel:** separate ring, slim (≈2.2 mm visible width), polished, slightly sloped/concave profile.
- **Crystal:** sapphire, Ø ≈ 34.6 mm, slightly domed (≈0.6 mm), 1.6 mm thick.
- **Dial:** Ø 33.6 mm, **sunburst** (radial-brushed) graphite (default). Printed minute track at the edge (60 ticks; 5-minute ticks longer) in bone white. No text other than the logo.
- **Indices:** 12 applied, faceted, polished batons (12 o'clock = double baton). No numerals.
- **Logo:** Titan logo (mark + wordmark) as a decal below 12 o'clock — from `brand/titan-logo.png` (raster; convert black-on-white → white + alpha). ≈ 6.5 mm wide, centred at y ≈ +8.6 mm. Printed silver/champagne.
- **Hands:** hour + minute: faceted lancet ("leaf-baton") with a lume channel; seconds: slim needle with a counterweight, **champagne/brass lacquer** (accent). Hand lengths: hour reaches ≈ 10.5 mm, minute ≈ 15.2 mm, seconds ≈ 16.0 mm (tip), tail 4 mm.
- **Crown:** at 3 o'clock, Ø 6.0 mm, fluted (24 flutes), with a crown tube.
- **Caseback:** **solid** (engraving is the hero feature), polished outer ring + a large flat **circular-grained/brushed medallion Ø ≈ 26 mm** for engraving, held by 4 screws. Medallion UVs: planar, centred, square (0..1 covers Ø 26 mm) so the web can draw engraving text into it.
- **Movement (illustrative automatic, 28,800 vph):** rhodium-grey mainplate with **perlage**; three bridges with **Côtes de Genève** and polished bevels; **gilt** (gold-tone) wheels with 4–5-spoke crossings; ruby jewels; balance with hairspring; pallet fork; barrel; half-moon rotor (gilt accent, openwork optional).
- **Strap:** 20 → 18 mm taper, dark leather with grain + tone-on-tone stitching; curved like a product shot (opens backwards to suggest a wrist). strap_a (12 o'clock side, ends at the buckle, has keeper loops), strap_b (6 o'clock side, 7 holes). Pin buckle with an original form.

## 2. Units and frame
- **1 Blender unit = 1 mm.** `scene.unit_settings`: METRIC, `scale_length = 0.001`, length unit MILLIMETERS. The GLB therefore stores millimetres; the web treats world units as mm.
- **Watch space:** origin = dial centre on the dial plane (z = 0). **+Z = dial normal (front)**, **+Y = 12 o'clock**, **+X = 3 o'clock**.
- Vertical stack (approx., tune for realism): crystal apex +4.2 · bezel top +3.4 · hands seconds +1.6 / minute +1.1 / hour +0.7 · indices 0…+0.5 · dial −0.4…0 · movement −0.6…−5.0 · caseback outer face ≈ −6.8. Total 11.0 mm.

## 3. Parts (exactly these names; 45 parts)
Every part = one object (mesh may have several materials). Origin at the part's own centre; rotating parts have the origin **exactly on their arbor axis** (hands on the centre pinion axis).
Jewels: one empty `jewels` whose children are instanced (linked-duplicate) ruby meshes `jewel_01…` — the empty counts as ONE part.

| # | name | group | explode_order | explode_axis (watch space) | explode_distance (mm) | label_en | label_ar |
|---|---|---|---|---|---|---|---|
| 1 | strap_a | strap | 1 | [0, 1, 0] | 34 | Strap, buckle side | السوار، جهة الإبزيم |
| 2 | strap_b | strap | 1 | [0, -1, 0] | 34 | Strap, tail side | السوار، الطرف الحر |
| 3 | buckle | strap | 2 | [0, 0.8, -0.6] | 52 | Pin buckle | الإبزيم |
| 4–7 | caseback_screw_01…04 | case | 3 | [0, 0, -1] | 58 | Caseback screw | برغي الغطاء الخلفي |
| 8 | caseback | case | 4 | [0, 0, -1] | 48 | Caseback | الغطاء الخلفي |
| 9 | gasket | case | 4 | [0, 0, -1] | 40 | Gasket | حلقة العزل |
| 10 | crown | case | 5 | [1, 0, 0] | 16 | Crown | التاج |
| 11 | crown_tube | case | 5 | [1, 0, 0] | 8 | Crown tube | أنبوب التاج |
| 12 | rotor | movement | 5 | [0, 0, -1] | 34 | Rotor | الدوّار |
| 13–15 | mvmt_bridge_01…03 | movement | 6 | [0, 0, -1] | 27 | Barrel bridge / Train bridge / Balance cock | جسر البرميل / جسر العجلات / جسر الميزان |
| 16 | jewels | movement | 7 | [0, 0, -1] | 23 | Ruby jewels | أحجار الياقوت |
| 17 | barrel | movement | 7 | [0, 0, -1] | 19 | Mainspring barrel | برميل النابض |
| 18 | wheel_center | movement | 7 | [0, 0, -1] | 19 | Centre wheel | العجلة المركزية |
| 19 | wheel_third | movement | 7 | [0, 0, -1] | 19 | Third wheel | العجلة الثالثة |
| 20 | wheel_fourth | movement | 7 | [0, 0, -1] | 19 | Fourth wheel | العجلة الرابعة |
| 21 | wheel_escape | movement | 7 | [0, 0, -1] | 19 | Escape wheel | عجلة الانفلات |
| 22 | pallet_fork | movement | 7 | [0, 0, -1] | 19 | Pallet fork | المرساة |
| 23 | balance_wheel | movement | 7 | [0, 0, -1] | 21 | Balance wheel | عجلة الميزان |
| 24 | hairspring | movement | 7 | [0, 0, -1] | 23 | Hairspring | النابض الشعري |
| 25 | mvmt_mainplate | movement | 8 | [0, 0, -1] | 13 | Mainplate | اللوحة الرئيسية |
| 26 | dial | dial | 9 | [0, 0, 1] | 15 | Sunburst dial | الميناء الشمسي |
| 27–38 | index_01…12 | dial | 10 | [0, 0, 1] | 20 | Applied index | مؤشر الساعات |
| 39 | logo_plate | dial | 10 | [0, 0, 1] | 19 | Logo | الشعار |
| 40 | hand_hour | hands | 11 | [0, 0, 1] | 25 | Hour hand | عقرب الساعات |
| 41 | hand_minute | hands | 11 | [0, 0, 1] | 29 | Minute hand | عقرب الدقائق |
| 42 | hand_seconds | hands | 11 | [0, 0, 1] | 33 | Seconds hand | عقرب الثواني |
| 43 | crystal | case | 12 | [0, 0, 1] | 42 | Sapphire crystal | الكريستال الياقوتي |
| 44 | bezel | case | 13 | [0, 0, 1] | 50 | Bezel | الإطار |
| 45 | case_body | case | 0 | [0, 0, 0] | 0 | Case | العلبة |

Distances are a starting point; adjust so the fully exploded stack (viewed in profile) reads as a clean, evenly spaced diagram with no overlaps.

## 4. Custom properties (exported as glTF `extras`)
On every part object (string/float/int/float-array only):
- `explode_axis` — float[3], unit vector **in watch space** (see §2), NOT converted to glTF axes.
- `explode_distance` — float, mm.
- `explode_order` — int (stage; 0 = anchor).
- `label_en`, `label_ar` — strings (UTF-8; Arabic must survive export).
- `group` — `case | dial | hands | movement | strap`.
- `finish` — which configurable material slot the part follows: `case_metal` (case_body, bezel, crown, crown_tube, caseback, screws, buckle, indices, hands' metal), `strap`, `dial`, `none`.
- Rotating parts also get: `spin_rate` — revolutions per hour at real speed, signed (+ = counter-clockwise seen from the dial side, right-hand rule about +Z): barrel +0.1667, wheel_center −1, wheel_third +8, wheel_fourth −60, wheel_escape +720 (stepped, 20 teeth). `balance_hz` = 4 on balance_wheel (28,800 vph, amplitude ≈ 270°). pallet_fork: `oscillate_deg` = 10. Also `teeth` and `pinion` ints on wheels.

Gear train (tooth counts make the ratios true): barrel 72 → centre pinion 12 (×6); centre wheel 80 → third pinion 10 (×8); third wheel 75 → fourth pinion 10 (×7.5); fourth wheel 84 → escape pinion 7 (×12); escape wheel 20 teeth. ⇒ centre 1 rph, fourth 60 rph (1 rpm), escape 12 rpm, 28,800 vph.
Suggested modules (pitch radius = m·z/2): barrel/centre-pinion m = 0.14; centre/third-pinion m = 0.12; third/fourth-pinion m = 0.11; fourth/escape-pinion m = 0.09 ⇒ centre distances 5.88 / 5.40 / 4.675 / 4.095 mm. Lay the train out so everything fits inside the Ø 30 mm movement and meshing pairs sit at the same Z.

## 5. Materials (glTF-compatible Principled BSDF only; names fixed)
`m_steel_polished`, `m_steel_brushed` (+ normal map lines; **verify Blender 5.2 glTF exporter's KHR_materials_anisotropy support** and three.js r186 support — use it if both work, else normal-map only), `m_sapphire` (transmission 1, IOR 1.77, roughness ≈ 0), `m_dial` (sunburst: normal + roughness maps, dark graphite metallic-paint look), `m_dial_print` (minute track — may be baked into the dial base-colour texture instead), `m_logo` (alpha-masked), `m_lume`, `m_accent` (champagne/brass lacquer, seconds hand), `m_ruby` (red, transmission ≈ 0.6, IOR 1.76), `m_rubber`, `m_plate` (rhodium + perlage normal), `m_bridge` (rhodium + Côtes de Genève normal), `m_gilt` (gold-tone wheels/rotor), `m_movement_steel` (pinions, arbors, screws), `m_hairspring`, `m_leather` (grain normal + roughness), `m_stitch`, `m_engraving_area` (caseback medallion — plain brushed steel; the web replaces its maps live).
Finish variants for renders/web: **gold-tone** (warm champagne-gold, not yellow) and **black** (black PVD, slightly satin). The web swaps material parameters; Blender renders them for QC2.
Textures: generate procedurally (numpy) → PNG in `blender/textures/` → image textures. Keep sizes modest (dial 2048², others ≤ 1024²). WebP at export.

## 6. Budgets
- ≤ 250k triangles (desktop GLB), mobile LOD ≤ 80k. Bevels applied (no live modifiers at export). Clean, quad-dominant topology where practical; small details via normal maps.
- `public/models/watch.glb` ≤ 3 MB, `public/models/watch-mobile.glb` ≤ 1.5 MB (Meshopt + WebP).
- Optimisation must **preserve node names, hierarchy and extras** (no join/flatten/merge of part nodes).

## 7. Files
- `blender/scripts/build_watch.py` — parametric, re-runnable builder (clears ONLY its own `TSG` collection, rebuilds everything).
- `blender/scripts/materials.py`, `textures.py`, `export.py`, `render.py` (as needed).
- `blender/watch_v001.blend`, `_v002` … (versioned saves). `blender/textures/`, `blender/hdri/` (Poly Haven CC0 studio HDRI), `blender/export/watch_raw.glb`.
- `config/cameras.json` — shared camera contract (web ⇄ Blender). Renders must use it.
- `qa/qc2/` — QC2 renders + scores.
