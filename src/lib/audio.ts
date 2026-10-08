/**
 * Web Audio synthesis only — no audio files. Muted by default; the visitor turns it on.
 * Sounds: escapement tick (two alternating "tick/tock" timbres), crown click (detent ratchet).
 */
const STORAGE_KEY = 'tsg.sound'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let enabled = false
let tickParity = 0

export function readSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

function writeSoundPreference(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    /* storage unavailable (private mode) — preference just won't persist */
  }
}

function ensureContext(): AudioContext | null {
  if (ctx) return ctx
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor({ latencyHint: 'interactive' })
  master = ctx.createGain()
  master.gain.value = 0.55
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.ratio.value = 4
  master.connect(comp).connect(ctx.destination)
  // 0.25 s of white noise, reused by every transient
  const len = Math.floor(ctx.sampleRate * 0.25)
  noise = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return ctx
}

/** Must be called from a user gesture (click / key). */
export async function setSoundEnabled(on: boolean): Promise<void> {
  enabled = on
  writeSoundPreference(on)
  if (!on) {
    if (ctx && ctx.state === 'running') await ctx.suspend().catch(() => undefined)
    return
  }
  const c = ensureContext()
  if (c && c.state !== 'running') await c.resume().catch(() => undefined)
}

export function isSoundEnabled(): boolean {
  return enabled && !!ctx && ctx.state === 'running'
}

function transient(opts: {
  at: number
  freq: number
  q: number
  gain: number
  decay: number
  ring?: number
  ringFreq?: number
}) {
  if (!ctx || !master || !noise) return
  const src = ctx.createBufferSource()
  src.buffer = noise
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = opts.freq
  bp.Q.value = opts.q
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, opts.at)
  g.gain.exponentialRampToValueAtTime(opts.gain, opts.at + 0.0012)
  g.gain.exponentialRampToValueAtTime(0.0001, opts.at + opts.decay)
  src.connect(bp).connect(g).connect(master)
  src.start(opts.at, Math.random() * 0.2, opts.decay + 0.02)
  if (opts.ring && opts.ringFreq) {
    // a faint metallic ring from the case
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = opts.ringFreq
    const rg = ctx.createGain()
    rg.gain.setValueAtTime(0.0001, opts.at)
    rg.gain.exponentialRampToValueAtTime(opts.ring, opts.at + 0.002)
    rg.gain.exponentialRampToValueAtTime(0.0001, opts.at + 0.06)
    osc.connect(rg).connect(master)
    osc.start(opts.at)
    osc.stop(opts.at + 0.08)
  }
}

/** One escapement beat. `volume` 0…1. */
export function tick(volume = 0.5, when = 0) {
  if (!isSoundEnabled() || !ctx) return
  const at = Math.max(ctx.currentTime, when || ctx.currentTime) + 0.005
  const tock = tickParity++ % 2 === 1
  transient({
    at,
    freq: tock ? 3900 : 4600,
    q: 9,
    gain: 0.5 * volume,
    decay: 0.022,
    ring: 0.03 * volume,
    ringFreq: tock ? 6100 : 6900,
  })
}

/** Crown click — two ratchet detents and a soft body knock. */
export function crownClick(volume = 0.6) {
  if (!isSoundEnabled() || !ctx || !master) return
  const at = ctx.currentTime + 0.005
  transient({ at, freq: 2400, q: 6, gain: 0.55 * volume, decay: 0.018 })
  transient({ at: at + 0.034, freq: 2900, q: 7, gain: 0.4 * volume, decay: 0.016 })
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(220, at)
  osc.frequency.exponentialRampToValueAtTime(90, at + 0.05)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(0.18 * volume, at + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07)
  osc.connect(g).connect(master)
  osc.start(at)
  osc.stop(at + 0.09)
}

/**
 * Escapement ambience (8 beats/s) with a lookahead scheduler. Volume can be changed every frame.
 * Returns a stop function.
 */
export function startEscapement(getVolume: () => number): () => void {
  let next = 0
  let raf = 0
  const beat = 1 / 8
  const loop = () => {
    raf = requestAnimationFrame(loop)
    if (!isSoundEnabled() || !ctx) return
    const v = getVolume()
    if (v <= 0.01) {
      next = 0
      return
    }
    const now = ctx.currentTime
    if (next < now) next = now + 0.02
    while (next < now + 0.12) {
      tick(v, next)
      next += beat
    }
  }
  raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}
