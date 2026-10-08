import type { MotionPref } from './store'

const MOTION_KEY = 'tsg.motion'

export function readMotionPref(): MotionPref {
  try {
    const v = window.localStorage.getItem(MOTION_KEY)
    return v === 'full' || v === 'reduced' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function writeMotionPref(v: MotionPref) {
  try {
    if (v === 'system') window.localStorage.removeItem(MOTION_KEY)
    else window.localStorage.setItem(MOTION_KEY, v)
  } catch {
    /* storage unavailable (private mode) — preference just won't persist */
  }
}
