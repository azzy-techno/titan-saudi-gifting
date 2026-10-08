import * as THREE from 'three'
import { CHAPTERS, frame, type ChapterId } from '@/lib/store'
import { clamp01, invLerp, lerp, power3InOut, smoothstep } from '@/lib/motion'
import { MAX_ORDER } from './watchConfig'

/**
 * Scroll choreography — ONE continuous camera path (centripetal Catmull-Rom through keyframes placed on
 * absolute scroll positions, power3.inOut per segment) plus derived scene state. Pure functions of the
 * scroll position, so every move is reversible and scrubbed. Positions in WATCH space (mm).
 *
 * Keys may follow a part (`anchor`): `target` is then an offset from the part's live world position and
 * `pos` an offset from that target — the movement dive tracks the real wheels whatever the model layout.
 */
export interface CamKey {
  chapter: ChapterId
  t: number
  pos: [number, number, number]
  target: [number, number, number]
  fov: number
  /** Horizontal lens shift in multiples of visible height (+ = subject right of centre); mirrored for RTL. */
  shiftK: number
  /** Vertical lens shift (× visible height, + = subject above centre). */
  shiftY?: number
  anchor?: string
  /** Phone (portrait) variants */
  mPos?: [number, number, number]
  mTarget?: [number, number, number]
  mFov?: number
  mShiftK?: number
  mShiftY?: number
  mAnchor?: string
}

/** Keyframes (tuned on the grey-box after QC1 — see DESIGN.md §7). */
export const CAMERA_KEYS: CamKey[] = [
  // 01 Hero — ¾ studio view, watch on the end side of the headline
  { chapter: 'hero', t: 0, pos: [118, 45, 215], target: [0, 0, -3], fov: 24, shiftK: 0.34, mPos: [100, 38, 300], mTarget: [0, -14, -3], mFov: 30, mShiftK: 0, mShiftY: 0.1 },
  { chapter: 'hero', t: 0.6, pos: [156, 66, 160], target: [0, 0, -4], fov: 25, shiftK: 0.14, mPos: [70, 40, 320], mTarget: [0, -4, -2], mFov: 32, mShiftK: 0, mShiftY: 0.06 },
  // 02 Anatomy — oblique profile; the stack sits in the centre columns, labels in the side columns.
  // Phones: the watch lies flat (dial up) so the stack explodes vertically.
  { chapter: 'anatomy', t: 0, pos: [200, 84, 96], target: [0, 0, -4], fov: 26, shiftK: 0.06, mPos: [44, 34, 330], mTarget: [0, -2, 0], mFov: 34, mShiftK: 0, mShiftY: 0.05 },
  { chapter: 'anatomy', t: 0.5, pos: [262, 118, 60], target: [0, 2, -6], fov: 26, shiftK: 0.06, mPos: [52, 40, 345], mTarget: [0, -2, 0], mFov: 34, mShiftK: 0, mShiftY: 0.05 },
  { chapter: 'anatomy', t: 0.8, pos: [272, 112, 30], target: [0, 3, -7], fov: 26, shiftK: 0.06, mPos: [56, 44, 350], mTarget: [0, -2, 0], mFov: 34, mShiftK: 0, mShiftY: 0.05 },
  { chapter: 'anatomy', t: 1, pos: [276, 108, 16], target: [0, 4, -8], fov: 26, shiftK: 0.06, mPos: [58, 46, 352], mTarget: [0, -2, 0], mFov: 34, mShiftK: 0, mShiftY: 0.05 },
  // 03 Movement — dive behind the movement, then the focus walks the train: fourth → escape → balance
  { chapter: 'movement', t: 0, anchor: 'mvmt_mainplate', pos: [62, 74, -82], target: [0, -2, 0], fov: 28, shiftK: -0.14, mPos: [70, 86, -118], mTarget: [0, -4, 0], mFov: 34, mShiftK: 0, mShiftY: 0.2 },
  { chapter: 'movement', t: 0.38, anchor: 'wheel_fourth', pos: [20, 30, -50], target: [0, 0, 0], fov: 28, shiftK: -0.16, mPos: [26, 38, -70], mTarget: [0, -2, 0], mFov: 34, mShiftK: 0, mShiftY: 0.22 },
  { chapter: 'movement', t: 0.68, anchor: 'wheel_escape', pos: [10, 20, -38], target: [0, 0, 0], fov: 29, shiftK: -0.17, mPos: [14, 26, -54], mTarget: [0, -2, 0], mFov: 35, mShiftK: 0, mShiftY: 0.22 },
  { chapter: 'movement', t: 1, anchor: 'balance_wheel', pos: [4, 8, -30], target: [0, 0, 0], fov: 30, shiftK: -0.18, mPos: [6, 12, -44], mTarget: [0, -2, 0], mFov: 36, mShiftK: 0, mShiftY: 0.22 },
  // 04 Finishes — swing round the side while the watch reassembles (copy hidden), then front ¾ with the
  // watch on the START side and the finish names on the end side
  { chapter: 'finishes', t: 0, pos: [180, 54, 34], target: [0, 0, -6], fov: 25, shiftK: 0, mPos: [230, 70, 40], mTarget: [0, -10, -6], mFov: 31, mShiftK: 0, mShiftY: 0.02 },
  { chapter: 'finishes', t: 0.3, pos: [96, 40, 200], target: [0, 0, -3], fov: 24, shiftK: -0.26, mPos: [90, 40, 300], mTarget: [0, -6, -3], mFov: 30, mShiftK: 0, mShiftY: 0.14 },
  { chapter: 'finishes', t: 1, pos: [36, 32, 214], target: [0, 0, -3], fov: 24, shiftK: -0.26, mPos: [30, 32, 310], mTarget: [0, -6, -3], mFov: 30, mShiftK: 0, mShiftY: 0.14 },
  // 05 Collections — camera rises; the watch leaves the frame (and is hidden while out of view)
  { chapter: 'collections', t: 0, pos: [-40, 178, 300], target: [0, 128, -3], fov: 26, shiftK: 0, mPos: [-30, 196, 380], mTarget: [0, 140, -3], mFov: 32, mShiftK: 0 },
  { chapter: 'collections', t: 1, pos: [-28, 182, 300], target: [0, 130, -3], fov: 26, shiftK: 0, mPos: [-20, 200, 380], mTarget: [0, 142, -3], mFov: 32, mShiftK: 0 },
  // 06 Corporate gifting — caseback to camera, watch beside the configurator (phones: top band)
  { chapter: 'gifting', t: 0, pos: [40, 20, 190], target: [0, 0, -6], fov: 24, shiftK: 0.27, mPos: [36, 30, 370], mTarget: [0, -22, -6], mFov: 30, mShiftK: 0, mShiftY: 0.26 },
  { chapter: 'gifting', t: 1, pos: [24, 14, 196], target: [0, 0, -6], fov: 24, shiftK: 0.27, mPos: [24, 24, 370], mTarget: [0, -22, -6], mFov: 30, mShiftK: 0, mShiftY: 0.26 },
  // 07 Al Khobar — pull back, settle, warm light; watch on the end side
  { chapter: 'khobar', t: 0, pos: [0, 150, 330], target: [0, 10, -3], fov: 24, shiftK: 0.25, mPos: [0, 170, 420], mTarget: [0, -10, -3], mFov: 30, mShiftK: 0, mShiftY: 0.12 },
  { chapter: 'khobar', t: 1, pos: [0, 175, 360], target: [0, 12, -3], fov: 24, shiftK: 0.25, mPos: [0, 190, 450], mTarget: [0, -8, -3], mFov: 30, mShiftK: 0, mShiftY: 0.12 },
  // 08 Footer — idle (canvas fades out as the footer arrives)
  { chapter: 'footer', t: 1, pos: [0, 190, 420], target: [0, 20, -3], fov: 24, shiftK: 0.25, mPos: [0, 200, 480], mTarget: [0, 0, -3], mFov: 30, mShiftK: 0 },
]

/** Live world positions of anchor parts (written by the Watch every frame). */
export const anchors = new Map<string, THREE.Vector3>()

export interface Pose {
  pos: THREE.Vector3
  target: THREE.Vector3
  fov: number
  shiftK: number
  shiftY: number
}

/**
 * The scroll position the scene is drawn for. Normally the live scroll; in reduced motion it is a
 * fixed representative pose per chapter (no scrubbed flights) and chapters crossfade (Stage).
 */
const REDUCED_T: Record<ChapterId, number> = {
  hero: 0,
  anatomy: 0.9,
  movement: 0.7,
  finishes: 0.45,
  collections: 0.5,
  gifting: 0.35,
  khobar: 0.85,
  footer: 0.2,
}
/** Canonical chapter ranges (viewport heights) of the full-motion layout — used in reduced motion,
 *  where pinned sections collapse to auto height and their DOM ranges become zero-length. */
const VIRTUAL_RANGES_VH: Record<ChapterId, [number, number]> = {
  hero: [0, 1.4],
  anatomy: [1.4, 3.6],
  movement: [4.6, 5.6],
  finishes: [6.6, 7.4],
  collections: [8.4, 10.4],
  gifting: [11.4, 15.4],
  khobar: [15.6, 16.6],
  footer: [16.9, 17.9],
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

const curvePos = new THREE.CatmullRomCurve3(CAMERA_KEYS.map(() => new THREE.Vector3()), false, 'centripetal')
const curveTarget = new THREE.CatmullRomCurve3(CAMERA_KEYS.map(() => new THREE.Vector3()), false, 'centripetal')
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()

/** Resolve every key (anchors move with the model), in place. */
function updateCurves(mobile: boolean) {
  CAMERA_KEYS.forEach((k, i) => {
    const anchorName = mobile ? (k.mAnchor ?? k.anchor) : k.anchor
    const t = (mobile && k.mTarget) || k.target
    const p = (mobile && k.mPos) || k.pos
    const T = curveTarget.points[i]!
    const P = curvePos.points[i]!
    const a = anchorName ? anchors.get(anchorName) : undefined
    if (a) {
      T.set(a.x + t[0], a.y + t[1], a.z + t[2])
      P.set(T.x + p[0], T.y + p[1], T.z + p[2])
    } else if (anchorName) {
      // anchor not known yet (model loading): fall back to the movement centre estimate
      T.set(t[0], t[1] - 6, t[2] - 24)
      P.set(T.x + p[0], T.y + p[1], T.z + p[2])
    } else {
      T.set(t[0], t[1], t[2])
      P.set(p[0], p[1], p[2])
    }
  })
}

/** Camera pose for the current (view) scroll position. */
export function cameraPose(out: Pose, mobile: boolean, rtl: boolean): Pose {
  updateCurves(mobile)
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
  curvePos.getPoint(u, _a)
  curveTarget.getPoint(u, _b)
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

/** Stage windows for the anatomy explode (order → [start, width] in chapter progress); hold from 0.8. */
export const STAGES: Record<number, [number, number]> = {
  1: [0.04, 0.08],
  2: [0.09, 0.07],
  3: [0.14, 0.07],
  4: [0.19, 0.08],
  5: [0.25, 0.08],
  6: [0.31, 0.08],
  7: [0.37, 0.09],
  8: [0.44, 0.07],
  9: [0.5, 0.07],
  10: [0.55, 0.07],
  11: [0.6, 0.08],
  12: [0.66, 0.07],
  13: [0.71, 0.07],
}
/** Reassembly sequence in the finishes chapter (inside-out, as a watchmaker would) — done by p = 0.3. */
const REASSEMBLY = [8, 7, 6, 5, 9, 10, 11, 12, 13, 4, 3, 2, 1]

/** Finish holds by scroll in the finishes chapter (after reassembly). */
export const FINISH_HOLDS: [number, number][] = [
  [0.3, 0.53],
  [0.53, 0.77],
  [0.77, 1.01],
]

export interface SceneState {
  explode: Float32Array // index = order (0…13)
  movementLift: number // × mainplate distance
  movementSeat: number // 1 = movement parts at their anatomy distances, 0 = seated in the mainplate
  bridgeLift: number // internal lift of bridges/jewels while seated
  clearance: number // pushes caseback/strap/rotor out of the movement shot
  timeScale: number // gear-train speed (1 = real time)
  watchRotY: number
  watchRotX: number
  /** 0…1 — phones only: watch laid flat (dial up) so the anatomy stack explodes vertically */
  flatten: number
  watchVisible: boolean
  finishIndex: number // continuous 0 (steel) → 1 (gold) → 2 (black)
  warmth: number
  dof: number // 0…1 strength
  /** Part the camera/DOF is focused on in the movement chapter */
  focus: string
  loupe: number // 0…1 loupe availability
  canvasOpacity: number
  idle: number // hero idle drift amount
}

export function createSceneState(): SceneState {
  return {
    explode: new Float32Array(MAX_ORDER + 1),
    movementLift: 1,
    movementSeat: 1,
    bridgeLift: 0,
    clearance: 0,
    timeScale: 1,
    watchRotY: 0,
    watchRotX: 0,
    flatten: 0,
    watchVisible: true,
    finishIndex: 0,
    warmth: 0,
    dof: 0,
    focus: 'balance_wheel',
    loupe: 0,
    canvasOpacity: 1,
    idle: 1,
  }
}

/** Shared per-frame scene state (computed once per frame by the Watch, read by effects/lights). */
export const sceneState: SceneState = createSceneState()

export function computeSceneState(s: SceneState, opts: { giftingFront: boolean; finishOverride: number | null; mobile: boolean }) {
  const pA = ch('anatomy')
  const pM = ch('movement')
  const pF = ch('finishes')
  const pK = ch('khobar')

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
      const st = idx * 0.018
      v = 1 - power3InOut(invLerp(st, st + 0.075, pF))
    } else v = 0
    s.explode[o] = v
  }
  s.explode[0] = 0

  // Phones: lay the watch flat for a vertical explode, stand it up again before the movement dive
  s.flatten = opts.mobile ? (before('anatomy') ? approach('anatomy', 0.8) : !after('anatomy') ? 1 - smoothstep(0.88, 1, pA) : 0) : 0

  // Movement dive — the arrangement holds through the chapter and relaxes while the camera flies back
  // round the side at the start of Finishes (no parts move near the camera).
  const enterM = before('movement') ? 0 : smoothstep(0, 0.24, pM)
  const relax = before('finishes') ? 0 : smoothstep(0, 0.14, pF)
  const m = enterM * (1 - relax)
  s.movementLift = 1 + 0.62 * m
  s.movementSeat = 1 - m
  s.bridgeLift = 0.55 * m
  // back parts start clearing while the camera is still on its way (transition zone before the dive)
  s.clearance = Math.max(m, before('movement') && after('anatomy') ? approach('movement', 1) : 0)
  const inMove = !before('movement') && !after('movement')
  s.timeScale = view.reduced ? 0 : inMove ? lerp(1, 0.14, smoothstep(0.2, 0.75, pM)) : 1
  s.dof = inMove ? smoothstep(0.12, 0.4, pM) * (1 - smoothstep(0.92, 1, pM)) : 0
  s.focus = pM < 0.5 ? 'wheel_fourth' : pM < 0.82 ? 'wheel_escape' : 'balance_wheel'
  s.loupe = inMove ? smoothstep(0.2, 0.32, pM) * (1 - smoothstep(0.9, 0.98, pM)) : 0

  // Finishes: the DOM controller sets the finish (scroll holds or click); the scene follows it
  s.finishIndex = opts.finishOverride ?? 0

  // Watch rotation: the caseback turns to camera as the collections strip leaves; Al Khobar settles it
  const turn = after('gifting') ? 1 : approach('gifting', 1)
  const back = opts.giftingFront ? 0 : 1
  const settle = before('khobar') ? 0 : smoothstep(0, 1, pK)
  s.watchRotY = Math.PI * turn * back * (1 - settle)
  const open = turn * (1 - settle) * (opts.giftingFront ? 0.4 : 1)
  if (open > 0) {
    s.explode[1] = Math.max(s.explode[1] ?? 0, power3InOut(open) * 0.95)
    s.explode[2] = Math.max(s.explode[2] ?? 0, power3InOut(open) * 0.95)
  }
  s.watchRotX = -0.55 * settle
  s.warmth = settle
  // Hidden while out of frame in the collections strip (the camera never cuts, so this is invisible)
  const [cs, ce] = view.ranges.collections
  s.watchVisible = !(view.y > cs + frame.vh * 0.2 && view.y < ce - frame.vh * 0.1)
  // Fade out as the footer arrives (no hard edge against its solid background)
  const fs = view.ranges.footer[0]
  s.canvasOpacity = 1 - smoothstep(fs, fs + frame.vh * 0.4, view.y)
  s.idle = before('anatomy') ? 1 - smoothstep(0, 0.6, ch('hero')) : 0
}
