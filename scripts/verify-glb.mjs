// verify-glb.mjs -- checks a watch GLB against blender/WATCH_SPEC.md (names, extras, budgets).
// Usage (project root): node scripts/verify-glb.mjs public/models/watch.glb [--json] [--quiet]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { statSync } from 'node:fs';

const file = process.argv[2];
const asJson = process.argv.includes('--json');
const quiet = process.argv.includes('--quiet');
if (!file) {
  console.error('usage: node scripts/verify-glb.mjs <file.glb>');
  process.exit(2);
}

const PARTS = [
  'strap_a', 'strap_b', 'buckle',
  'caseback_screw_01', 'caseback_screw_02', 'caseback_screw_03', 'caseback_screw_04',
  'caseback', 'gasket', 'crown', 'crown_tube', 'rotor',
  'mvmt_bridge_01', 'mvmt_bridge_02', 'mvmt_bridge_03', 'jewels', 'barrel',
  'wheel_center', 'wheel_third', 'wheel_fourth', 'wheel_escape', 'pallet_fork', 'balance_wheel', 'hairspring',
  'mvmt_mainplate', 'dial',
  ...Array.from({ length: 12 }, (_, i) => `index_${String(i + 1).padStart(2, '0')}`),
  'logo_plate', 'hand_hour', 'hand_minute', 'hand_seconds', 'crystal', 'bezel', 'case_body',
];
const REQUIRED_EXTRAS = ['explode_axis', 'explode_distance', 'explode_order', 'label_en', 'label_ar', 'group', 'finish'];
const WHEELS = ['barrel', 'wheel_center', 'wheel_third', 'wheel_fourth', 'wheel_escape'];

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(file);
const root = doc.getRoot();

function primTris(prim) {
  const mode = prim.getMode();
  const idx = prim.getIndices();
  const n = idx ? idx.getCount() : prim.getAttribute('POSITION').getCount();
  if (mode === 4) return n / 3; // TRIANGLES
  if (mode === 5 || mode === 6) return Math.max(n - 2, 0);
  return 0;
}

const nodes = root.listNodes();
const byName = new Map(nodes.map((n) => [n.getName(), n]));
let tris = 0;
const perNode = {};
for (const n of nodes) {
  const m = n.getMesh();
  if (!m) continue;
  const t = m.listPrimitives().reduce((a, p) => a + primTris(p), 0);
  perNode[n.getName()] = t;
  tris += t;
}

const parts = PARTS.map((name) => {
  const n = byName.get(name);
  if (!n) return { name, found: false };
  const ex = n.getExtras() || {};
  const missing = REQUIRED_EXTRAS.filter((k) => !(k in ex));
  if (WHEELS.includes(name)) for (const k of ['spin_rate', 'teeth', 'pinion']) if (!(k in ex)) missing.push(k);
  if (name === 'balance_wheel' && !('balance_hz' in ex)) missing.push('balance_hz');
  if (name === 'pallet_fork' && !('oscillate_deg' in ex)) missing.push('oscillate_deg');
  return {
    name, found: true, translation: n.getTranslation().map((v) => +v.toFixed(3)),
    scale: n.getScale().map((v) => +v.toFixed(4)), children: n.listChildren().map((c) => c.getName()),
    extras: ex, missingExtras: missing,
  };
});

const materials = root.listMaterials().map((m) => ({
  name: m.getName(),
  extensions: m.listExtensions().map((e) => e.extensionName),
  alphaMode: m.getAlphaMode(),
  doubleSided: m.getDoubleSided(),
}));
const textures = root.listTextures().map((t) => ({ name: t.getName() || t.getURI(), mime: t.getMimeType(), size: t.getSize(), bytes: t.getImage()?.byteLength }));
const report = {
  file,
  bytes: statSync(file).size,
  megabytes: +(statSync(file).size / 1048576).toFixed(3),
  extensionsUsed: root.listExtensionsUsed().map((e) => e.extensionName),
  nodeCount: nodes.length,
  nodeNames: nodes.map((n) => n.getName()),
  partsExpected: PARTS.length,
  partsFound: parts.filter((p) => p.found).length,
  partsMissing: parts.filter((p) => !p.found).map((p) => p.name),
  partsWithMissingExtras: parts.filter((p) => p.found && p.missingExtras.length).map((p) => `${p.name}: ${p.missingExtras.join(',')}`),
  triangles: tris,
  materials,
  textures,
  perNodeTriangles: perNode,
  parts,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 1));
} else {
  console.log(`file            ${report.file}`);
  console.log(`size            ${report.bytes} bytes (${report.megabytes} MB)`);
  console.log(`extensions      ${report.extensionsUsed.join(', ') || '-'}`);
  console.log(`nodes           ${report.nodeCount}: ${report.nodeNames.join(', ')}`);
  console.log(`parts           ${report.partsFound}/${report.partsExpected} found; missing: ${report.partsMissing.join(', ') || 'none'}`);
  console.log(`extras          ${report.partsWithMissingExtras.length ? 'MISSING -> ' + report.partsWithMissingExtras.join(' | ') : 'all required extras present on all 45 parts'}`);
  console.log(`triangles       ${report.triangles}`);
  console.log(`materials (${materials.length})  ${materials.map((m) => m.name + (m.extensions.length ? ' [' + m.extensions.join('+') + ']' : '')).join(', ')}`);
  console.log(`textures (${textures.length})   ${textures.map((t) => `${t.name} ${t.mime} ${t.size?.join('x')} ${t.bytes}B`).join('; ')}`);
  if (!quiet) {
    console.log('extras per part:');
    for (const p of parts) {
      if (!p.found) { console.log(`  ${p.name}: MISSING`); continue; }
      const e = p.extras;
      const extra = Object.keys(e).filter((k) => !REQUIRED_EXTRAS.includes(k)).map((k) => `${k}=${JSON.stringify(e[k])}`).join(' ');
      console.log(`  ${p.name.padEnd(18)} t=${JSON.stringify(p.translation)} s=${JSON.stringify(p.scale)} axis=${JSON.stringify(e.explode_axis)} d=${e.explode_distance} o=${e.explode_order} g=${e.group} f=${e.finish} en="${e.label_en}" ar="${e.label_ar}" ${extra}${p.children.length ? ' children=' + p.children.length : ''}`);
    }
  }
}
