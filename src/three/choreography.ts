import * as THREE from 'three'
import { frame, type ChapterId } from '@/lib/store'
import { clamp01, invLerp, lerp, power3InOut, smoothstep } from '@/lib/motion'
import { MAX_ORDER } from './watchConfig'

/**
 * Scroll choreography — ONE continuous camera path (Catmull-Rom through keyframes placed on absolute
 * scroll positions) plus derived scene state. Pure functions of the scroll position, so every move is
 * reversible and scrubbed. All positions in WATCH space (mm).
 */
export interface CamKey {
  chapter: ChapterId
  t: number
  pos: [number, number, number]
  target: [number, number, number]
  fov: number
  /** Lens shift in multiples of visible height; mirrored for RTL. */
  shiftK: number
  /** Mobile variants (portrait) */
  mPos?: [number, number, number]
  mTarget?: [number, number, number]
  mFov?: number
  mShiftK?: number
}

/** Keyframes (tuned in the grey-box; see DESIGN.md §6). */
export const CAMERA_KEYS: CamKey[] = [
  // 01 Hero — ¾ studio view, watch right of the headline
  { chapter: 'hero', t: 0, pos: [118, 45, 215], target: [0, 0, -3], fov: 24, shiftK: 0.3, mPos: [100, 38, 300], mTarget: [0, -14, -3], mFov: 30, mShiftK: 0 },
  { chapter: 'hero', t: 0.55, pos: [150, 62, 168], target: [0, 0, -4], fov: 25, shiftK: 0.16, mPos: [140, 50, 260], mTarget: [0, -6, -4], mFov: 30, mShiftK: 0 },
  // 02 Anatomy — orbit to an oblique profile; the exploded stack reads along the watch axis
  { chapter: 'anatomy', t: 0, pos: [196, 82, 96], target: [0, 0, -4], fov: 26, shiftK: 0.04, mPos: [250, 105, 120], mTarget: [0, -4, -4], mFov: 32, mShiftK: 0 },
  { chapter: 'anatomy', t: 0.55, pos: [228, 104, 52], target: [0, 2, -6], fov: 26, shiftK: 0, mPos: [300, 135, 70], mTarget: [0, 0, -6], mFov: 34, mShiftK: 0 },
  { chapter: 'anatomy', t: 1, pos: [236, 96, 18], target: [0, 4, -8], fov: 26, shiftK: -0.02, mPos: [310, 128, 30], mTarget: [0, 2, -8], mFov: 34, mShiftK: 0 },
  // 03 Movement — dive to the back of the movement, then close on the balance
  { chapter: 'movement', t: 0, pos: [70, 66, -96], target: [0, -3, -24], fov: 28, shiftK: -0.12, mPos: [80, 80, -130], mTarget: [0, -6, -24], mFov: 34, mShiftK: 0 },
  { chapter: 'movement', t: 0.5, pos: [22, 24, -62], target: [-3, -6, -24], fov: 28, shiftK: -0.16, mPos: [30, 36, -84], mTarget: [-3, -8, -24], mFov: 34, mShiftK: 0 },
  { chapter: 'movement', t: 1, pos: [4, 8, -48], target: [-5, -7.4, -25], fov: 30, shiftK: -0.18, mPos: [10, 14, -66], mTarget: [-5, -9, -25], mFov: 36, mShiftK: 0 },
  // 04 Finishes — reassembled, front ¾, watch right of the text
  { chapter: 'finishes', t: 0, pos: [96, 40, 200], target: [0, 0, -3], fov: 24, shiftK: 0.26, mPos: [90, 40, 290], mTarget: [0, -16, -3], mFov: 30, mShiftK: 0 },
  { chapter: 'finishes', t: 1, pos: [-70, 36, 210], target: [0, 0, -3], fov: 24, shiftK: 0.26, mPos: [-60, 36, 290], mTarget: [0, -16, -3], mFov: 30, mShiftK: 0 },
  // 05 Collections — camera rises; the watch drifts out of frame for the image strip
  { chapter: 'collections', t: 0, pos: [-40, 120, 300], target: [0, 70, -3], fov: 26, shiftK: 0, mPos: [-30, 140, 380], mTarget: [0, 80, -3], mFov: 32, mShiftK: 0 },
  { chapter: 'collections', t: 1, pos: [-40, 120, 300], target: [0, 72, -3], fov: 26, shiftK: 0, mPos: [-30, 140, 380], mTarget: [0, 82, -3], mFov: 32, mShiftK: 0 },
  // 06 Corporate gifting — caseback to camera, watch beside the configurator
  { chapter: 'gifting', t: 0, pos: [40, 20, 190], target: [0, 0, -6], fov: 24, shiftK: 0.27, mPos: [30, 26, 300], mTarget: [0, -22, -6], mFov: 30, mShiftK: 0 },
  { chapter: 'gifting', t: 1, pos: [24, 14, 196], target: [0, 0, -6], fov: 24, shiftK: 0.27, mPos: [20, 20, 300], mTarget: [0, -22, -6], mFov: 30, mShiftK: 0 },
  // 07 Al Khobar — pull back, settle, warm light
  { chapter: 'khobar', t: 0, pos: [0, 150, 330], target: [0, 10, -3], fov: 24, shiftK: 0.22, mPos: [0, 170, 420], mTarget: [0, -10, -3], mFov: 30, mShiftK: 0 },
  { chapter: 'khobar', t: 1, pos: [0, 175, 360], target: [0, 12, -3], fov: 24, shiftK: 0.22, mPos: [0, 190, 450], mTarget: [0, -8, -3], mFov: 30, mShiftK: 0 },
  // 08 Footer — idle
  { chapter: 'footer', t: 1, pos: [0, 190, 420], target: [0, 20, -3], fov: 24, shiftK: 0.22, mPos: [0, 200, 480], mTarget: [0, 0, -3], mFov: 30, mShiftK: 0 },
]

export interface Pose {
  pos: THREE.Vector3
  target: THREE.Vector3
  fov: number
  shiftK: number
}

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()

/** Absolute scroll position of a key (px). */
function keyY(k: CamKey): number {
  const [s, e] = frame.ranges[k.chapter]
  return lerp(s, e, k.t)
}

let curvePos: THREE.CatmullRomCurve3 | null = null
let curveTarget: THREE.CatmullRomCurve3 | null = null
let curveMobile = false

function buildCurves(mobile: boolean) {
  const P = CAMERA_KEYS.map((k) => new THREE.Vector3(...((mobile && k.mPos) || k.pos)))
  const T = CAMERA_KEYS.map((k) => new THREE.Vector3(...((mobile && k.mTarget) || k.target)))
  curvePos = new THREE.CatmullRomCurve3(P, false, 'centripetal')
  curveTarget = new THREE.CatmullRomCurve3(T, false, 'centripetal')
  curveMobile = mobile
}

/** Camera pose for the current scroll position. */
export function cameraPose(out: Pose, mobile: boolean, rtl: boolean): Pose {
  if (!curvePos || !curveTarget || curveMobile !== mobile) buildCurves(mobile)
  const y = frame.scrollY
  const n = CAMERA_KEYS.length
  let i = 0
  while (i < n - 2 && y > keyY(CAMERA_KEYS[i + 1]!)) i++
  const k0 = CAMERA_KEYS[i]!
  const k1 = CAMERA_KEYS[i + 1]!
  const y0 = keyY(k0)
  const y1 = keyY(k1)
  const raw = y1 > y0 ? clamp01((y - y0) / (y1 - y0)) : y >= y1 ? 1 : 0
  const e = power3InOut(raw)
  const u = (i + e) / (n - 1)
  curvePos!.getPoint(u, _a)
  curveTarget!.getPoint(u, _b)
  out.pos.copy(_a)
  out.target.copy(_b)
  const f0 = (mobile && k0.mFov) || k0.fov
  const f1 = (mobile && k1.mFov) || k1.fov
  out.fov = lerp(f0, f1, e)
  const s0 = mobile ? (k0.mShiftK ?? 0) : k0.shiftK
  const s1 = mobile ? (k1.mShiftK ?? 0) : k1.shiftK
  out.shiftK = lerp(s0, s1, e) * (rtl ? -1 : 1)
  return out
}

// ───────────────────────── Scene state ─────────────────────────

const ch = (id: ChapterId) => frame.chapter[id]
/** 0 before the chapter's range, 1 after (uses absolute scroll). */
const after = (id: ChapterId) => frame.scrollY >= frame.ranges[id][1]
const before = (id: ChapterId) => frame.scrollY < frame.ranges[id][0]

/** Stage windows for the anatomy explode (order → [start, width] in chapter progress). */
const STAGES: Record<number, [number, number]> = {
  1: [0.06, 0.1],
  2: [0.12, 0.08],
  3: [0.18, 0.08],
  4: [0.23, 0.09],
  5: [0.3, 0.09],
  6: [0.37, 0.09],
  7: [0.43, 0.1],
  8: [0.5, 0.08],
  9: [0.56, 0.08],
  10: [0.61, 0.08],
  11: [0.66, 0.09],
  12: [0.72, 0.08],
  13: [0.77, 0.08],
}
/** Reassembly sequence in the finishes chapter (inside-out, as a watchmaker would). */
const REASSEMBLY = [8, 7, 6, 5, 9, 10, 11, 12, 13, 4, 3, 2, 1]

export interface SceneState {
  explode: Float32Array // index = order (0…13)
  movementLift: number // ×  mainplate distance
  movementSeat: number // 1 = movement parts at their anatomy distances, 0 = seated in the mainplate
  bridgeLift: number // internal lift of bridges/jewels while seated
  clearance: number // pushes caseback/strap/rotor further away during the movement dive
  timeScale: number // gear-train speed (1 = real time)
  watchRotY: number
  watchRotX: number
  watchPosY: number
  finishIndex: number // continuous 0 (steel) → 1 (gold) → 2 (black)
  warmth: number
  dof: number // 0…1 strength
  loupe: number // 0…1 loupe availability
  canvasOpacity: number
  idle: number // hero idle drift amount
  partsVisible: number // parts counted as separated (anatomy counter)
}

export function createSceneState(): SceneState {
  return {
    explode: new Float32Array(MAX_ORDER + 1),
    movementLift: 0,
    movementSeat: 1,
    bridgeLift: 0,
    clearance: 0,
    timeScale: 1,
    watchRotY: 0,
    watchRotX: 0,
    watchPosY: 0,
    finishIndex: 0,
    warmth: 0,
    dof: 0,
    loupe: 0,
    canvasOpacity: 1,
    idle: 1,
    partsVisible: 0,
  }
}

/** Shared per-frame scene state (computed once per frame by the Watch, read by effects/lights). */
export const sceneState: SceneState = createSceneState()

export function computeSceneState(s: SceneState, opts: { giftingFront: boolean; finishOverride: number | null }) {
  const pA = ch('anatomy')
  const pM = ch('movement')
  const pF = ch('finishes')
  const pG = ch('gifting')
  const pK = ch('khobar')
  const pFoot = ch('footer')

  // Explode per order
  for (let o = 1; o <= MAX_ORDER; o++) {
    let v = 0
    if (before('anatomy')) v = 0
    else if (!after('anatomy')) {
      const [st, w] = STAGES[o]!
      v = power3InOut(invLerp(st, st + w, pA))
    } else if (!after('movement')) v = 1
    else if (!after('finishes')) {
      const idx = REASSEMBLY.indexOf(o)
      const st = 0.02 + idx * 0.03
      v = 1 - power3InOut(invLerp(st, st + 0.12, pF))
    } else v = 0
    s.explode[o] = v
  }
  s.explode[0] = 0

  // Movement dive
  const inMove = !before('movement') && !after('movement')
  const enterM = smoothstep(0, 0.28, pM)
  const exitM = smoothstep(0.86, 1, pM)
  s.movementLift = 1 + (inMove ? 0.62 * enterM * (1 - exitM) : 0)
  s.movementSeat = inMove ? 1 - enterM * (1 - exitM) : 1
  s.bridgeLift = inMove ? 0.45 * enterM * (1 - exitM) : 0
  s.clearance = inMove ? enterM * (1 - exitM) : 0
  s.timeScale = inMove ? lerp(1, 0.14, smoothstep(0.2, 0.75, pM)) : 1
  s.dof = inMove ? smoothstep(0.15, 0.45, pM) * (1 - exitM) : 0
  s.loupe = inMove ? smoothstep(0.25, 0.4, pM) * (1 - smoothstep(0.85, 0.95, pM)) : 0

  // Finishes: steel → gold → black on scroll (click overrides)
  const fScroll = clamp01(invLerp(0.34, 0.62, pF)) + clamp01(invLerp(0.68, 0.92, pF))
  const fIdx = before('finishes') ? 0 : after('finishes') ? 2 : fScroll
  s.finishIndex = opts.finishOverride ?? fIdx

  // Watch rotation: gifting turns the caseback to camera; khobar settles
  const turn = before('gifting') ? 0 : after('gifting') ? 1 : smoothstep(0, 0.22, pG)
  const back = opts.giftingFront ? 0 : 1
  const settle = before('khobar') ? 0 : smoothstep(0, 1, pK)
  s.watchRotY = Math.PI * turn * back * (1 - settle)
  s.watchRotX = -0.55 * settle
  s.watchPosY = 0
  s.warmth = settle
  s.canvasOpacity = 1 - smoothstep(0.35, 0.95, pFoot)
  s.idle = before('anatomy') ? 1 - smoothstep(0, 0.6, ch('hero')) : 0

  // Anatomy parts counter (how many parts have started separating)
  s.partsVisible = 0
}
