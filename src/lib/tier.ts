import type { Tier } from '@/lib/store'
import { asset } from '@/lib/basePath'

/**
 * Device tiers (BRIEF §9.1)
 *  A — desktop GPU / Apple Silicon: full scene, transmission crystal, all post, DPR ≤ 2
 *  B — integrated GPUs, high-end phones: DPR ≤ 1.5, no DOF, cheap crystal, half-res bloom, mobile LOD
 *  C — low-end / Save-Data / no WebGL2: poster + stills/sequence, no live WebGL
 * Override for QA: ?tier=A|B|C
 */
export interface TierDecision {
  tier: Tier
  reason: string
  mobile: boolean
  gpu?: string
}

interface NavigatorExtras {
  deviceMemory?: number
  connection?: { saveData?: boolean; effectiveType?: string }
}

export function quickTier(): TierDecision {
  const nav = navigator as Navigator & NavigatorExtras
  const params = new URLSearchParams(location.search)
  const forced = params.get('tier')?.toUpperCase()
  const mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(nav.userAgent)
  if (forced === 'A' || forced === 'B' || forced === 'C') {
    return { tier: forced, reason: 'forced via ?tier', mobile }
  }
  if (nav.connection?.saveData) return { tier: 'C', reason: 'Save-Data on', mobile }
  if (nav.connection?.effectiveType && /(^|-)2g$/.test(nav.connection.effectiveType)) {
    return { tier: 'C', reason: `network ${nav.connection.effectiveType}`, mobile }
  }
  const mem = nav.deviceMemory ?? 8
  const cores = nav.hardwareConcurrency ?? 8
  if (mem <= 2 || cores <= 2) return { tier: 'C', reason: `low device (mem ${mem}GB, ${cores} cores)`, mobile }
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2')
    if (!gl) return { tier: 'C', reason: 'no WebGL2', mobile }
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    return { tier: 'C', reason: 'WebGL2 failed', mobile }
  }
  return { tier: mobile ? 'B' : 'A', reason: mobile ? 'mobile default' : 'desktop default', mobile }
}

/** Refines the quick guess with detect-gpu benchmarks (self-hosted in /benchmarks). */
export async function refineTier(quick: TierDecision): Promise<TierDecision> {
  if (quick.reason.startsWith('forced') || quick.tier === 'C') return quick
  try {
    const { getGPUTier } = await import('detect-gpu')
    const res = await getGPUTier({ benchmarksURL: asset('/benchmarks') })
    const gpu = res.gpu
    if (res.type === 'WEBGL_UNSUPPORTED' || res.type === 'BLOCKLISTED') {
      return { tier: 'C', reason: `detect-gpu: ${res.type}`, mobile: quick.mobile, gpu }
    }
    const t = res.tier
    let tier: Tier = quick.tier
    if (t <= 0) tier = 'C'
    else if (t === 1) tier = quick.mobile ? 'C' : 'B'
    else if (t === 2) tier = 'B'
    else tier = quick.mobile ? 'B' : 'A'
    // Integrated graphics on desktop → B even when benchmarks are generous
    if (!quick.mobile && tier === 'A' && gpu && /intel|uhd|iris|radeon\(tm\) graphics|vega \d+ graphics/i.test(gpu)) {
      tier = 'B'
    }
    return { tier, reason: `detect-gpu tier ${t} (${res.type})`, mobile: quick.mobile, gpu }
  } catch {
    return quick
  }
}
