// gen-watch-tsx.mjs -- regenerate src/three/generated/WatchModel.tsx from public/models/watch.glb with gltfjsx
// (does not modify the GLB) and apply the small fixes needed for React 19 / R3F 9 / pnpm.
// Usage (project root): node scripts/gen-watch-tsx.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const GLB = 'public/models/watch.glb';
const OUT = 'src/three/generated/WatchModel.tsx';
const hash = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const before = hash(GLB);
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['gltfjsx', GLB, '--types', '--keepnames', '--keepgroups', '--meta', '--output', OUT],
  { stdio: 'inherit', shell: process.platform === 'win32' });
if (hash(GLB) !== before) throw new Error('gltfjsx modified the GLB!');
let s = readFileSync(OUT, 'utf8');
s = s.replace(/useGLTF(\.preload)?\('[^']*watch\.glb'\)/g, (m, p) => `useGLTF${p || ''}('/models/watch.glb')`);
s = s.replace("import { GLTF } from 'three-stdlib'", "import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'");
s = s.replace("import { useGLTF } from '@react-three/drei'", "import { useGLTF } from '@react-three/drei'\nimport type { ThreeElements } from '@react-three/fiber'");
s = s.replace('  animations: GLTFAction[]', '  animations: THREE.AnimationClip[]');
s = s.replace("export function Model(props: JSX.IntrinsicElements['group'])", "export function Model(props: ThreeElements['group'])");
s = s.replace("useGLTF('/models/watch.glb') as GLTFResult", "useGLTF('/models/watch.glb') as unknown as GLTFResult");
s = s.replace("import React from 'react'\n", '');
s = s.replace('*/\n', '*/\n// Post-processed by scripts/gen-watch-tsx.mjs (path, GLTF type import, ThreeElements props, cast).\n');
writeFileSync(OUT, s);
console.log(JSON.stringify({ out: OUT, bytes: statSync(OUT).size, glbUnchanged: true }));
