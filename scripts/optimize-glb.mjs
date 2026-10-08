// optimize-glb.mjs -- gltf-transform pipeline for the hero watch.
// Preserves node names, hierarchy, TRS pivots and extras (no join / flatten / merge / instance).
//
// Usage (project root):
//   node scripts/optimize-glb.mjs blender/export/watch_raw.glb public/models/watch.glb --profile desktop
//   node scripts/optimize-glb.mjs blender/export/watch_raw.glb public/models/watch-mobile.glb --profile mobile
// Options: --qpos  quantize POSITION to int16 with a *uniform node scale only* (translation/rotation untouched,
//                  pivots preserved). Adds KHR_mesh_quantization. Off by default.
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'node:fs';

const [, , inp, out, ...rest] = process.argv;
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const profile = opt('--profile', 'desktop');
const qpos = rest.includes('--qpos');
const targetTris = Number(opt('--tris', profile === 'mobile' ? 78000 : 0));

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder,
});
const doc = await io.read(inp);
const root = doc.getRoot();
const log = (...a) => console.log('[optimize]', ...a);

const triCount = () => root.listNodes().reduce((acc, n) => {
  const m = n.getMesh();
  if (!m) return acc;
  return acc + m.listPrimitives().reduce((a, p) => a + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0);
}, 0);
log('input', inp, statSync(inp).size, 'bytes,', triCount(), 'tris');

// 1. dedup (not materials -> names stay), prune (keep extras, leaves)
await doc.transform(
  dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE], keepUniqueNames: true }),
  prune({ keepLeaves: true, keepExtras: true, keepAttributes: false, keepIndices: false, keepSolidTextures: false }),
);

// 2. mobile: simplify with meshoptimizer (per mesh, names/extras untouched)
if (profile === 'mobile' && targetTris > 0) {
  await doc.transform(weld());
  // lockBorder: split-normal / UV seams are open borders after weld(); locking them prevents cracks.
  const errs = [0.0015, 0.003, 0.005, 0.008, 0.012, 0.02, 0.03, 0.05];
  for (let pass = 0; pass < errs.length; pass++) {
    const now = triCount();
    if (now <= targetTris) break;
    const r = Math.max(0.05, Math.min(1, (targetTris / now) * 0.97));
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: r, error: errs[pass], lockBorder: true }));
    log(`simplify pass ${pass}: ratio ${r.toFixed(3)} error ${errs[pass]} -> ${triCount()} tris`);
  }
}

// 3. textures -> WebP (resize per profile)
for (const tex of root.listTextures()) {
  tex.setName((tex.getName() || tex.getURI()).replace(/\.(png|jpg)$/i, ''));
}
// dial textures (polar 4096-wide) keep their width on desktop; everything else <= 1024 (mobile: 1024 / 512)
// (patterns need .+ : embedded images have an empty URI, which a negative lookahead alone would match)
const mob = profile === 'mobile';
await doc.transform(
  // subtle, low-amplitude normal maps (brushed, sunburst): lossless WebP -- lossy would erase the grooves
  textureCompress({ encoder: sharp, targetFormat: 'webp', lossless: true, pattern: /(brushed|sunburst).+/, resize: mob ? [1024, 1024] : [2048, 2048] }),
  // high-amplitude normal maps (perlage, cotes, leather, circular graining): high-quality lossy
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: mob ? 82 : 88, slots: /normalTexture/, pattern: /^(?!.*(brushed|sunburst)).+$/, resize: mob ? [512, 512] : [1024, 1024] }),
  // colour / metal-rough / alpha
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: mob ? 84 : 92, slots: /^(?!normalTexture).+$/, pattern: /dial.+/, resize: mob ? [2048, 2048] : [4096, 4096] }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: mob ? 80 : 88, slots: /^(?!normalTexture).+$/, pattern: /^(?!.*dial).+$/, resize: mob ? [512, 512] : [1024, 1024] }),
);
// 4. quantize normals / UVs only (no POSITION -> node transforms untouched)
await doc.transform(quantize({ pattern: /^(NORMAL|TEXCOORD_\d+)$/, quantizeNormal: 10, quantizeTexcoord: 12 }));

// 5. optional pivot-safe position quantization: uniform scale only, no offset
if (qpos) {
  doc.createExtension(KHRMeshQuantization).setRequired(true);
  for (const mesh of root.listMeshes()) {
    let s = 0;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const el = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, el); s = Math.max(s, Math.abs(el[0]), Math.abs(el[1]), Math.abs(el[2])); }
    }
    s = s * 1.0001 || 1;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const src = pos.getArray();
      const dst = new Int16Array(src.length);
      for (let i = 0; i < src.length; i++) dst[i] = Math.round((src[i] / s) * 32767);
      const acc = doc.createAccessor(pos.getName()).setType('VEC3').setArray(dst).setNormalized(true).setBuffer(pos.getBuffer());
      prim.setAttribute('POSITION', acc);
    }
    for (const parent of mesh.listParents()) {
      if (parent.propertyType !== PropertyType.NODE) continue;
      const sc = parent.getScale();
      parent.setScale([sc[0] * s, sc[1] * s, sc[2] * s]);
      parent.setExtras({ ...(parent.getExtras() || {}), dequant_scale: s });
    }
  }
  await doc.transform(prune({ propertyTypes: [PropertyType.ACCESSOR], keepExtras: true, keepLeaves: true }));
}

// 6. reorder for vertex cache + meshopt compression (filter mode: octahedral normals)
await doc.transform(reorder({ encoder: MeshoptEncoder, target: 'size' }));
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });

await io.write(out, doc);
log('output', out, statSync(out).size, 'bytes,', triCount(), 'tris, profile', profile, qpos ? '(qpos)' : '');
