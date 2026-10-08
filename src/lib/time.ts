/**
 * Riyadh time (Asia/Riyadh). The offset is derived from Intl once (and re-checked hourly)
 * so the watch is correct even if the zone rules change; Riyadh is currently UTC+3 with no DST.
 */
const TZ = 'Asia/Riyadh'
let cachedOffsetMs: number | null = null
let cachedAt = 0

function computeOffsetMs(now: number): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(now))
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
    const rounded = Math.round((asUtc - Math.floor(now / 1000) * 1000) / 60000) * 60000
    return rounded
  } catch {
    return 3 * 3600 * 1000
  }
}

export function riyadhOffsetMs(now = Date.now()): number {
  if (cachedOffsetMs === null || now - cachedAt > 3600_000) {
    cachedOffsetMs = computeOffsetMs(now)
    cachedAt = now
  }
  return cachedOffsetMs
}

export interface ClockTime {
  h: number
  m: number
  s: number
  ms: number
}

export function riyadhTime(now = Date.now()): ClockTime {
  const t = new Date(now + riyadhOffsetMs(now))
  return { h: t.getUTCHours(), m: t.getUTCMinutes(), s: t.getUTCSeconds(), ms: t.getUTCMilliseconds() }
}

/** High-beat sweep: 8 steps per second (28,800 vph). Each step settles in ~28 ms like a real escapement. */
export const BEATS_PER_SECOND = 8

export interface HandAngles {
  /** Radians, clockwise from 12 o'clock. */
  hour: number
  minute: number
  second: number
}

export function handAngles(t: ClockTime): HandAngles {
  const step = 1000 / BEATS_PER_SECOND
  const beat = Math.floor(t.ms / step)
  const within = (t.ms - beat * step) / step
  // quick settle inside each beat (mechanical, no overshoot)
  const settle = Math.min(1, within / 0.22)
  const eased = 1 - Math.pow(1 - settle, 3)
  const secFloat = t.s + (beat + eased) / BEATS_PER_SECOND
  const minFloat = t.m + secFloat / 60
  const hourFloat = (t.h % 12) + minFloat / 60
  const TAU = Math.PI * 2
  return {
    second: (secFloat / 60) * TAU,
    minute: (minFloat / 60) * TAU,
    hour: (hourFloat / 12) * TAU,
  }
}

export function formatClock(t: ClockTime): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(t.h)}:${p(t.m)}:${p(t.s)}`
}
