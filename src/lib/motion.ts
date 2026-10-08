/**
 * Motion tokens (JS mirror of src/styles/tokens.css). Keep in sync.
 * Rules: reveals ease expo-out, camera power3.inOut, ticking things step mechanically,
 * no overshoot on luxury elements, nothing moves without a reason.
 */
export const EASE = {
  /** cubic-bezier(0.16, 1, 0.3, 1) — registered as a GSAP CustomEase named "reveal" */
  reveal: 'reveal',
  revealCss: 'cubic-bezier(0.16, 1, 0.3, 1)',
  camera: 'power3.inOut',
  micro: 'power2.out',
} as const

export const DUR = {
  micro: 0.2,
  microMax: 0.24,
  reveal: 1.05,
  revealLong: 1.2,
} as const

export const STAGGER = {
  lines: 0.08,
  words: 0.06,
  chars: 0.04,
} as const

/** Bezier path for CustomEase.create('reveal', REVEAL_PATH) */
export const REVEAL_PATH = 'M0,0 C0.16,1 0.3,1 1,1'

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const invLerp = (a: number, b: number, v: number) => clamp01((v - a) / (b - a || 1))
export const smoothstep = (a: number, b: number, v: number) => {
  const t = invLerp(a, b, v)
  return t * t * (3 - 2 * t)
}

/** power3.inOut — camera ease */
export function power3InOut(t: number): number {
  const x = clamp01(t)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/** expo.out ≈ the reveal curve */
export function expoOut(t: number): number {
  const x = clamp01(t)
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
}

/** Frame-rate independent damping (like THREE.MathUtils.damp). lambda ≈ responsiveness. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt))
}
