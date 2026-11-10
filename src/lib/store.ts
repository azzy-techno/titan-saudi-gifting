import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Locale } from '@/lib/i18n/config'

export const CHAPTERS = [
  'hero',
  'anatomy',
  'movement',
  'finishes',
  'collections',
  'gifting',
  'khobar',
  'footer',
] as const
export type ChapterId = (typeof CHAPTERS)[number]

export type Finish = 'steel' | 'gold' | 'black'
export type DialId = 'graphite' | 'ivory' | 'green'
export type StrapId = 'black' | 'brown' | 'sand'
export type Tier = 'A' | 'B' | 'C'
export type MotionPref = 'system' | 'full' | 'reduced'

/** Mutable per-frame data. Written by scroll/pointer handlers, read in useFrame. Never subscribe React to it. */
export interface FrameData {
  scrollY: number
  progress: number
  velocity: number
  chapter: Record<ChapterId, number>
  /** Chapter scroll ranges in px [start, end], measured on layout. */
  ranges: Record<ChapterId, [number, number]>
  pointer: { x: number; y: number; px: number; py: number; active: boolean }
  /** Headline light-sweep triggers (performance.now() timestamps). */
  sweepAt: number
  /** Viewport size in CSS px. */
  vw: number
  vh: number
  /** Layout marks written by DOM chapters: chapter progress at which a block takes over the screen. */
  marks: { giftProcess: number; giftForm: number }
}

const zeroChapters = () =>
  Object.fromEntries(CHAPTERS.map((c) => [c, 0])) as Record<ChapterId, number>
const zeroRanges = () =>
  Object.fromEntries(CHAPTERS.map((c) => [c, [0, 1]])) as Record<ChapterId, [number, number]>

export const frame: FrameData = {
  scrollY: 0,
  progress: 0,
  velocity: 0,
  chapter: zeroChapters(),
  ranges: zeroRanges(),
  pointer: { x: 0, y: 0, px: -100, py: -100, active: false },
  sweepAt: -1e9,
  vw: 1440,
  vh: 900,
  marks: { giftProcess: 0.42, giftForm: 0.7 },
}

export interface ExperienceState {
  locale: Locale
  /** Active chapter index 0…7 (discrete; drives HUD). */
  chapter: number
  tier: Tier
  tierReason: string
  motionPref: MotionPref
  /** Effective reduced-motion (system preference or user toggle). */
  reducedMotion: boolean
  soundOn: boolean
  /** 0…1 real loading progress of fonts + 3D assets. */
  loaded: number
  ready: boolean
  /** True when the 3D stage should render on this route. */
  sceneActive: boolean
  /** 'greybox' = primitive placeholder watch (lab / until exported); 'glb' = Blender model; 'pending' = checking. */
  model: 'pending' | 'glb' | 'greybox'
  finish: Finish
  dial: DialId
  strap: StrapId
  engraving: string
  /** Shown on the caseback while the visitor has not typed anything (locale-specific). */
  engravingDefault: string
  /** Gifting chapter: user asked to see the dial instead of the caseback. */
  giftingShowFront: boolean
  /** Loupe magnifier is engaged (movement chapter, fine pointer). */
  loupe: boolean
  canvasReady: boolean
  set: (partial: Partial<Omit<ExperienceState, 'set'>>) => void
}

export const useExperience = create<ExperienceState>()(
  subscribeWithSelector((set) => ({
    locale: 'en',
    chapter: 0,
    tier: 'A',
    tierReason: 'default',
    motionPref: 'system',
    reducedMotion: false,
    soundOn: false,
    loaded: 0,
    ready: false,
    sceneActive: false,
    model: 'pending',
    finish: 'steel',
    dial: 'graphite',
    strap: 'black',
    engraving: '',
    engravingDefault: 'With gratitude\n25 years',
    giftingShowFront: false,
    loupe: false,
    canvasReady: false,
    set: (partial) => set(partial),
  })),
)

export const getExperience = () => useExperience.getState()
