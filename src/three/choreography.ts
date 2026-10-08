import * as THREE from 'three'
import { CHAPTERS, frame, type ChapterId } from '@/lib/store'
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
  /** Vertical lens shift (× visible height, + = subject above centre); phones use it to keep the
   *  watch in a band clear of the copy. */
  shiftY?: number
  mShiftY?: number
}

/** Keyframes (tuned in the grey-box; see DESIGN.md §6). */
export const CAMERA_KEYS: CamKey[] = [
  // 01 Hero — ¾ studio view, watch right of the headline
  { chapter: 'hero', t: 0, pos: [118, 45, 215], target: [0, 0, -3], fov: 24, shiftK: 0.3, mPos: [100, 38, 300], mTarget: [0, -14, -3], mFov: 30, mShiftK: 0, mShiftY: 0.1 },
  { chapter: 'hero', t: 0.55, pos: [150, 62, 168], target: [0, 0, -4], fov: 25, shiftK: 0.16, mPos: [140, 50, 260], mTarget: [0, -6, -4], mFov: 30, mShiftK: 0, mShiftY: 0.1 },
  // 02 Anatomy — orbit to an oblique profile; the exploded stack reads along the watch axis
  { chapter: 'anatomy', t: 0, pos: [196, 82, 96], target: [0, 0, -4], fov: 26, shiftK: 0.04, mPos: [250, 105, 120], mTarget: [0, -4, -4], mFov: 32, mShiftK: 0, mShiftY: 0.06 },
  { chapter: 'anatomy', t: 0.55, pos: [252, 114, 57], target: [0, 2, -6], fov: 26, shiftK: 0.05, mPos: [300, 135, 70], mTarget: [0, 0, -6], mFov: 34, mShiftK: 0, mShiftY: 0.04 },
  { chapter: 'anatomy', t: 1, pos: [262, 106, 20], target: [0, 4, -8], fov: 26, shiftK: 0.04, mPos: [310, 128, 30], mTarget: [0, 2, -8], mFov: 34, mShiftK: 0, mShiftY: 0.04 },
  // 03 Movement — dive to the back of the movement, then close on the balance (back parts are pushed behind the camera)
  { chapter: 'movement', t: 0, pos: [60, 72, -104], target: [0, -3, -24], fov: 28, shiftK: -0.12, mPos: [70, 86, -140], mTarget: [0, -8, -24], mFov: 34, mShiftK: 0, mShiftY: 0.2 },
  { chapter: 'movement', t: 0.5, pos: [16, 22, -72], target: [-2, -5, -26], fov: 28, shiftK: -0.16, mPos: [22, 30, -96], mTarget: [-2, -9, -26], mFov: 34, mShiftK: 0, mShiftY: 0.22 },
  { chapter: 'movement', t: 1, pos: [-4, 0, -58], target: [-6, -7.4, -27], fov: 30, shiftK: -0.18, mPos: [-2, 4, -78], mTarget: [-6, -10, -27], mFov: 36, mShiftK: 0, mShiftY: 0.22 },
  // 04 Finishes — swing round the side while the watch reassembles, settle front ¾ (watch right of the text)
  { chapter: 'finishes', t: 0, pos: [178, 54, 30], target: [0, 0, -6], fov: 25, shiftK: 0.08, mPos: [230, 70, 40], mTarget: [0, -10, -6], mFov: 31, mShiftK: 0, mShiftY: 0.02 },
  { chapter: 'finishes', t: 0.42, pos: [96, 40, 200], target: [0, 0, -3], fov: 24, shiftK: 0.26, mPos: [90, 40, 290], mTarget: [0, -16, -3], mFov: 30, mShiftK: 0, mShiftY: -0.02 },
  { chapter: 'finishes', t: 1, pos: [-70, 36, 210], target: [0, 0, -3], fov: 24, shiftK: 0.26, mPos: [-60, 36, 290], mTarget: [0, -16, -3], mFov: 30, mShiftK: 0, mShiftY: -0.02 },
  // 05 Collections — camera rises; the watch leaves the frame (below) for the image strip
  { chapter: 'collections', t: 0, pos: [-40, 178, 300], target: [0, 128, -3], fov: 26, shiftK: 0, mPos: [-30, 196, 380], mTarget: [0, 140, -3], mFov: 32, mShiftK: 0 },
  { chapter: 'collections', t: 1, pos: [-28, 182, 300], target: [0, 130, -3], fov: 26, shiftK: 0, mPos: [-20, 200, 380], mTarget: [0, 142, -3], mFov: 32, mShiftK: 0 },
  // 06 Corporate gifting — caseback to camera, watch beside the configurator
  { chapter: 'gifting', t: 0, pos: [40, 20, 190], target: [0, 0, -6], fov: 24, shiftK: 0.27, mPos: [36, 30, 370], mTarget: [0, -22, -6], mFov: 30, mShiftK: 0, mShiftY: 0.24 },
  { chapter: 'gifting', t: 1, pos: [24, 14, 196], target: [0, 0, -6], fov: 24, shiftK: 0.27, mPos: [24, 24, 370], mTarget: [0, -22, -6], mFov: 30, mShiftK: 0, mShiftY: 0.24 },
  // 07 Al Khobar — pull back, settle, warm light
  { chapter: 'khobar', t: 0, pos: [0, 150, 330], target: [0, 10, -3], fov: 24, shiftK: 0.22, mPos: [0, 170, 420], mTarget: [0, -10, -3], mFov: 30, mShiftK: 0, mShiftY: 0.02 },
  { chapter: 'khobar', t: 1, pos: [0, 175, 360], target: [0, 12, -3], fov: 24, shiftK: 0.22, mPos: [0, 190, 450], mTarget: [0, -8, -3], mFov: 30, mShiftK: 0 },
  // 08 Footer — idle
  { chapter: 'footer', t: 1, pos: [0, 190, 420], target: [0, 20, -3], fov: 24, shiftK: 0.22, mPos: [0, 200, 480], mTarget: [0, 0, -3], mFov: 30, mShiftK: 0 },
]

export interface Pose {
  pos: THREE.Vector3
  target: THREE.Vector3
  fov: number
  shiftK: number
  shiftY: number
}

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()

/**
 * The scroll position the scene is drawn for. Normally the live scroll; in reduced motion it is a
 * fixed representative pose per chapter (no scrubbed flights) and chapters crossfade (Stage).
 */
const REDUCED_T: Record<ChapterId, number> = {
  hero: 0,
  anatomy: 0.92,
  movement: 0.62,
  finishes: 0.62,
  collections: 0.5,
  gifting: 0.35,
  khobar: 0.85,
  footer: 0.6,
}
/** Canonical chapter ranges (in viewport heights) of the full-motion layout — used in reduced motion,
 *  where pinned sections collapse to auto height and their DOM ranges become zero-length. */
const VIRTUAL_RANGES_VH: Record<ChapterId, [number, number]> = {
  hero: [0, 1.5],
  anatomy: [1.5, 4.5],
  movement: [5.5, 7.5],
  finishes: [8.5, 9.7],
  collections: [10.7, 12.7],
  gifting: [13.7, 17.7],
  khobar: [17.9, 18.9],
  footer: [19.3, 20.3],
}
const virtualRanges = Object.fromEntries(CHAPTERS.map((c) => [c, [0, 1]])) as Record<ChapterId, [number, number]>

export const view: { y: number; reduced: boolean; chapter: number; ranges: Record<ChapterId, [number, number]> } = {
  y: 0,
  reduced: false,
  chapter: 0,
  ranges: frame.ranges,
}
export function updateView(reduced: boolean) {
  view.reduced = reduced
  if (!reduced) {
    view.ranges = frame.ranges
    view.y = frame.scrollY
    return
  }
  for (const c of CHAPTERS) {
    const [a, b] = VIRTUAL_RANGES_VH[c]
    virtualRanges[c][0] = a * frame.vh
    virtualRanges[c][1] = b * frame.vh
  }
  view.ranges = virtualRanges
  const id = CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, view.chapter))]!
  const [s, e] = virtualRanges[id]
  view.y = lerp(s, e, REDUCED_T[id])
}

/** Absolute scroll position of a key (px). */
function keyY(k: CamKey): number {
  const [s, e] = view.ranges[k.chapter]
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
  const y = view.y
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
  const v0 = mobile ? (k0.mShiftY ?? 0) : (k0.shiftY ?? 0)
  const v1 = mobile ? (k1.mShiftY ?? 0) : (k1.shiftY ?? 0)
  out.shiftY = lerp(v0, v1, e)
  return out
}

// ───────────────────────── Scene state ─────────────────────────

const ch = (id: ChapterId) => {
  const [s, e] = view.ranges[id]
  return clamp01((view.y - s) / Math.max(1, e - s))
}
/** 0→1 over the last `vhs` viewports BEFORE a chapter's range starts (transition zones). */
const approach = (id: ChapterId, vhs = 0.9) => smoothstep(view.ranges[id][0] - frame.vh * vhs, view.ranges[id][0], view.y)
/** 0 before the chapter's range, 1 after (uses absolute scroll). */
const after = (id: ChapterId) => view.y >= view.ranges[id][1]
const before = (id: ChapterId) => view.y < view.ranges[id][0]

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
      const st = 0.06 + idx * 0.026
      v = 1 - power3InOut(invLerp(st, st + 0.11, pF))
    } else v = 0
    s.explode[o] = v
  }
  s.explode[0] = 0

  // Movement dive — the arrangement holds through the chapter and relaxes while the camera
  // flies back to the front at the start of Finishes (no parts move near the camera).
  const enterM = before('movement') ? 0 : smoothstep(0, 0.26, pM)
  const relax = before('finishes') ? 0 : smoothstep(0, 0.22, pF)
  const m = enterM * (1 - relax)
  s.movementLift = 1 + 0.62 * m
  s.movementSeat = 1 - m
  s.bridgeLift = 0.55 * m
  s.clearance = m
  const inMove = !before('movement') && !after('movement')
  s.timeScale = view.reduced ? 0 : inMove ? lerp(1, 0.14, smoothstep(0.2, 0.75, pM)) : 1
  s.dof = inMove ? smoothstep(0.15, 0.45, pM) * (1 - smoothstep(0.9, 1, pM)) : 0
  s.loupe = inMove ? smoothstep(0.25, 0.4, pM) * (1 - smoothstep(0.88, 0.97, pM)) : 0

  // Finishes: steel → gold → black on scroll (click overrides)
  const fScroll = clamp01(invLerp(0.34, 0.62, pF)) + clamp01(invLerp(0.68, 0.92, pF))
  const fIdx = before('finishes') ? 0 : after('finishes') ? 2 : fScroll
  s.finishIndex = opts.finishOverride ?? fIdx

  // Watch rotation: gifting turns the caseback to camera; khobar settles
  const turn = after('gifting') ? 1 : approach('gifting', 1)
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
