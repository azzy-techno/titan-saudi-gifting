# BUILD_LOG — hero watch "TSG-01" (Blender 5.2)

Builder: 3D-artist subagent. Contract: `blender/WATCH_SPEC.md`, cameras: `config/cameras.json`.
Status: **complete** (model, textures, materials, finishes, GLBs, verify script, TSX, 7 QC2 renders).
Final file: `blender/watch_v010.blend` (versioned saves v001…v010 kept in `blender/`).

## 1. Deliverables
| What | Path | Notes |
|---|---|---|
| Final .blend | `blender/watch_v010.blend` | `TSG` (53 objects = 45 parts + 8 jewel instances) + `TSG_studio` (hero camera, 20 rig objects, world). Opens render-ready (Cycles, AgX). |
| Builder (source of truth) | `blender/scripts/build_watch.py` | Re-runnable; clears and rebuilds **only** the `TSG` collection. Run via MCP: `exec(open(r"D:\Titan - 3D - site\blender\scripts\build_watch.py", encoding="utf-8").read())` (~10 s). |
| Helper modules | `blender/scripts/tsg_geom.py`, `tsg_spec.py`, `tsg_textures.py`, `tsg_materials.py`, `tsg_parts_case.py`, `tsg_parts_dial.py`, `tsg_parts_movement.py`, `tsg_parts_strap.py`, `tsg_studio.py`, `tsg_preview.py` | geometry kernel / spec table / numpy textures / materials+finishes / parts / studio rigs / quick previews |
| Render / export / tools | `blender/scripts/render.py`, `render_qc2.sh`, `export.py`, `composite.mjs`, `engraving_mask.mjs`, `tonemap_compare.py`; tests in `blender/scripts/tests/` | |
| Raw export | `blender/export/watch_raw.glb` (15,411,360 B) | Blender exporter, +Y up, modifiers applied, extras on, no cameras/lights |
| Desktop GLB | `public/models/watch.glb` — **2,805,988 B (2.81 MB), 212,439 tris** | budget ≤ 3 MB / ≤ 250k ✔ |
| Mobile GLB | `public/models/watch-mobile.glb` — **1,166,660 B (1.17 MB), 76,549 tris** | budget ≤ 1.5 MB / ≤ 80k ✔ |
| Optimiser | `scripts/optimize-glb.mjs` | gltf-transform 4.5 (core/extensions/functions) + meshoptimizer + sharp |
| Verifier | `scripts/verify-glb.mjs` | names, 45 parts, extras, tris, materials, textures, size (output in §9) |
| React component | `src/three/generated/WatchModel.tsx` | gltfjsx 6.5.3 via `scripts/gen-watch-tsx.mjs` (GLB untouched, hash-checked) |
| QC2 renders | `qa/qc2/01-hero-three-quarter.png` … `07-finish-black.png` + `qa/qc2/render_log.txt` | 1800×1125, Cycles OptiX, composited on #0A0A0B |
| Textures | `blender/textures/*.png` (+ `fonts/` OFL subsets for the engraving mask) | numpy, procedural |
| HDRI | `blender/hdri/monochrome_studio_04_2k.hdr` | CC0, see §4 |
| WIP | `blender/wip/*.jpg` (692 KB total) | iteration history, tone-map comparison, verify outputs |

## 2. What was built (45 parts, exact names)
- **Case** — `case_body`: ONE watertight mesh: 2D signed-distance outline (Ø41 circle smooth-unioned with tapered lug quads, 20.2 mm strap gap subtracted with fillets) → marching squares → profile sweep (0.5 mm 45° polished chamfer with 0.07 mm micro-rounds, 2° flank draft, 0.36 mm bottom round) → CDT caps (with interior points) → lugs bent down / thinned by a C1 height function (lug-to-lug 48.0, tip 2.5 mm wide, ~3 mm thick at the tip). Inner revolve (rehaut cone in graphite, dial seat, movement holder, caseback seat) welded into the same mesh. Materials: brushed top/lug tops (grooves along Y) + vertically brushed flanks (anisotropic), polished chamfers/rounds. `bezel` (revolve, polished, concave sloped top, 2.18 mm visible), `crystal` (domed sapphire, apex +4.2, 1.6 mm thick, rounded edge proud of the bezel), `crown` (Ø6.0, 24 rounded flutes fading into the chamfers, domed cap), `crown_tube`, `caseback` (cup type: polished outer ring, groove, raised flat **Ø26 medallion**), `caseback_screw_01…04` (domed, slotted), `gasket` (O-ring).
- **Dial** — `dial` (polar-UV sunburst: radial-groove normal map + anisotropy + thin lacquer coat; minute track baked: 60 ticks, 5-minute ticks longer/wider, hairline ring, bone white), `index_01…12` (faceted hip-roof polished batons; 12 = double), `logo_plate` (alpha-masked decal from `brand/titan-logo.png`, 6.5 mm wide at y +8.6; logo converted only — not traced).
- **Hands** — `hand_hour` (10.5 mm) / `hand_minute` (15.2 mm): faceted lancets (0.22 mm facet ring), recessed cream lume insert, pipes. `hand_seconds`: 16.0 mm needle, 4 mm tail with ring counterweight, cap, champagne/brass lacquer (`m_accent`). Origins exactly on the centre axis; rest pose 12:00.
- **Movement** (illustrative automatic, 28,800 vph) — `mvmt_mainplate` (perlage, rim with balance cut-out, pillar), `mvmt_bridge_01` (3/4-plate barrel bridge with recessed 36-tooth ratchet + screws), `mvmt_bridge_02` (train bridge over C/T/F/E/P), `mvmt_bridge_03` (balance cock with foot, polished chaton, hairspring stud). Bridges: Côtes de Genève on the visible face, perlage underneath, polished anglage, polished countersinks round every jewel, domed slotted screws. `jewels` empty + 8 linked-duplicate ruby jewels. `barrel` (72 T), `wheel_center` (80 T, pinion 12), `wheel_third` (75 T, pinion 10), `wheel_fourth` (84 T, pinion 10), `wheel_escape` (20 club teeth, pinion 7) — ogival teeth with the spec modules (centre distances 5.88/5.40/4.675/4.095 exact), 4–5 tapered crossings, polished pinions + arbors with pivots, meshing pairs at the same Z with tooth/gap phases aligned. `pallet_fork` (lever with horns/notch, two ruby pallet stones touching the escape teeth), `balance_wheel` (gilt rim + 3 arms, 8 timing screws, staff, roller, ruby impulse pin), `hairspring` (12-turn flat spiral + terminal to the stud, collet), `rotor` (half-moon, openwork with straight spokes, heavy rim segment, bearing, gilt + circular graining).
- **Strap** — `strap_a` (12h, 64 mm to the buckle bar, two keepers, spring bar), `strap_b` (6h, ~104 mm, 7 holes (Exact boolean), rounded tail, spring bar): padded, domed sections, 20→18 mm taper, rounded edges, tone-on-tone slanted stitches, leather grain. **Closed buckled product-shot loop** (tail through the buckle frame and both keepers, tongue over a hole). `buckle`: original stirrup-shaped pin buckle (gently arched far side, chamfered frame, brushed top, tapered tongue).

### Triangles per part (desktop, total **212,439**)
case_body 22,870 · bezel 10,752 · crystal 7,296 · crown 8,640 · crown_tube 896 · caseback 11,520 · caseback_screw_01…04 4×1,950 · gasket 1,536 · dial 5,760 · index_01…11 11×32 · index_12 64 · logo_plate 2 · hand_hour 3,828 · hand_minute 4,261 · hand_seconds 4,857 · mvmt_mainplate 7,436 · mvmt_bridge_01 12,976 · mvmt_bridge_02 8,564 · mvmt_bridge_03 4,330 · jewels (8 instances) 3,200 · barrel 7,388 · wheel_center 9,496 · wheel_third 8,708 · wheel_fourth 8,986 · wheel_escape 4,078 · pallet_fork 2,996 · balance_wheel 4,544 · hairspring 4,004 · rotor 11,377 · strap_a 6,972 · strap_b 11,142 · buckle 5,808.

## 3. API checks (Blender 5.2.0 LTS, MCP doc search + live introspection)
- Principled BSDF 5.2 sockets: Base Color, Metallic, Roughness, IOR, Alpha, **Thin Wall (new bool)**, Normal, Weight, Diffuse Roughness, Subsurface *, Specular IOR Level, Specular Tint, Anisotropic, Anisotropic Rotation, Tangent, Transmission Weight, Coat Weight/Roughness/IOR/Tint/Normal, Sheen *, Emission Color/Strength, Thin Film Thickness/IOR. New materials come with a node tree (`use_nodes` not set). New `ShaderNodeMix` has duplicate socket names per type → sockets addressed by identifier (`A_Color`, `B_Color`, `Result_Color`).
- No auto-smooth: `Mesh.set_sharp_from_angle()`; `WeightedNormalModifier(mode, keep_sharp, weight)` applied via `BlendDataMeshes.new_from_object(evaluated, preserve_all_data_layers=True)` (custom normals survive); `BevelModifier.edge_weight` is now an attribute name. `bmesh.ops.weld_verts`, `mathutils.geometry.delaunay_2d_cdt`, `Image.save()`, `RenderSettings.film_transparent`, `Camera.sensor_fit/angle_y/shift_x`, `CameraDOFSettings.aperture_fstop` checked.
- glTF exporter options read from `bpy.ops.export_scene.gltf` (5.2): `collection=`, `export_extras`, `export_yup`, `export_apply`, `export_cameras/lights` (False), `export_image_format` (AUTO/JPEG/WEBP/NONE), `export_tangents`, `export_gpu_instances`, `export_hierarchy_flatten_objs` (False). `GLTF_EMBEDDED` format no longer exists (only `GLB` / `GLTF_SEPARATE`).
- **5.2 gotcha found**: a UV layer created by `bmesh.loops.layers.uv.verify()` is named **`Float2`**, so every Image/NormalMap/Tangent node bound to "UVMap" silently fell back (first renders had no dial print). Fixed: `new_bm()` creates "UVMap"; `finalize_mesh_object()` enforces it.
- **Cycles DOF gotcha**: with `scale_length = 0.001` Cycles does not scale the aperture → effective f-number must be entered ×0.001 (`aperture_fstop = 0.030` ≈ f/30 real at 1.45:1 macro).
- GPU: background renders use `--factory-startup`, runtime `compute_device_type='OPTIX'`, RTX 5060 Laptop GPU; preferences never saved; the interactive session's preference stayed 'NONE'. No Smart App Control block encountered (`os error 4551` never seen).

## 4. HDRI
**Monochrome Studio 04** by Grzegorz Wronkowski — Poly Haven — licence **CC0** — https://polyhaven.com/a/monochrome_studio_04 — file `https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/monochrome_studio_04_2k.hdr` → `blender/hdri/monochrome_studio_04_2k.hdr` (6.3 MB). Twin tall strip softboxes + scrim, dark ceiling. Monochrome Studio 03 was downloaded for comparison and deleted. Used dimmed (0.22) and rotated (hero 35°, macro 120°, caseback 200°). Nothing else was downloaded.

## 5. Decisions (with reasons) and deviations from WATCH_SPEC
| # | Decision | Reason |
|---|---|---|
| D1 | Geometry generated from 2D SDFs + marching squares + profile sweeps/revolves with SDF-projected bevel insets, CDT caps | crisp, controllable chamfers/anglage and clean shading; offsets never self-intersect at narrow lug tips or pointed hand tips |
| D2 | Case middle bottom moved to **−4.70** (spec stack: −5.40 suggested); the caseback is a **cup** (flange −4.70 → medallion −6.80) | 7.8 mm vertical flank looked too tall; total stays 11.0 mm |
| D3 | Lug tip 2.5 mm wide, outer root 14.2 mm, bezel outer r 19.50 / bore 17.32 (= crystal) | proportion tuning; 2.18 mm visible bezel |
| D4 | Strap configuration: **closed buckled loop** on an elliptical "wrist" (31 × 23 mm semi-axes), strap_b passes through buckle + keepers | open-C variants either popped the buckle into the hero frame or looked like a pretzel; the loop is the standard product-shot pose and keeps realistic lengths (strap_b ≈ 104 mm, 7 holes) |
| D5 | **Explode distances tuned** (spec allows): straps 34→**52**, caseback 48→52, screws 58→62, gasket 40→44, rotor 34→38, bridges 27→31, jewels 23→26.5, barrel/wheels/pallet 19→22, balance 21→24, hairspring 23→26 | with the buckled loop, strap_b's tail would sit inside the exploded caseback/rotor at 34 mm; the movement layers needed air to read in profile |
| D6 | `mvmt_bridge_01` is a 3/4-plate (covers the winding side) with 2 extra decorative jewels → 8 jewels total | otherwise half the movement was bare plate in the macro |
| D7 | Medallion UVs: planar, centred, 0..1 = Ø26 mm, **u = 0.5 − x/26, v = 0.5 + y/26** | text drawn upright into the texture reads correctly when the caseback is seen from behind with 12 o'clock up (web can draw unmirrored) |
| D8 | `m_dial_print` not created: minute track baked into `m_dial` base colour (+ metal/rough map: print non-metallic) | spec allows; one draw call, no z-fighting decal |
| D9 | Spring bars are inside `strap_a`/`strap_b` (material `m_movement_steel`), not separate parts | part list is fixed at 45 |
| D10 | Extra extra: `amplitude_deg = 270` on `balance_wheel` | convenience for the web oscillation |
| D11 | Origins: rotating parts on their arbor axes (hands at (0,0,z)); revolved parts (dial/crystal/bezel/gasket) at their own centre on the axis; `case_body` = watch origin (anchor) | spec §3 |
| D12 | Bridges' dial-side faces use `m_plate` (perlage) | Côtes on both faces produced a "quilted" look in the explode; perlaged undersides are what real bridges have |
| D13 | Buckle frame kept flat (tilted 5°) | bending it caused saw-tooth shading on the polished caps; over 10 mm the strap curve deviates only ~0.35 mm |
| D14 | No position quantisation in the GLB (float32 positions); normals 10-bit + UVs (in-range) quantised; `EXT_meshopt_compression` in FILTER mode (octahedral normals) | gltf-transform `quantize()` multiplies a dequantisation offset+scale into mesh-node matrices (`transformMeshParents`), which would move the pivots of hands/wheels. Verified: all node scales are 1 and translations equal the Blender origins |
| D15 | Mobile LOD = meshoptimizer `simplify` with `lockBorder:true`, error 0.0015→0.005 (3 passes) on the same scene graph | split-normal/UV seams are open borders after `weld()`; locking them prevents cracks (re-import checked visually) |
| D16 | Textures → WebP: brushed + sunburst normals **lossless** (lossy flattened them to ~420 B), perlage/Côtes/leather/graining normals lossy q88, colour q88–92; desktop ≤1024² (dial maps polar 4096×512 / normal 2048×128), mobile ≤512² | budget vs fidelity |
| D17 | No glTF tangents exported | three.js derives the TBN (and the anisotropy direction) from the normal-map UVs; saves ~2 MB |
| D18 | Camera "up" for cameras.json = watch +Y (not in the contract) | product orientation (12 o'clock up) |
| D19 | Black-PVD QC2 render lit 1.35× (same rig) | black products are always lit harder in real photography; framing identical |

## 6. Textures (numpy → `blender/textures/`)
`brushed_normal` (1024², periodic band-limited noise + sparse deep scratches), `dial_sunburst_normal` (4096×256 polar: fine radial grooves + visible streaks), `dial_basecolor` + `dial_metal_rough` (4096×512 polar, supersampled print), `perlage_normal` (overlapping spots, painter order, periodic), `cotes_normal` (2.5 mm bands of arc scratches + band tilt/step), `circular_grain_normal` (concentric, medallion + gilt wheels), `leather_normal` / `leather_rough` / `leather_tone` (Worley calf grain + creases + pores), `logo_alpha` (415×268, white + alpha from `brand/titan-logo.png`, cropped, no tracing). QC2-only: `engraving_mask` (sharp/Pango: Instrument Serif caps letter-spaced + Amiri Arabic (no letter-spacing), double hairline ring; OFL fonts subset to TTF with `subset-font` because Pango needs TTF), `engraving_normal`, `engraving_rough` (R = mask, G = roughness).

## 7. Materials (17, glTF-compatible Principled only)
`m_steel_polished`, `m_steel_brushed` (anisotropic 0.75 + normal), `m_engraving_area` (circular graining; web replaces maps), `m_sapphire` (transmission 1, IOR 1.77, rough 0), `m_dial` (polar textures, anisotropic 0.95, coat 0.25), `m_logo` (alpha mask via Math>0.5, champagne-silver metallic), `m_lume` (aged cream), `m_accent` (champagne/brass + coat), `m_ruby` (transmission 0.6, IOR 1.76), `m_rubber`, `m_plate` (rhodium + perlage), `m_bridge` (rhodium + Côtes), `m_gilt` (gold-tone + graining), `m_movement_steel`, `m_hairspring`, `m_leather` (tone × colour, rough map, normal, sheen 0.4), `m_stitch` (tone-on-tone, sheen).
**Finish variants** — `tsg_materials.apply_finish('steel'|'gold'|'black')` swaps base colour/roughness of `m_steel_polished`, `m_steel_brushed`, `m_engraving_area` (all `finish: case_metal` parts follow); `apply_strap('espresso'|'cognac'|'black')`. Gold = warm champagne (linear 0.90/0.70/0.48), black PVD = F0 ≈ 0.05, satin (rough 0.13 polished / 0.34 brushed).
**Anisotropy verdict: YES.** Blender 5.2's exporter writes `KHR_materials_anisotropy` (`anisotropyStrength`, `anisotropyRotation` in radians) — verified in exported JSON (`blender/scripts/tests/test_aniso_export.py`) and present in the final GLB on `m_steel_brushed` and `m_dial`; three.js r186 `GLTFLoader` supports it. Direction = UV tangent: case flanks u = circumference, lug/case tops u = +X, dial polar u = angle. (The medallion's circular anisotropy in render 04 uses a radial tangent — render-only, not exportable.) Other extensions in the GLB: clearcoat, ior, transmission, sheen, texture_webp, meshopt.

## 8. Renders (QC2)
Settings: Cycles 5.2, **GPU OptiX (RTX 5060 Laptop)**, 768 spp adaptive (threshold 0.006), OIDN (albedo+normal, accurate prefilter), bounces 16/glossy 10/transmission 14, caustics on, crystal shadow rays transparent (render-only Light Path mix), film transparent → composited onto exactly `#0A0A0B` with sharp (`composite.mjs`). 1800×1125 (16:10). Hands posed 10:10:35. Lighting: HDRI 0.22 + emissive soft-edged softboxes/strips (invisible to camera) placed from computed **mirror directions** per shot; a "donut" ring of panels 16° around the crystal's mirror direction lights the polished bezel without reflecting in the crystal; a 46° ring makes the faceted indices sparkle.
Tone mapping (same EXR through each transform, `blender/wip/tonemap_compare.jpg`, `tonemap_looks.jpg`): Standard clips bezel highlights to flat white; Filmic is flatter; Khronos PBR Neutral shifts the dial bluish and oversaturates the strap; **AgX** has the best highlight roll-off on polished steel; chosen look **"AgX – Medium High Contrast"** (deeper blacks, crisper steel, no clipping).
Times (s, from `qa/qc2/render_log.txt`): 01 hero 12.3 · 02 exploded 10.3 · 03 macro 41.0 (DOF) · 04 caseback 13.4 · 05 steel 12.2 · 06 gold 12.4 · 07 black 12.7.
Shots: 01/05–07 `hero_desktop_en` (position, target, fovV 24) at 16:10 with shiftK 0; 02 profile-ish 30° elevation from (+X,−Y), all parts offset by explode_axis × explode_distance in watch space; 03 caseback/gasket/rotor/straps hidden, 1.45:1 macro on balance + train, DOF; 04 straps hidden, engraving "WITH GRATITUDE · 25 YEARS" + "مع خالص الشكر والتقدير".

### Self-scores (honest, vs luxury product photography)
| Render | Score | One line |
|---|---|---|
| 01 hero | 8 | Polished bezel ring, faceted indices, sunburst with structure, believable 41 mm proportions; frame is small by contract and the crystal shows no reflection cue. |
| 02 exploded | 8 | Clean evenly spaced stack, rim-lit; movement layer is dark-ish because its decorated faces point away from this camera. |
| 03 macro | 9 | Real teeth/crossings/pinions, screw balance + hairspring, countersunk rubies, Côtes bands, perlage, photographic DOF. |
| 04 caseback | 8.5 | Correctly shaped bilingual engraving, circular graining, slotted screws, polished cup; medallion could carry a touch more sheen. |
| 05 steel | 8 | = 01 (finish series reference). |
| 06 gold | 8.5 | Warm champagne (not yellow) with cognac strap; consistent framing. |
| 07 black | 8 | Black PVD reads through soft graphite highlights; inherently low-key. |

## 9. verify-glb output
`node scripts/verify-glb.mjs public/models/watch.glb`
```
file            public/models/watch.glb
size            2805988 bytes (2.676 MB)
extensions      EXT_meshopt_compression, EXT_texture_webp, KHR_materials_anisotropy, KHR_materials_clearcoat, KHR_materials_ior, KHR_materials_sheen, KHR_materials_transmission
nodes           53: balance_wheel, barrel, bezel, buckle, case_body, caseback, caseback_screw_01, caseback_screw_02, caseback_screw_03, caseback_screw_04, crown, crown_tube, crystal, dial, gasket, hairspring, hand_hour, hand_minute, hand_seconds, index_01, index_02, index_03, index_04, index_05, index_06, index_07, index_08, index_09, index_10, index_11, index_12, jewel_01, jewel_02, jewel_03, jewel_04, jewel_05, jewel_06, jewel_07, jewel_08, jewels, logo_plate, mvmt_bridge_01, mvmt_bridge_02, mvmt_bridge_03, mvmt_mainplate, pallet_fork, rotor, strap_a, strap_b, wheel_center, wheel_escape, wheel_fourth, wheel_third
parts           45/45 found; missing: none
extras          all required extras present on all 45 parts
triangles       212439
materials (17)  m_gilt, m_movement_steel, m_ruby [KHR_materials_ior+KHR_materials_transmission], m_steel_polished, m_steel_brushed [KHR_materials_anisotropy], m_dial [KHR_materials_anisotropy+KHR_materials_clearcoat], m_engraving_area, m_sapphire [KHR_materials_ior+KHR_materials_transmission], m_rubber, m_hairspring, m_lume, m_accent [KHR_materials_clearcoat], m_logo, m_bridge, m_plate, m_leather [KHR_materials_sheen], m_stitch [KHR_materials_sheen]
textures (11)   circular_grain_normal image/webp 1024x1024 59592B; brushed_normal image/webp 1024x1024 57884B; dial_sunburst_normal image/webp 2048x128 135178B; dial_basecolor image/webp 4096x512 13216B; dial_metal_rough image/webp 4096x512 9556B; logo_alpha image/webp 415x268 3196B; cotes_normal image/webp 1024x1024 142690B; perlage_normal image/webp 1024x1024 124476B; leather_normal image/webp 1024x1024 172274B; leather_tone image/webp 1024x1024 45884B; leather_rough image/webp 1024x1024 80662B
```
Per-part lines (translation in glTF space, i.e. watch (x, y, z) → (x, z, −y); scale; extras) — full listing in `blender/wip/verify_watch.txt`; excerpt:
```
  hand_hour          t=[0,0.7,0] s=[1,1,1] axis=[0,0,1] d=25 o=11 g=hands f=case_metal en="Hour hand" ar="عقرب الساعات"
  hand_minute        t=[0,1.1,0] s=[1,1,1] axis=[0,0,1] d=29 o=11 g=hands f=case_metal en="Minute hand" ar="عقرب الدقائق"
  hand_seconds       t=[0,1.6,0] s=[1,1,1] axis=[0,0,1] d=33 o=11 g=hands f=none en="Seconds hand" ar="عقرب الثواني"
  barrel             t=[-2.94,-2.7,-5.092] s=[1,1,1] axis=[0,0,-1] d=22 o=7 g=movement f=none en="Mainspring barrel" ar="برميل النابض" spin_rate=0.16666666666666666 teeth=72 pinion=0
  wheel_center       t=[0,-1.75,0] s=[1,1,1] axis=[0,0,-1] d=22 o=7 ... spin_rate=-1 teeth=80 pinion=12
  wheel_third        t=[4.423,-2.15,3.097] ... spin_rate=8 teeth=75 pinion=10
  wheel_fourth       t=[2.824,-2.55,7.49] ... spin_rate=-60 teeth=84 pinion=10
  wheel_escape       t=[-1.131,-2.93,6.431] ... spin_rate=720 teeth=20 pinion=7
  pallet_fork        t=[-3.931,-2.93,6.431] ... oscillate_deg=10
  balance_wheel      t=[-7.931,-3.275,6.431] ... balance_hz=4 amplitude_deg=270
  jewels             t=[0.307,-3.868,1.391] ... children=8
  dial               t=[0,-0.2,0] · crystal t=[0,3.2,0] · bezel t=[0,2.895,0] · gasket t=[0,-4.53,0] · case_body t=[0,0,0] axis=[0,0,0] d=0 o=0
```
`node scripts/verify-glb.mjs public/models/watch-mobile.glb`
```
file            public/models/watch-mobile.glb
size            1166660 bytes (1.113 MB)
extensions      EXT_meshopt_compression, EXT_texture_webp, KHR_materials_anisotropy, KHR_materials_clearcoat, KHR_materials_ior, KHR_materials_sheen, KHR_materials_transmission
nodes           53: (same 53 names as desktop)
parts           45/45 found; missing: none
extras          all required extras present on all 45 parts
triangles       76549
materials (17)  (same 17 as desktop)
textures (11)   circular_grain_normal 512x512 2978B; brushed_normal 1024x1024 57884B; dial_sunburst_normal 1024x64 33838B; dial_basecolor 2048x256 5146B; dial_metal_rough 2048x256 3854B; logo_alpha 415x268 3196B; cotes_normal 512x512 18860B; perlage_normal 512x512 15030B; leather_normal 512x512 40070B; leather_tone 512x512 16750B; leather_rough 512x512 25230B
```
(full listing: `blender/wip/verify_watch_mobile.txt`; translations/extras identical to desktop.)

## 10. Notes for web integration
- Units mm; GLB is +Y up: watch +Z (dial normal) = glTF +Y, watch +Y (12h) = glTF −Z. `explode_axis` is in **watch space** (convert: (x, y, z) → (x, z, −y)); explode = translation += axis × distance (scale 1 everywhere).
- Hands/wheels rotate about their local glTF **Y** (= watch Z). Rest pose 12:00. `spin_rate` rev/h, + = CCW from the dial side.
- Multi-material parts are groups of sub-meshes in the TSX (e.g. `case_body_1..3`). Finish swap = change `m_steel_polished`, `m_steel_brushed`, `m_engraving_area` (+ `m_leather`/`m_stitch` for straps).
- Medallion UVs: square 0..1 = Ø26 mm, u mirrored (§5 D7). Dial: polar UV (u = angle from +X CCW, v = radius 0.55→16.8 mm).
- gltfjsx: `scripts/gen-watch-tsx.mjs` runs `gltfjsx public/models/watch.glb --types --keepnames --keepgroups --meta` and applies 5 small fixes (asset path `/models/watch.glb`, `GLTF` type from `three/examples/jsm/loaders/GLTFLoader.js` since `three-stdlib` is not a direct dependency, `ThreeElements['group']` props (React 19 has no global JSX), `animations: THREE.AnimationClip[]`, `as unknown as GLTFResult`). Strict standalone `tsc` passes.

## 11. Not done / known weaknesses
- Movement is illustrative: true gear ratios/tooth counts, but escapement geometry (lift/lock angles, fork/roller engagement) is visual only; no keyless works/winding train.
- No spring-bar holes in the lugs; caseback screws sit on the sloped ring (no counterbores).
- Crystal: no AR-coating tint and no visible reflection cue in the hero (a faint glass-streak panel exists in the rig but barely registers).
- Sunburst highlight shows soft wedges (rectangular softboxes stretched by the anisotropy) — realistic but not a single smooth beam.
- Exploded view shows the movement's dial-side faces (decorated faces point −Z); the macro covers the decoration.
- Web: fine normal-map grooves will be mip-filtered; brushed/sunburst look relies on KHR anisotropy. Engraving in render 04 uses a render-only material (radial anisotropy + mask maps) — the GLB keeps the plain medallion material.
- Mobile LOD keeps the same 53 nodes; with borders locked some thin parts (stitches, hairspring) stay relatively dense while large plates simplify more.
- Strap is a closed loop: in the exploded state strap_b's tail separates from the buckle (expected).

## 12. Reproduce
```
# model (inside Blender via MCP)      exec(open(r"D:\Titan - 3D - site\blender\scripts\build_watch.py", encoding="utf-8").read())
# export (inside Blender)             exec(open(r"D:\Titan - 3D - site\blender\scripts\export.py", encoding="utf-8").read())
node scripts/optimize-glb.mjs blender/export/watch_raw.glb public/models/watch.glb --profile desktop
node scripts/optimize-glb.mjs blender/export/watch_raw.glb public/models/watch-mobile.glb --profile mobile
node scripts/verify-glb.mjs public/models/watch.glb && node scripts/verify-glb.mjs public/models/watch-mobile.glb
node scripts/gen-watch-tsx.mjs
node blender/scripts/engraving_mask.mjs                 # then tsg_textures.engraving_maps() in Blender
bash blender/scripts/render_qc2.sh blender/watch_v010.blend 768 1800x1125   # (07 was re-rendered with --light 1.35)
```

## Progress log (chronological)
- 2026-10-08 Read CLAUDE.md, BRIEF.md (§7, §9), WATCH_SPEC.md, cameras.json; Blender MCP connected (5.2.0 LTS, Python 3.13, numpy 2.3.4).
- API checks; HDRI chosen + downloaded; anisotropy export test (YES); gltf-transform quantize pivot issue found (no position quantisation).
- Geometry kernel + case/dial/movement/strap modules; first full build (v002); UV `Float2` bug fixed (v003); triangle trims; export/optimise/verify/TSX pipeline (v004).
- Lighting from computed mirror directions; dial F0 fix; sunburst streaks; bezel ring lights; strap reworked to a buckled loop (v005); engraving mask (sharp/Pango) + medallion UV mirroring + explode-distance tuning (v006–v007); AgX look test; buckle shading fix (v008); perlaged bridge undersides (v009); part origins recentred, final export (v010).
- QC2 renders 01–07 final (v008/v009 geometry = v010 world geometry).
