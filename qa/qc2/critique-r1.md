# QC2 critique, round 1

- **Critic:** independent reviewer (a fresh subagent that did not build the asset). Read-only, except for this file.
- **Date:** 2026-10-08
- **Inputs:** `qa/qc2/01…07*.png` (1800×1125, Cycles OptiX, AgX "Medium High Contrast", composited on #0A0A0B) and `qa/qc2/render_log.txt`. Background reading: BRIEF §7, `blender/WATCH_SPEC.md`, `blender/BUILD_LOG.md`. I judged the pixels, not the log's claims.
- **Standard:** luxury watch press photography (Nomos, A. Lange & Söhne, Grand Seiko, Omega and Rolex press kits, Hodinkee studio work). **8/10 = could sit in a premium brand's press kit with minor retouching.** These images also feed a real-time web view, where nothing can be retouched, so model and material faults count fully.
- **Method:** I viewed each render full-frame, then cut 2–6× crops of the dial, logo, hand stack, indices, lug inner faces, crown, strap and keepers, flanks, movement details, engraving and screws. I also measured luminance histograms and ran a pixel diff with a small .NET script. The crops stayed in the session scratchpad; nothing else was written to the project. **Pixel coordinates below refer to the 1800×1125 originals.**

## Verdict

**QC2 is not passed. No view reaches 8.**

- Best: 03 macro and 04 caseback, at 7.
- Weakest: 02 exploded and 07 black, at 5.5.

The asset is a good base. The case, bezel and dial proportions are right, the hand lengths are right, the dial print is crisp, the gear train is convincing, and AgX rolls off highlights without clipping.

Four recurring faults keep it reading as CG rather than photography:

1. The sunburst dial looks faceted.
2. The spring bars are exposed at the lugs.
3. The case is all mirror, with no brushed/polished contrast.
4. The lighting never puts a crisp white line on an edge.

The builder's self-scores (8–9 in BUILD_LOG §8) are 1.5–2.5 points above mine on every view.

## Scores

| View | Proportions | Material realism | Edge highlights | Part believability | Logo placement | Composition & lighting | **Overall** |
|---|---|---|---|---|---|---|---|
| 01 Hero ¾ | 7 | 6 | 6 | 5 | 7 | 6 | **6.5** |
| 02 Exploded | 7 | 6 | 7 | 5 | 5 | 5 | **5.5** |
| 03 Movement macro | 7 | 7 | 6 | 7 | N/A | 7 | **7** |
| 04 Engraved caseback | 7 | 7 | 8 | 7 | N/A | 6 | **7** |
| 05 Finish: steel | 7 | 6 | 6 | 5 | 7 | 6 | **6.5** |
| 06 Finish: gold | 7 | 6 | 6 | 5 | 6 | 6 | **6** |
| 07 Finish: black | 7 | 5 | 5 | 5 | 7 | 5 | **5.5** |

The overall score is a holistic judgement against the 8 = press-kit bar, not an average of the columns.

## Measurements

| Check | Result | What it means |
|---|---|---|
| 01 vs 05 pixel diff | 130 of 2,025,000 px differ, by at most 1 level | 05 is the hero again, so it adds nothing about the steel finish |
| Background share (01, 05, 06, 07) | ≈ 87% of pixels are #0A0A0B ± 2 | the watch covers ≈ 13% of the frame |
| Clipping (all views) | 0 px with all channels ≥ 254, except 24 px in 04 | AgX roll-off is clean; keep it |
| Specular whites, 01 hero | max L 252; only 29 px ≥ L 245 in the whole frame | no edge ever reaches white, so polished steel reads grey |
| 02 exploded | p99 = 116 (hero: 155) | the lower half of the stack is underexposed |
| 07 black | max L 239, p99.9 = 186 | darkest render, with the least separation from the background |
| 03 macro | median L 95, p25–p75 = 71–142, p99 = 199 | heavy on mid-greys, with no crisp glints |
| 04 medallion | p25–p75 = 121–143 | flat grey plate, so the letters carry all the contrast |
| Traceability | `render_log.txt` names `watch_v008.blend`; v009 (11:41) and v010 (11:42) were saved after the last render (11:41) | the renders judged here were not made from the final file; render round 2 from the final file |

## Shared problems (01, 05, 06, 07; several also affect 02 and 04)

The problems are in priority order. Each view's fix list below refers to these IDs.

**S1 — The sunburst breaks into hard-edged polygon wedges** (`dial`, `m_dial`, dial light panels).
- **Problem:** The dial highlight is a fan of straight-edged light and dark wedges. It is clearest from 2 to 5 o'clock, around x 880–1000, y 520–700. It reads as faceted geometry rather than radial brushing. This is the most visible CG tell, and it sits at the focal point.
- **Fix:** Light the dial's mirror direction with one large softbox whose emission falls to zero at its edges (use a gradient texture), instead of several hard rectangles. Lower `m_dial` anisotropy from 0.95 to about 0.75 and raise its roughness slightly, so the reflection becomes one soft bow-tie beam through the centre.
- **Check:** at 200%, no wedge edge is visible.

**S2 — Exposed spring bars, and a strap that does not fill the lugs** (`strap_a`, `strap_b`, `case_body`).
- **Problem:** At all four lug inner faces, the spring-bar ends show as bright pins. In 01 the top pair sits around y 323–337 and the bottom pair around y 775–808, at x ≈ 795–812 and 962–977. There is a visible 1–2 mm gap between the strap edge and the lug, with the bar exposed in it. In 07 the steel pins are brighter than the black lugs. A finished watch never shows the bar, and the web view cannot hide it with retouching.
- **Fix:**
  - Make the strap a full 20.0 mm wide for its first ~6 mm from the bar, and start the 20 → 18 mm taper after that.
  - Wrap the leather around the bar with a visible rounded fold.
  - Shorten the exposed part of the bar so nothing shows between strap and lug.
  - Add Ø ≈ 1.0 mm blind holes in the lug inner faces. BUILD_LOG §11 confirms there are none.

**S3 — No brushed/polished contrast** (`m_steel_brushed`, `m_steel_polished`, `case_body`).
- **Problem:** The spec calls for vertically brushed flanks and linearly brushed lug tops, against polished chamfers. In the renders, every steel surface reads mirror-polished. The 3 o'clock flank is a smooth chrome gradient with no grain. This contrast is the main luxury cue for a steel case.
- **Fix:** Raise `m_steel_brushed` roughness to ≈ 0.28–0.35, and strengthen `brushed_normal` so the grain is visible at hero distance. Keep the chamfers, bezel and crown cap at ≈ 0.03–0.05, so the polished lines read sharp against the satin.

**S4 — No crisp specular line on any edge** (light rig).
- **Problem:** The 0.5 mm chamfer and the bezel edges catch only soft grey light.
- **Fix:** Add one or two long, narrow, soft-edged strips (about 10:1) at the mirror angle of the lug-top chamfers and the bezel's outer edge. Make them bright enough that those lines reach L 245–255. A few clipped pixels on a chamfer are normal in press photography.

**S5 — Several indices read black** (`index_01…12`, the 46° light ring).
- **Problem:** The 8, 9 and 10 o'clock batons are black bars with only the end facet lit, and 2 and 3 o'clock are dim. 3 o'clock nearly vanishes.
- **Fix:** Add a large dim overhead card, or widen the 46° ring panels, so one long facet of every baton reflects mid-to-bright. Confirm the hip-roof ridge is flat-shaded (split normals), so the facet split is crisp.

**S6 — The crystal is invisible** (`crystal`, `m_sapphire`, a reflection card).
- **Problem:** The dial looks open to the air.
- **Fix:** Add one soft, low-intensity gradient reflection across the upper-left third of the crystal, with a faint blue-violet anti-reflective (AR) coating tint at its edge. Keep the dial legible. This is the standard press-kit cue for sapphire.

**S7 — Buckle and keepers** (`buckle`, `strap_a`).
- **Problem:** The buckle peeks out beside the crown at 3 o'clock (x ≈ 1163–1197, y ≈ 460–553) and crowds the crown's silhouette. The two keepers read as thick rubber blocks.
- **Fix:**
  - Rotate the strap loop 15–20° about watch X, or slide the buckle toward 6 o'clock behind the case, so it is hidden or clearly separated from the crown.
  - Thin the keepers to ≈ 1.2 mm leather, with rounded edges and the same grain and stitch as the strap.

**S8 — The crown reads like a cage** (`crown`).
- **Problem:** The 24 flutes are deep, flat-bottomed slots with thin ridges, visible in 01, 04 and 06.
- **Fix:** Make the flutes shallow (≈ 0.25 mm) and round-bottomed, with crisp ridges.

**S9 — No shadows under the hands and indices** (key light).
- **Problem:** Nothing shadows the dial, so it looks flat.
- **Fix:** Add a small, slightly harder key light, so `hand_hour`, `hand_minute` and the applied indices cast soft contact shadows.

**S10 — The frame is under-filled and centred** (hero camera).
- **Problem:** The watch sits dead centre and covers ≈ 13% of the frame. The web contract may need that negative space; a press still does not.
- **Fix:** Render a press crop (4:5 or 1:1, with the watch at ≈ 75% of frame height) alongside the contract camera, or move the watch onto a third.

**S11 — The logo crowds the 12 o'clock baton** (`logo_plate`, `m_logo`).
- **Problem:** The logo is centred and well sized, but the T-mark sits only ≈ 1 mm under the double baton, with far more air below the wordmark.
- **Fix:** Move the logo down ≈ 0.8–1.0 mm (centre y ≈ +7.7 mm instead of +8.6). Give `m_logo` a little gloss (roughness ≈ 0.25), so the print lifts off the dial.

**S12 — The lug tips are spindly** (`case_body`).
- **Problem:** The 2.5 mm tips read horn-like next to the full, rounded flank.
- **Fix:** Widen the tips to ≈ 3.2–3.5 mm, or slim the flank, so the lug tapers rather than pinches.

## Per-view notes and fixes

### 01 Hero ¾ — 6.5

**What works**
- Believable 41 mm proportions and a slim polished bezel.
- Crisp minute track.
- Hand lengths hit their targets: the hour hand reaches the inner index ends, and the minute and seconds hands reach the track.
- The champagne seconds hand is a good single accent.
- The leather grain and tone-on-tone stitching convince at 100%.
- Highlight roll-off is clean.

**What fails**
- S1: dial wedges.
- S2: spring bars at all four lugs.
- S3: the whole case reads as chrome.
- S4, S5, S6.
- S7: the buckle sits beside the crown.
- S10.

**Fixes, in priority order:** S1, S2, S3, S4, S5, S6, S7, S8, S10, S9, S11, S12.

### 02 Exploded — 5.5

**What works**
- The bezel, crystal, dial and case body are crisp and rim-lit, and the case chamfers draw clean lines.
- The crystal reads as real sapphire here.
- The parts are in correct relative scale.
- The loose strap ends correctly show their bars.

**What fails**
- The movement shows its plain dial side (BUILD_LOG §11 notes this). The bridges read as grey cut-outs and `mvmt_mainplate` as a featureless puck.
- The lower half (movement, caseback, gasket, screws, buckle) is near-black.
- The straps are flung far left and right in a lopsided bowl: the left strap sits low and the right one high, and together they take half the frame.
- The crown and tube float with no winding stem.
- `logo_plate` floats 4 mm above the dial and, from this camera, appears printed at the rim near 1 o'clock.
- The hour hand points away from the camera and hides behind its pipe.
- The jewels float as loose red dots.

**Fixes, in priority order**
1. **Show the decorated faces.** Shoot the movement sub-stack from below (elevation −20° to −30°), or flip it, so the Côtes de Genève, perlage, jewels and rotor graining face the lens.
2. **Light the lower stack.** Add a dedicated strip at the mirror angles of `caseback` and `rotor`, plus a rim light on the strap edges. The movement's peak brightness should match the bezel's.
3. **Add a winding stem** from `crown` into the movement. If the part count must stay at 45, model it inside `crown`, the way the spring bars live inside the straps.
4. **Straps:** hide them in this shot, or explode them only ≈ 15–20 mm along ±Y and open them out so they frame the stack symmetrically.
5. **Logo:** explode `logo_plate` with `dial` (same 15 mm). A printed logo does not lift off the dial.
6. **Hands:** pose them so all three blades are broadside to this camera, and spread `hand_hour`, `hand_minute` and `hand_seconds` further apart.
7. **Jewels:** keep the 8 `jewel_*` instances seated in their bridges, or no more than 1–2 mm proud of them.
8. **Mainplate:** if its dial side stays in shot, give `mvmt_mainplate` visible recesses, pillar holes and cut-outs for the keyless and motion works.
9. **Keepers and buckle:** apply S7 to the keepers, and give `buckle` a distinct bar where the strap wraps and a hinged tongue.

### 03 Movement macro — 7

**What works**
- Real gear teeth, crossings and pinions.
- A screw balance with timing screws.
- Polished chatons and domed slotted screws.
- Photographic depth of field and a strong diagonal.

**What fails**
- **Lighting:** flat, mid-grey lighting with no glints (p99 = 199).
- **Anglage:** the polished bevels on the bridges read dark grey.
- **Côtes de Genève:** they read as fine scratches with thin, drawn-looking seam lines, not as alternating bands.
- **Rubies:** they look like opaque maroon domes.
- **Jewel sinks:** each countersink shows 2–3 hard white bars, like UI tick marks.
- **Hairspring:** the coils show polygon kinks at 2.5× (only 40 segments per turn in `build_hairspring`).
- **Perlage:** faint, and closer to water ripples than overlapping spots.
- **Distraction:** a bright straight edge over a black slot cuts across the top-left third (x 0–310, y ≈ 190–260).

**Fixes, in priority order**
1. **Contrast.** Replace the broad fill with 2–3 narrow soft strips and black flags, so polished surfaces swing between near-black and bright. Target glints at L 240–250, with real shadow inside the train.
2. **Anglage.** Put a strip at the bevel's mirror angle on `mvmt_bridge_02` and `mvmt_bridge_03`, so the bevel reads as one continuous bright line around each bridge. This line is the signature of a finished movement.
3. **Côtes** (`cotes_normal`, `m_bridge`). Give each 2.5 mm band one consistent arc-grain direction, distinct from its neighbours, so the bands alternate light and dark under a strip light. Remove the seam lines, which come from normal discontinuities: a band boundary should be a change of reflection, not a drawn line.
4. **Rubies** (`m_ruby`, `jewel_*`). Use a lighter, more saturated red and transmission ≈ 0.9. Replace the dome with a flat top and a cupped olive around a tiny hole.
5. **Jewel sinks.** Use soft-edged lights, or roughness ≈ 0.06–0.08 on the countersinks, so they show a bright ring rather than white bars.
6. **Hairspring.** Raise `hairspring` to ≈ 120 segments per turn.
   - Optional: the balance cock is bare. Either add shock protection and a regulator index, or make a free-sprung design explicit with a stud carrier.
7. **Perlage** (`perlage_normal`, `m_plate`). Give each spot a stronger, directional circular grain, so overlapping spots alternate in brightness.
8. **Framing.** Re-aim the camera or crop to remove the top-left slit.

### 04 Engraved caseback — 7

**What works**
- The polished cup ring is the most convincing steel in the set.
- The ring steps and groove edges are crisp.
- The bilingual text is set correctly: the Arabic is joined, right-to-left, with no letter-spacing.
- The angle is dynamic and fills the frame.

**What fails**
- **Engraving:** the letters read as rounded "pillow" emboss, like chrome tubes, rather than a cut. Their floors have the same finish as the medallion.
- **Medallion:** a flat grey plate, with a bright pinch at its centre caused by the radial anisotropy.
- **Screws:** they sit on the sloped ring with no seats.
- **Framing:** the bottom frame edge cuts through the lower lugs, while the upper lugs almost touch the top.
- **Typesetting:** the Latin capitals are tightly set.
- **Distraction:** a hot reflection on the upper-right ring competes with the text.
- **Crown:** S8.

**Fixes, in priority order**
1. **Engraving** (`engraving_normal`, `engraving_rough`). Build the normal map from a sharp mask with a V or flat-bottomed profile: about 0.05–0.08 mm deep, crisp walls, very little blur. Give the floors their own finish, either frosted (roughness ≈ 0.45) or dark laser oxide, so the text reads through a change of finish and not only through edge shading. The live engraving is a signature feature, so this matters.
2. **Framing.** Pull back 8–10%, or reframe, so both lug pairs sit inside the frame. If you crop, crop cleanly at the case, never mid-lug.
3. **Screws** (`caseback_screw_01…04`). Cut flat spot-faces (counterbores) into the sloped ring and seat the heads flush.
4. **Medallion** (`m_engraving_area`). Blend the tangent field to isotropic within ≈ 1.5 mm of the centre to remove the pinch. Strengthen the circular grain slightly, so it reads under the strip light.
5. **Typesetting.** Track the Latin line +0.08–0.12 em. Keep the Arabic untracked.
6. **Hot spot.** Feather or move the panel that causes the hot spot on the upper-right ring.
7. **Crown.** Apply S8.

### 05 Finish: steel — 6.5

This render is pixel-identical to 01, so it takes the same scores and fixes (S1–S12). As a finish swatch it does not show the finish: the brushed/polished interplay is invisible at this distance.

**Fix:** after S3, either keep the shared framing for the series and add a tighter crop on the flank and lug where brushed meets polished, or tighten the series camera.

### 06 Finish: gold — 6

**What works**
- A warm champagne tone, not yellow.
- The cognac strap pairs well.
- The gold indices and hands are consistent with the case.

**What fails**
- The 3 o'clock flank is a broad, flat cream highlight, and the dark tones lack amber, so the case reads like gold paint rather than gold-tone metal.
- The silver logo print is cooler than the gold indices.
- Steel spring bars show against the gold (S2).
- The champagne seconds-hand accent nearly matches the case colour and loses its role (a minor point).
- All of S1–S12 also apply.

**Fixes, in priority order**
1. **Gold response.** Give the flank something dark to reflect: black flags at its mirror angle, so the gold runs from deep amber-brown to a pale highlight. If it still looks creamy, enrich the saturation slightly (lower blue by about 0.03–0.05 from 0.48) while keeping it champagne rather than yellow.
2. **Logo print.** On the gold variant, match `m_logo` to the applied metal with a warm gold print.
3. **Shared fixes:** S1, S2, S3, S4, S5, S6, S7, S8, S10, S9, S11, S12.

### 07 Finish: black — 5.5

**What works**
- The champagne seconds hand and the lume stay legible.
- The silver logo reads well.
- A thin line on the bezel rim separates it from the background.

**What fails**
- **Material:** the black PVD reads as glossy black plastic. F0 ≈ 0.05 is a dielectric (plastic or glass) value.
- **Separation:** the lugs, the case side and the strap dissolve into #0A0A0B.
- **Indices:** the black-PVD indices vanish into the graphite dial, leaving almost no readable hour markers.
- **Spring bars:** the bright steel bars stand out against the black lugs.

**Fixes, in priority order**
1. **Black material** (black variant of `m_steel_polished` and `m_steel_brushed`). Use metallic 1 with base colour ≈ linear 0.08–0.15, neutral to faintly warm graphite; real black PVD/DLC reflects roughly 8–15% at normal incidence. Keep the polished/satin split (roughness ≈ 0.12 / 0.32).
2. **Separation.** Add a kicker (rim) light from behind-left that traces the case side, lugs and strap edges. The 1.35× global boost (BUILD_LOG D19) lifted the dial, not the outline.
3. **Indices.** On the black variant, keep them polished steel or rhodium (finish `none`), or at least give each one a lit facet (S5).
4. **Shared fixes:** S2 first (the bars), then S3 (the satin/polished split matters even more on black), S1, S4, S6, S7, S8, S10, S9, S11, S12.

## Keep

- The case, bezel and dial proportions.
- The dial print and hand lengths.
- The logo's orientation and size.
- The AgX look, with no clipping.
- The leather grain and stitching.
- The quality of the gear-train teeth and crossings.
- The macro's depth of field.
- The polished caseback cup.
- The correct Arabic shaping.
- One camera shared across the finish series (good for the web finish switcher).

## Re-render checklist for QC2 round 2

- Render from the final `.blend`, and log its file name in `render_log.txt`.
- Hero: check 200% crops of all four lug inner faces (no bar visible), the dial (no wedge edges) and one lug chamfer (a white line is present).
- Report the number of pixels at or above L 245 on the steel views. Expect a few hundred on the chamfers and bezel, not 29.
- Black: the case outline reads on the left side, and every index is visible at 100%.
- Exploded: the decorated movement faces point toward the lens, the stem is present, and the lower stack is lit.
- Caseback: the letters read as cut into the metal at 100%, and both lug pairs are in frame.
- Steel finish: the brushed flank and polished chamfer are distinguishable at 100%.
