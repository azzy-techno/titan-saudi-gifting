'use client'

import { use, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { loadWatchGLB } from './loadModel'
import { setLoadPart } from './loadProgress'
import { frame, useExperience, type Finish } from '@/lib/store'
import { riyadhTime, handAngles } from '@/lib/time'
import { clamp01, damp, expoOut, lerp } from '@/lib/motion'
import { buildGreyboxWatch } from './greybox'
import { anchors, computeSceneState, sceneState } from './choreography'
import { DIALS, FINISHES, MAX_ORDER, STAGE_LABEL_PARTS, STRAPS } from './watchConfig'
import { patchDial, patchEngraving, patchSweep, dialUniforms, engravingUniforms, sweepUniforms } from './materials/patches'
import { createEngravingCanvas, loadEngravingFonts } from './engraving'
import { projected } from './labels'

import { MODEL_URL, MODEL_URL_MOBILE } from './modelUrls'

interface PartRuntime {
  name: string
  obj: THREE.Object3D
  basePos: THREE.Vector3
  baseQuat: THREE.Quaternion
  axis: THREE.Vector3
  distance: number
  order: number
  group: string
  spinRate: number
  balanceHz: number
  oscillateDeg: number
}

const TAU = Math.PI * 2
const MOVEMENT_PLATE_DISTANCE = 13
const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _zAxis = new THREE.Vector3(0, 0, 1)
const _e = new THREE.Euler()
const _qFlatBlend = new THREE.Quaternion()
/** Flat pose for phones: rotate 12 o'clock to −X, then lay the dial facing up (+Y). */
const Q_FLAT = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2))
const ANCHOR_PARTS = ['mvmt_mainplate', 'wheel_fourth', 'wheel_escape', 'balance_wheel'] as const
/** Where the back parts go during the movement dive (watch space): far side and behind. */
const CLEAR_DIR = new THREE.Vector3(-0.78, 0.12, -0.62).normalize()
const _color = new THREE.Color()
const _color2 = new THREE.Color()

/** Flatten every named part directly under a watch-space root (GLB → +90° about X restores Blender axes). */
function toWatchSpace(scene: THREE.Object3D, fromGltf: boolean): THREE.Group {
  const root = new THREE.Group()
  root.name = 'watch_space'
  if (!fromGltf) {
    root.add(scene)
    return root
  }
  const holder = new THREE.Group()
  holder.rotation.x = Math.PI / 2
  holder.add(scene)
  holder.updateMatrixWorld(true)
  const parts: THREE.Object3D[] = []
  scene.traverse((o) => {
    if (o !== scene && typeof o.userData?.explode_order === 'number' && !parts.some((p) => isAncestor(p, o))) parts.push(o)
  })
  const inv = new THREE.Matrix4().copy(holder.matrixWorld).invert()
  for (const p of parts) {
    const m = new THREE.Matrix4().multiplyMatrices(inv, p.matrixWorld)
    // holder space = glTF space; watch space = holder.rotation applied
    const world = new THREE.Matrix4().multiplyMatrices(holder.matrix, m)
    p.removeFromParent()
    world.decompose(p.position, p.quaternion, p.scale)
    root.add(p)
  }
  return root
}

function isAncestor(a: THREE.Object3D, b: THREE.Object3D) {
  let n = b.parent
  while (n) {
    if (n === a) return true
    n = n.parent
  }
  return false
}

function collectParts(root: THREE.Object3D): PartRuntime[] {
  const list: PartRuntime[] = []
  root.traverse((o) => {
    const u = o.userData as Record<string, unknown>
    if (typeof u?.explode_order !== 'number') return
    const ax = (u.explode_axis as number[] | undefined) ?? [0, 0, 0]
    list.push({
      name: o.name,
      obj: o,
      basePos: o.position.clone(),
      baseQuat: o.quaternion.clone(),
      axis: new THREE.Vector3(ax[0] ?? 0, ax[1] ?? 0, ax[2] ?? 0).normalize(),
      distance: Number(u.explode_distance ?? 0),
      order: Number(u.explode_order ?? 0),
      group: String(u.group ?? ''),
      spinRate: Number(u.spin_rate ?? 0),
      balanceHz: Number(u.balance_hz ?? 0),
      oscillateDeg: Number(u.oscillate_deg ?? 0),
    })
  })
  return list
}

interface MaterialSets {
  metal: THREE.MeshStandardMaterial[]
  base: Map<THREE.MeshStandardMaterial, { color: THREE.Color; roughness: number; metalness: number }>
  dial: THREE.MeshStandardMaterial[]
  strap: THREE.MeshStandardMaterial[]
  engraving: THREE.MeshStandardMaterial[]
  crystal: THREE.MeshPhysicalMaterial[]
}

function collectMaterials(root: THREE.Object3D): MaterialSets {
  const sets: MaterialSets = { metal: [], base: new Map(), dial: [], strap: [], engraving: [], crystal: [] }
  const seen = new Set<THREE.Material>()
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      if (seen.has(m)) continue
      seen.add(m)
      const std = m as THREE.MeshStandardMaterial
      if (!std.isMeshStandardMaterial) continue
      const n = m.name
      if (n.startsWith('m_steel') || n === 'm_engraving_area') {
        sets.metal.push(std)
        sets.base.set(std, { color: std.color.clone(), roughness: std.roughness, metalness: std.metalness })
      }
      if (n === 'm_engraving_area') sets.engraving.push(std)
      if (n === 'm_dial') sets.dial.push(std)
      if (n === 'm_leather') sets.strap.push(std)
      if (n === 'm_sapphire') sets.crystal.push(m as THREE.MeshPhysicalMaterial)
    }
  })
  return sets
}

const FINISH_ORDER: Finish[] = ['steel', 'gold', 'black']
/** UV orientation of the caseback medallion per model (grey-box cylinder caps are rotated). */
const ENGRAVING_ORIENTATION = { greybox: { rotate: -90, flipX: false }, glb: { rotate: 180, flipX: true } } as const

function GlbSource({ url, children }: { url: string; children: (root: THREE.Group) => React.ReactNode }) {
  const gltf = use(loadWatchGLB(url))
  const root = useMemo(() => toWatchSpace(gltf.scene, true), [gltf.scene])
  return <>{children(root)}</>
}

export function Watch({ kind, mobile, phone, tierA }: { kind: 'glb' | 'greybox'; mobile: boolean; phone: boolean; tierA: boolean }) {
  const grey = useMemo(() => (kind === 'greybox' ? toWatchSpace(buildGreyboxWatch(), false) : null), [kind])
  useEffect(() => {
    if (kind === 'greybox') setLoadPart('model', 1)
  }, [kind])
  if (grey) return <WatchRuntime source={grey} kind={kind} tierA={tierA} phone={phone} />
  return (
    <GlbSource url={mobile ? MODEL_URL_MOBILE : MODEL_URL}>
      {(root) => <WatchRuntime source={root} kind={kind} tierA={tierA} phone={phone} />}
    </GlbSource>
  )
}

function WatchRuntime({ source, kind, tierA, phone }: { source: THREE.Group; kind: 'glb' | 'greybox'; tierA: boolean; phone: boolean }) {
  const rig = useRef<THREE.Group>(null)
  const parts = useMemo(() => collectParts(source), [source])
  const byName = useMemo(() => new Map(parts.map((p) => [p.name, p])), [parts])
  const mats = useMemo(() => collectMaterials(source), [source])
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const engraving = useMemo(() => createEngravingCanvas(), [])
  const state = useRef({
    watchTime: 0,
    rotor: 0,
    rotorVel: 0,
    tiltX: 0,
    tiltY: 0,
    finish: 0,
    front: 0,
    readyAt: -1,
    sweepFrom: -1e9,
  })

  // Material patches (once per source)
  useEffect(() => {
    for (const m of mats.metal) patchSweep(m, m.name.includes('brushed') ? 1 : 0.55)
    // caseback outer face normal in the mesh's own frame: glTF (Y-up) → −Y; grey-box (watch space) → −Z
    const backAxis = kind === 'glb' ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 0, -1)
    for (const m of mats.engraving) patchEngraving(m, backAxis)
    for (const m of mats.dial) patchDial(m)
    engravingUniforms.uEngraving.value = engraving.texture
    engravingUniforms.uEngrAmt.value = 1
    // Exporter quirks: Blender's sheen exports as white sheenColor (three renders a glowing rim) and the
    // near-mirror transmissive rubies bloom like LEDs — bring both to what the Cycles renders show.
    source.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      for (const m of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshPhysicalMaterial[]) {
        if (m.name === 'm_leather' || m.name === 'm_stitch') {
          m.sheenColor?.set(m.name === 'm_leather' ? '#2a221d' : '#3a3029')
          m.sheenRoughness = 0.5
        }
        if (m.name === 'm_ruby') {
          m.color.set('#6e0612')
          m.roughness = 0.12
          m.transmission = tierA ? 0.25 : 0
          m.envMapIntensity = 0.7
        }
      }
    })
    for (const c of mats.crystal) {
      if (!tierA) {
        c.transmission = 0
        c.transparent = true
        c.opacity = 0.16
        c.depthWrite = false
      } else if (kind === 'greybox') {
        c.transparent = true
      }
      c.needsUpdate = true
    }
  }, [mats, engraving, tierA, kind])

  // Engraving text → canvas (debounced)
  useEffect(() => {
    let t = 0
    const redraw = () => {
      const { engraving: text, engravingDefault } = useExperience.getState()
      engraving.draw(text.trim() ? text : engravingDefault, ENGRAVING_ORIENTATION[kind])
      engravingUniforms.uEngrFlash.value = 1
    }
    loadEngravingFonts().then(redraw)
    const unsub = useExperience.subscribe(
      (s) => s.engraving + '|' + s.engravingDefault,
      () => {
        window.clearTimeout(t)
        t = window.setTimeout(redraw, 70)
      },
    )
    return () => {
      unsub()
      window.clearTimeout(t)
    }
  }, [engraving, kind])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const st = state.current
    const exp = useExperience.getState()
    const sc = sceneState
    // the "show dial" toggle turns the watch smoothly (never a jump cut)
    st.front = damp(st.front, exp.giftingShowFront ? 1 : 0, 4, dt)
    computeSceneState(sc, { giftingFront: st.front, finishOverride: FINISH_ORDER.indexOf(exp.finish), mobile: phone })

    // ── Explode + movement sub-assembly ──
    // Anatomy: every part travels its own explode_distance. Movement dive: the movement keeps the
    // mainplate offset (× lift) while wheels re-seat (seat → 0) and bridges hover (bridgeLift).
    let separated = 0
    for (const p of parts) {
      const e = sc.explode[p.order] ?? 0
      let d: number
      if (p.group === 'movement') {
        const internal = p.distance - MOVEMENT_PLATE_DISTANCE
        let seat = sc.movementSeat
        if (p.order === 6) seat = Math.max(sc.movementSeat, sc.bridgeLift)
        if (p.name === 'jewels') seat = Math.max(sc.movementSeat, sc.bridgeLift * 1.4)
        d = e * (MOVEMENT_PLATE_DISTANCE * sc.movementLift + internal * seat)
      } else {
        d = p.distance * e
      }
      if (e > 0.02) separated++
      p.obj.position.copy(p.basePos).addScaledVector(p.axis, d)
      if (sc.strapsOpen > 0) {
        if (p.name === 'strap_a' || p.name === 'buckle') p.obj.position.y += 46 * sc.strapsOpen
        else if (p.name === 'strap_b') p.obj.position.y -= 46 * sc.strapsOpen
      }
      // Movement dive: everything behind the movement (rotor, caseback, screws, gasket, straps) swings
      // away to the FAR side (−X, away from the camera's approach) so nothing crosses the shot.
      if (sc.clearance > 0) {
        const c = sc.clearance
        if (p.name === 'rotor') p.obj.position.addScaledVector(CLEAR_DIR, 150 * c)
        else if (p.order === 3 || p.order === 4) p.obj.position.addScaledVector(CLEAR_DIR, 190 * c)
        else if (p.order === 1 || p.order === 2) p.obj.position.addScaledVector(CLEAR_DIR, 120 * c)
        // the case, everything in front of the movement and the bridges (with their jewels) lift up and
        // out of frame, above the camera — the gear train is left in plain view on the mainplate
        else if (p.group !== 'movement' || p.order === 6 || p.name === 'jewels') {
          p.obj.position.y += 190 * c
          p.obj.position.z += 40 * c
        }
      }
      p.obj.quaternion.copy(p.baseQuat)
    }
    // the case is the 45th part: it counts once everything else has come away
    projected.partsSeparated = separated >= parts.length - 1 ? parts.length : separated

    // ── Time: hands follow Riyadh; at "ready" they snap from 10:10 to the live time ──
    const now = Date.now()
    if (exp.ready && st.readyAt < 0) st.readyAt = performance.now()
    const live = handAngles(riyadhTime(now))
    const snap = st.readyAt < 0 ? 0 : expoOut(clamp01((performance.now() - st.readyAt) / 900))
    const rest = { hour: (TAU * (10 + 10 / 60)) / 12, minute: (TAU * 10) / 60, second: 0 }
    const setHand = (name: string, a: number) => {
      const p = byName.get(name)
      if (!p) return
      _q.setFromAxisAngle(_zAxis, -a)
      p.obj.quaternion.copy(_q).multiply(p.baseQuat)
    }
    setHand('hand_hour', lerp(rest.hour, live.hour, snap))
    setHand('hand_minute', lerp(rest.minute, live.minute + (live.minute < rest.minute - Math.PI ? TAU : 0), snap))
    setHand('hand_seconds', lerp(rest.second, live.second, snap))

    // ── Gear train at true ratios (stepped by the escapement, 8 beats/s × timeScale) ──
    st.watchTime += dt * sc.timeScale
    const beats = st.watchTime * 8
    const beatIdx = Math.floor(beats)
    const within = beats - beatIdx
    const stepped = beatIdx + 1 - Math.pow(1 - Math.min(1, within / 0.2), 3)
    const escapeAngle = (stepped / 40) * TAU // 40 beats per escape-wheel turn (20 teeth)
    for (const p of parts) {
      if (p.spinRate) {
        const a = escapeAngle * (p.spinRate / 720)
        _q.setFromAxisAngle(_zAxis, a)
        p.obj.quaternion.copy(_q).multiply(p.baseQuat)
      } else if (p.balanceHz) {
        const a = 2.36 * Math.sin(TAU * p.balanceHz * st.watchTime)
        _q.setFromAxisAngle(_zAxis, a)
        p.obj.quaternion.copy(_q).multiply(p.baseQuat)
      } else if (p.oscillateDeg) {
        const a = THREE.MathUtils.degToRad(p.oscillateDeg) * Math.tanh(8 * Math.sin(TAU * 4 * st.watchTime))
        _q.setFromAxisAngle(_zAxis, a)
        p.obj.quaternion.copy(_q).multiply(p.baseQuat)
      } else if (p.name === 'hairspring') {
        const breath = 1 + 0.03 * Math.sin(TAU * 4 * st.watchTime)
        p.obj.scale.set(breath, breath, 1)
      } else if (p.name === 'rotor') {
        // the rotor swings with scroll, like a wrist moving
        st.rotorVel += frame.velocity * 0.0009 - Math.sin(st.rotor) * 0.9 * dt - st.rotorVel * 1.6 * dt
        st.rotor += st.rotorVel
        _q.setFromAxisAngle(_zAxis, st.rotor)
        p.obj.quaternion.copy(_q).multiply(p.baseQuat)
      }
    }

    // ── Finish / dial / strap materials ──
    st.finish = damp(st.finish, sc.finishIndex, 5, dt)
    const fi = st.finish
    const fA = FINISH_ORDER[Math.min(2, Math.floor(fi))]!
    const fB = FINISH_ORDER[Math.min(2, Math.floor(fi) + 1)]!
    const ft = fi - Math.floor(fi)
    for (const m of mats.metal) {
      const base = mats.base.get(m)!
      const a = FINISHES[fA]
      const b = FINISHES[fB]
      const brushed = m.name.includes('brushed') || m.name === 'm_engraving_area'
      _color.set(a.color)
      _color2.set(b.color)
      if (fA === 'steel') _color.copy(base.color)
      if (fB === 'steel') _color2.copy(base.color)
      m.color.copy(_color).lerp(_color2, ft)
      const rA = fA === 'steel' ? base.roughness : brushed ? a.brushedRoughness : a.roughness
      const rB = fB === 'steel' ? base.roughness : brushed ? b.brushedRoughness : b.roughness
      m.roughness = lerp(rA, rB, ft)
      m.metalness = lerp(fA === 'steel' ? base.metalness : a.metalness, fB === 'steel' ? base.metalness : b.metalness, ft)
    }
    // Dial colourway: the GLB's graphite dial keeps its authored texture; other colourways recolour it
    // through the print mask (bone print on dark dials, graphite print on ivory)
    const dial = DIALS[exp.dial]
    const k = 1 - Math.exp(-6 * dt)
    dialUniforms.uDialColor.value.lerp(_color.set(dial.color), k)
    dialUniforms.uPrintColor.value.lerp(_color2.set(exp.dial === 'ivory' ? '#2a2a2c' : '#e9e4dc'), k)
    dialUniforms.uDialMix.value = damp(dialUniforms.uDialMix.value, kind === 'glb' && exp.dial === 'graphite' ? 0 : 1, 6, dt)
    for (const m of mats.dial) {
      m.roughness = damp(m.roughness, dial.roughness, 6, dt)
      m.metalness = damp(m.metalness, dial.metalness, 6, dt)
    }
    const strap = STRAPS[exp.strap]
    for (const m of mats.strap) {
      m.color.lerp(_color.set(strap.color), 1 - Math.exp(-6 * dt))
      m.roughness = damp(m.roughness, strap.roughness, 6, dt)
    }

    // ── Light sweep (triggered by headline reveals) ──
    const sweepT = (performance.now() - frame.sweepAt) / 1500
    if (sweepT >= 0 && sweepT <= 1 && !exp.reducedMotion) {
      sweepUniforms.uSweepPos.value = lerp(-1.5, 1.5, expoOut(sweepT * 0.9))
      sweepUniforms.uSweepAmt.value = Math.sin(Math.PI * sweepT) * 1.25
    } else {
      sweepUniforms.uSweepAmt.value = 0
    }
    engravingUniforms.uEngrFlash.value = exp.reducedMotion ? 0 : damp(engravingUniforms.uEngrFlash.value, 0, 3.5, dt)
    // on the black finish the laser cuts through the coating to bright steel
    engravingUniforms.uEngrCut.value = clamp01(fi - 1)

    // ── Rig: pointer tilt (±6°), idle drift, chapter rotations ──
    const g = rig.current
    if (g) {
      const reduce = exp.reducedMotion
      const tiltAmt = reduce ? 0 : sc.idle * 0.105 + (1 - sc.idle) * 0.03
      st.tiltY = damp(st.tiltY, frame.pointer.x * tiltAmt, 3, dt)
      st.tiltX = damp(st.tiltX, -frame.pointer.y * tiltAmt, 3, dt)
      const t = performance.now() / 1000
      const drift = reduce ? 0 : sc.idle
      _e.set(
        sc.watchRotX + st.tiltX + Math.sin(t * 0.31) * 0.02 * drift,
        sc.watchRotY + st.tiltY + Math.sin(t * 0.23) * 0.035 * drift,
        Math.sin(t * 0.17) * 0.01 * drift,
      )
      _q.setFromEuler(_e)
      // phones: lay the watch flat (dial up, 12 o'clock to the side) for the vertical explode
      if (sc.flatten > 0.0001) _q.premultiply(_qFlatBlend.identity().slerp(Q_FLAT, sc.flatten))
      g.quaternion.copy(_q)
      g.visible = sc.watchVisible
      g.updateMatrixWorld()
    }

    // ── Anchors for the camera path (movement dive) ──
    for (const name of ANCHOR_PARTS) {
      const p = byName.get(name)
      if (!p) continue
      const v = anchors.get(name) ?? new THREE.Vector3()
      p.obj.getWorldPosition(v)
      anchors.set(name, v)
    }

    // ── Project labelled anchors for the DOM overlay ──
    for (const { part } of STAGE_LABEL_PARTS) {
      const p = byName.get(part)
      if (!p) continue
      p.obj.getWorldPosition(_v)
      _v.project(camera)
      const vis = (sc.explode[p.order] ?? 0) * (_v.z < 1 ? 1 : 0)
      const entry = projected.labels.get(part) ?? { x: 0, y: 0, visible: 0 }
      entry.x = (_v.x * 0.5 + 0.5) * size.width
      entry.y = (-_v.y * 0.5 + 0.5) * size.height
      entry.visible = vis
      projected.labels.set(part, entry)
    }
    const dialPart = byName.get('dial')
    if (dialPart) {
      dialPart.obj.getWorldPosition(_v)
      _v.project(camera)
      projected.dialCenter.x = (_v.x * 0.5 + 0.5) * size.width
      projected.dialCenter.y = (-_v.y * 0.5 + 0.5) * size.height
      projected.dialCenter.visible = 1 - Math.min(1, frame.chapter.hero * 3)
    }
  }, -1)

  return (
    <group ref={rig}>
      <primitive object={source} />
    </group>
  )
}

export const ORDER_COUNT = MAX_ORDER
