/** Kept free of three.js imports: this module is part of the initial (pre-3D) bundle. */
import { asset } from '@/lib/basePath'

export const MODEL_URL = asset('/models/watch.glb')
export const MODEL_URL_MOBILE = asset('/models/watch-mobile.glb')

interface Manifest {
  desktop?: boolean
  mobile?: boolean
}

let checked: Promise<boolean> | null = null
/**
 * Cached: is the Blender GLB available for this viewport? Reads /models/manifest.json
 * (written by the export pipeline) instead of probing the GLB, so a missing model never logs a 404.
 */
export function checkModel(): Promise<boolean> {
  if (!checked) {
    const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    checked = fetch(asset('/models/manifest.json'), { cache: 'no-cache' })
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : ({} as Manifest)))
      .then((m: Manifest) => Boolean(mobile ? m.mobile : m.desktop))
      .catch(() => false)
  }
  return checked
}
