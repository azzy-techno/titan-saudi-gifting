import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PART_SPECS, type PartSpec } from './watchConfig'

/**
 * Primitive placeholder watch (QC1 grey-box). Same 45 part names + extras as the Blender GLB,
 * built directly in WATCH space (mm). Lets pacing be validated before the real asset exists.
 */
const TAU = Math.PI * 2

function cyl(r: number, h: number, seg = 48, rTop = r) {
  // Cylinder along +Z (three's CylinderGeometry is along Y)
  const g = new THREE.CylinderGeometry(rTop, r, h, seg)
  g.rotateX(Math.PI / 2)
  return g
}

function ring(rIn: number, rOut: number, h: number, seg = 72) {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, rOut, 0, TAU, false)
  const hole = new THREE.Path()
  hole.absarc(0, 0, rIn, 0, TAU, true)
  shape.holes.push(hole)
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: seg })
  g.translate(0, 0, -h / 2)
  return g
}

/** non-indexed copy (no-op if already non-indexed) */
const ni = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g)

function box(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d)
}

function gear(r: number, teeth: number, h: number) {
  const shape = new THREE.Shape()
  const tooth = (TAU / teeth) * 0.5
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * TAU
    const rr = r * 0.94
    const pts: [number, number][] = [
      [Math.cos(a0) * rr, Math.sin(a0) * rr],
      [Math.cos(a0 + tooth * 0.2) * r, Math.sin(a0 + tooth * 0.2) * r],
      [Math.cos(a0 + tooth * 0.8) * r, Math.sin(a0 + tooth * 0.8) * r],
      [Math.cos(a0 + tooth) * rr, Math.sin(a0 + tooth) * rr],
      [Math.cos(a0 + tooth * 2) * rr, Math.sin(a0 + tooth * 2) * rr],
    ]
    pts.forEach(([x, y], k) => (i === 0 && k === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
  }
  const hole = new THREE.Path()
  hole.absarc(0, 0, r * 0.68, 0, TAU, true)
  shape.holes.push(hole)
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 8 })
  g.translate(0, 0, -h / 2)
  // crossings (4 spokes) + hub
  const spokes: THREE.BufferGeometry[] = [g]
  for (let k = 0; k < 4; k++) {
    const s = box(r * 1.36, r * 0.12, h)
    s.rotateZ((k * Math.PI) / 4 + Math.PI / 8)
    spokes.push(s)
  }
  spokes.push(cyl(r * 0.18, h * 3, 16))
  return mergeGeometries(spokes.map(ni)) ?? g
}

interface Mats {
  metal: THREE.MeshStandardMaterial
  dial: THREE.MeshStandardMaterial
  plate: THREE.MeshStandardMaterial
  gilt: THREE.MeshStandardMaterial
  ruby: THREE.MeshStandardMaterial
  strap: THREE.MeshStandardMaterial
  crystal: THREE.MeshPhysicalMaterial
  rubber: THREE.MeshStandardMaterial
  accent: THREE.MeshStandardMaterial
  logo: THREE.MeshBasicMaterial
  engraving: THREE.MeshStandardMaterial
}

function materials(): Mats {
  return {
    metal: new THREE.MeshStandardMaterial({ name: 'm_steel_polished', color: '#c9cbcc', metalness: 1, roughness: 0.22 }),
    dial: new THREE.MeshStandardMaterial({ name: 'm_dial', color: '#26272a', metalness: 0.6, roughness: 0.35 }),
    plate: new THREE.MeshStandardMaterial({ name: 'm_plate', color: '#b9bcbf', metalness: 1, roughness: 0.38 }),
    gilt: new THREE.MeshStandardMaterial({ name: 'm_gilt', color: '#c9a66a', metalness: 1, roughness: 0.3 }),
    ruby: new THREE.MeshStandardMaterial({ name: 'm_ruby', color: '#8e1022', metalness: 0, roughness: 0.15 }),
    strap: new THREE.MeshStandardMaterial({ name: 'm_leather', color: '#141414', metalness: 0, roughness: 0.62 }),
    crystal: new THREE.MeshPhysicalMaterial({
      name: 'm_sapphire',
      color: '#ffffff',
      metalness: 0,
      roughness: 0.02,
      transparent: true,
      opacity: 0.18,
      ior: 1.77,
    }),
    rubber: new THREE.MeshStandardMaterial({ name: 'm_rubber', color: '#0d0d0d', roughness: 0.7 }),
    accent: new THREE.MeshStandardMaterial({ name: 'm_accent', color: '#c4a46f', metalness: 0.8, roughness: 0.3 }),
    logo: new THREE.MeshBasicMaterial({ name: 'm_logo', color: '#d9d4cc' }),
    engraving: new THREE.MeshStandardMaterial({ name: 'm_engraving_area', color: '#c9cbcc', metalness: 1, roughness: 0.3 }),
  }
}

function place(geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number]) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(...pos)
  return m
}

/** Build the grey-box watch. Returns a group in watch space with 45 named parts (userData = extras). */
export function buildGreyboxWatch(): THREE.Group {
  const M = materials()
  const root = new THREE.Group()
  root.name = 'TSG_greybox'
  const specs = new Map<string, PartSpec>(PART_SPECS.map((s) => [s.name, s]))
  const add = (obj: THREE.Object3D, name: string) => {
    obj.name = name
    const s = specs.get(name)
    if (s) {
      obj.userData = {
        explode_axis: s.axis,
        explode_distance: s.distance,
        explode_order: s.order,
        label_en: s.labelEn,
        label_ar: s.labelAr,
        group: s.group,
        finish: s.finish,
        spin_rate: s.spinRate,
        balance_hz: s.balanceHz,
        oscillate_deg: s.oscillateDeg,
      }
    }
    root.add(obj)
  }

  // ── Case ──
  const lugs: THREE.BufferGeometry[] = []
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const l = box(3.4, 8, 5.2)
      l.rotateX(sy * 0.22)
      l.translate(sx * 8.6, sy * 20, -1.6)
      lugs.push(ni(l))
    }
  }
  const caseGeo = mergeGeometries([ring(17.1, 20.5, 8.2, 72), ...lugs].map(ni))
  add(place(caseGeo ?? cyl(20.5, 8.2), M.metal, [0, 0, -1.2]), 'case_body')
  add(place(ring(17.4, 20.6, 1.0), M.metal, [0, 0, 3.4]), 'bezel')
  add(place(cyl(17.3, 1.4, 64), M.crystal, [0, 0, 3.6]), 'crystal')
  const gasket = new THREE.Mesh(new THREE.TorusGeometry(18, 0.4, 8, 64), M.rubber)
  gasket.position.set(0, 0, -5.4)
  add(gasket, 'gasket')
  add(place(cyl(18.6, 1.4, 64), M.engraving, [0, 0, -6.1]), 'caseback')
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2
    add(place(cyl(0.9, 0.6, 12), M.metal, [Math.cos(a) * 17, Math.sin(a) * 17, -6.95]), `caseback_screw_0${i + 1}`)
  }
  const crown = place(cyl(3, 3.2, 24), M.metal, [22.4, 0, -1.2])
  crown.rotation.y = Math.PI / 2
  add(crown, 'crown')
  const tube = place(cyl(1.6, 1.8, 16), M.metal, [20.6, 0, -1.2])
  tube.rotation.y = Math.PI / 2
  add(tube, 'crown_tube')

  // ── Dial ──
  add(place(cyl(16.8, 0.4, 64), M.dial, [0, 0, -0.2]), 'dial')
  for (let i = 0; i < 12; i++) {
    const hour = i + 1
    const a = Math.PI / 2 - (hour / 12) * TAU
    const geo = hour === 12 ? mergeGeometries([box(0.8, 3.6, 0.5).translate(-0.7, 0, 0), box(0.8, 3.6, 0.5).translate(0.7, 0, 0)]) : box(0.9, 3.2, 0.5)
    const m = place(geo ?? box(0.9, 3.2, 0.5), M.metal, [Math.cos(a) * 13.9, Math.sin(a) * 13.9, 0.25])
    m.rotation.z = a - Math.PI / 2
    add(m, `index_${String(hour).padStart(2, '0')}`)
  }
  add(place(new THREE.PlaneGeometry(6.5, 1.6), M.logo, [0, 8.6, 0.02]), 'logo_plate')

  // ── Hands (origin on the centre axis; geometry extends towards +Y = 12 o'clock) ──
  const handGeo = (w: number, len: number, tail: number, t: number) => box(w, len + tail, t).translate(0, (len - tail) / 2, 0)
  add(place(handGeo(1.7, 10.5, 2, 0.3), M.metal, [0, 0, 0.7]), 'hand_hour')
  add(place(handGeo(1.2, 15.2, 2.4, 0.3), M.metal, [0, 0, 1.1]), 'hand_minute')
  add(place(handGeo(0.32, 16, 4, 0.2), M.accent, [0, 0, 1.6]), 'hand_seconds')

  // ── Movement (viewed from the back = −Z side) ──
  add(place(cyl(14.5, 1.0, 64), M.plate, [0, 0, -1.4]), 'mvmt_mainplate')
  add(place(gear(5.04, 72, 1.6), M.gilt, [-4.16, 4.16, -2.7]), 'barrel')
  add(place(gear(4.8, 80, 0.3), M.gilt, [0, 0, -2.3]), 'wheel_center')
  add(place(gear(4.125, 75, 0.3), M.gilt, [4.68, -2.7, -2.6]), 'wheel_third')
  add(place(gear(3.78, 84, 0.3), M.gilt, [3.87, -7.3, -2.9]), 'wheel_fourth')
  add(place(gear(2.3, 20, 0.3), M.gilt, [0.02, -8.7, -3.1]), 'wheel_escape')
  const fork = place(box(4.2, 0.7, 0.3), M.plate, [-2.8, -9.73, -3.1])
  fork.rotation.z = 0.35
  add(fork, 'pallet_fork')
  const balance = place(ring(3.7, 4.3, 0.5, 48), M.gilt, [-6, -7.4, -3.3])
  add(balance, 'balance_wheel')
  add(place(ring(0.6, 3.2, 0.08, 32), M.plate, [-6, -7.4, -3.7]), 'hairspring')
  const bridge = (w: number, h: number, pos: [number, number, number], rot: number, name: string) => {
    const b = place(box(w, h, 0.8), M.plate, pos)
    b.rotation.z = rot
    add(b, name)
  }
  bridge(12, 7, [-4.4, 4.4, -3.9], -0.785, 'mvmt_bridge_01')
  bridge(14, 5, [3.2, -5.4, -3.9], 0.9, 'mvmt_bridge_02')
  bridge(9, 3.2, [-7.6, -5.2, -4.0], -0.5, 'mvmt_bridge_03')
  const jewels = new THREE.Group()
  const jewelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12).rotateX(Math.PI / 2)
  ;[
    [0, 0],
    [4.68, -2.7],
    [3.87, -7.3],
    [0.02, -8.7],
    [-2.8, -9.73],
    [-6, -7.4],
    [-4.16, 4.16],
  ].forEach(([x, y], i) => {
    const j = new THREE.Mesh(jewelGeo, M.ruby)
    j.position.set(x ?? 0, y ?? 0, -4.35 + 2.0)
    j.name = `jewel_${String(i + 1).padStart(2, '0')}`
    jewels.add(j)
  })
  jewels.position.set(0, 0, -2.0)
  add(jewels, 'jewels')
  const rotorShape = new THREE.Shape()
  rotorShape.absarc(0, 0, 14, Math.PI * 1.05, Math.PI * 1.95, false)
  rotorShape.absarc(0, 0, 2, Math.PI * 1.95, Math.PI * 1.05, true)
  const rotorGeo = new THREE.ExtrudeGeometry(rotorShape, { depth: 0.5, bevelEnabled: false, curveSegments: 48 })
  rotorGeo.translate(0, 0, -0.25)
  add(place(rotorGeo, M.gilt, [0, 0, -4.8]), 'rotor')

  // ── Strap ──
  const strapGeo = (len: number) => box(20, len, 3).translate(0, len / 2, 0)
  const sa = place(strapGeo(70), M.strap, [0, 24, -2.6])
  sa.rotation.x = -0.62
  add(sa, 'strap_a')
  const sb = place(strapGeo(90), M.strap, [0, -24, -2.6])
  sb.rotation.x = Math.PI + 0.62
  add(sb, 'strap_b')
  add(place(ring(7.5, 9.5, 2.4, 32), M.metal, [0, 70, -42]), 'buckle')

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = false
      o.receiveShadow = false
    }
  })
  return root
}
