/** WCAG 2.x contrast ratio between two sRGB hex colours. */
function channel(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

export function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Composite a translucent colour over a background (for hairlines / alpha text). */
export function over(fg: string, alpha: number, bg: string): string {
  const p = (h: string, i: number) => parseInt(h.replace('#', '').slice(i, i + 2), 16)
  const mix = (i: number) => Math.round(p(fg, i) * alpha + p(bg, i) * (1 - alpha))
  return `#${[0, 2, 4].map((i) => mix(i).toString(16).padStart(2, '0')).join('')}`
}

export const PALETTE = {
  'ink-0': '#0b0a09',
  'ink-1': '#121110',
  'ink-2': '#1a1917',
  'ink-3': '#26241f',
  bone: '#ece7df',
  'bone-2': '#bdb6ab',
  'bone-2-ar': '#cdc6bb',
  'bone-3': '#8f887d',
  accent: '#c4a46f',
  error: '#e0a08c',
} as const
