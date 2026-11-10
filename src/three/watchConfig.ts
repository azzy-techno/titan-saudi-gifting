/**
 * Watch contract mirror (see blender/WATCH_SPEC.md). Used by the grey-box watch and to validate GLB extras.
 * Watch space (mm): +Z dial normal (front), +Y 12 o'clock, +X 3 o'clock. Origin = dial centre.
 */
export type PartGroup = 'case' | 'dial' | 'hands' | 'movement' | 'strap'
export type FinishSlot = 'case_metal' | 'strap' | 'dial' | 'none'

export interface PartSpec {
  name: string
  group: PartGroup
  order: number
  axis: [number, number, number]
  distance: number
  labelEn: string
  labelAr: string
  finish: FinishSlot
  spinRate?: number
  balanceHz?: number
  oscillateDeg?: number
}

const P = (
  name: string,
  group: PartGroup,
  order: number,
  axis: [number, number, number],
  distance: number,
  labelEn: string,
  labelAr: string,
  finish: FinishSlot,
  extra: Partial<PartSpec> = {},
): PartSpec => ({ name, group, order, axis, distance, labelEn, labelAr, finish, ...extra })

const Z: [number, number, number] = [0, 0, 1]
const nZ: [number, number, number] = [0, 0, -1]

export const PART_SPECS: PartSpec[] = [
  P('strap_a', 'strap', 1, [0, 1, 0], 34, 'Strap, buckle side', 'السوار، جهة الإبزيم', 'strap'),
  P('strap_b', 'strap', 1, [0, -1, 0], 34, 'Strap, tail side', 'السوار، الطرف الحر', 'strap'),
  P('buckle', 'strap', 2, [0, 0.8, -0.6], 52, 'Pin buckle', 'الإبزيم', 'case_metal'),
  ...[1, 2, 3, 4].map((i) =>
    P(`caseback_screw_0${i}`, 'case', 3, nZ, 58, 'Caseback screw', 'برغي الغطاء الخلفي', 'case_metal'),
  ),
  P('caseback', 'case', 4, nZ, 48, 'Caseback', 'الغطاء الخلفي', 'case_metal'),
  P('gasket', 'case', 4, nZ, 40, 'Gasket', 'حلقة العزل', 'none'),
  P('crown', 'case', 5, [1, 0, 0], 16, 'Crown', 'التاج', 'case_metal'),
  P('crown_tube', 'case', 5, [1, 0, 0], 8, 'Crown tube', 'أنبوب التاج', 'case_metal'),
  P('rotor', 'movement', 5, nZ, 34, 'Rotor', 'الدوّار', 'none'),
  P('mvmt_bridge_01', 'movement', 6, nZ, 27, 'Barrel bridge', 'جسر البرميل', 'none'),
  P('mvmt_bridge_02', 'movement', 6, nZ, 27, 'Train bridge', 'جسر العجلات', 'none'),
  P('mvmt_bridge_03', 'movement', 6, nZ, 27, 'Balance cock', 'جسر الميزان', 'none'),
  P('jewels', 'movement', 7, nZ, 23, 'Ruby jewels', 'أحجار الياقوت', 'none'),
  P('barrel', 'movement', 7, nZ, 19, 'Mainspring barrel', 'برميل النابض', 'none', { spinRate: 1 / 6 }),
  P('wheel_center', 'movement', 7, nZ, 19, 'Centre wheel', 'العجلة المركزية', 'none', { spinRate: -1 }),
  P('wheel_third', 'movement', 7, nZ, 19, 'Third wheel', 'العجلة الثالثة', 'none', { spinRate: 8 }),
  P('wheel_fourth', 'movement', 7, nZ, 19, 'Fourth wheel', 'العجلة الرابعة', 'none', { spinRate: -60 }),
  P('wheel_escape', 'movement', 7, nZ, 19, 'Escape wheel', 'عجلة الانفلات', 'none', { spinRate: 720 }),
  P('pallet_fork', 'movement', 7, nZ, 19, 'Pallet fork', 'المرساة', 'none', { oscillateDeg: 10 }),
  P('balance_wheel', 'movement', 7, nZ, 21, 'Balance wheel', 'عجلة الميزان', 'none', { balanceHz: 4 }),
  P('hairspring', 'movement', 7, nZ, 23, 'Hairspring', 'النابض الشعري', 'none'),
  P('mvmt_mainplate', 'movement', 8, nZ, 13, 'Mainplate', 'اللوحة الرئيسية', 'none'),
  P('dial', 'dial', 9, Z, 15, 'Sunburst dial', 'الميناء الشمسي', 'dial'),
  ...Array.from({ length: 12 }, (_, i) =>
    P(`index_${String(i + 1).padStart(2, '0')}`, 'dial', 10, Z, 20, 'Applied index', 'مؤشر الساعات', 'case_metal'),
  ),
  P('logo_plate', 'dial', 10, Z, 19, 'Logo', 'الشعار', 'none'),
  P('hand_hour', 'hands', 11, Z, 25, 'Hour hand', 'عقرب الساعات', 'case_metal'),
  P('hand_minute', 'hands', 11, Z, 29, 'Minute hand', 'عقرب الدقائق', 'case_metal'),
  P('hand_seconds', 'hands', 11, Z, 33, 'Seconds hand', 'عقرب الثواني', 'none'),
  P('crystal', 'case', 12, Z, 42, 'Crystal', 'الكريستال', 'none'),
  P('bezel', 'case', 13, Z, 50, 'Bezel', 'الإطار', 'case_metal'),
  P('case_body', 'case', 0, [0, 0, 0], 0, 'Case', 'العلبة', 'case_metal'),
]

export const PART_COUNT = PART_SPECS.length // 45
export const MAX_ORDER = 13

/** Labelled stages in the anatomy chapter (one leader-line label per stage). */
export const STAGE_LABEL_PARTS: { order: number; part: string }[] = [
  { order: 4, part: 'caseback' },
  { order: 5, part: 'rotor' },
  { order: 6, part: 'mvmt_bridge_03' },
  { order: 7, part: 'balance_wheel' },
  { order: 7, part: 'wheel_escape' },
  { order: 8, part: 'mvmt_mainplate' },
  { order: 9, part: 'dial' },
  { order: 10, part: 'index_03' },
  { order: 11, part: 'hand_minute' },
  { order: 12, part: 'crystal' },
  { order: 13, part: 'bezel' },
  { order: 5, part: 'crown' },
]

/** Finish palettes (linear-ish sRGB hex; the web lerps between them). */
export const FINISHES = {
  steel: { color: '#c9cbcc', roughness: 0.16, brushedRoughness: 0.34, metalness: 1 },
  gold: { color: '#d9b98a', roughness: 0.18, brushedRoughness: 0.34, metalness: 1 },
  black: { color: '#2a2a2c', roughness: 0.3, brushedRoughness: 0.42, metalness: 0.9 },
} as const

export const DIALS = {
  graphite: { color: '#26272a', roughness: 0.32, metalness: 0.65 },
  ivory: { color: '#e6dfd2', roughness: 0.42, metalness: 0.1 },
  green: { color: '#1f3328', roughness: 0.34, metalness: 0.6 },
} as const

export const STRAPS = {
  black: { color: '#141414', roughness: 0.62 },
  brown: { color: '#4a2e1e', roughness: 0.58 },
  sand: { color: '#a8916f', roughness: 0.7 },
} as const
