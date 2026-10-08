import { useExperience } from '@/lib/store'

/**
 * Real loading progress for the preloader counter (000 → 100):
 * fonts + poster (DOM) and, when WebGL runs, the 3D engine chunk, model bytes, shader compile, first frame.
 */
type Part = 'fonts' | 'poster' | 'engine' | 'model' | 'shaders' | 'firstFrame'

const WEIGHTS_3D: Record<Part, number> = { fonts: 0.12, poster: 0.08, engine: 0.2, model: 0.4, shaders: 0.12, firstFrame: 0.08 }
const WEIGHTS_STATIC: Record<Part, number> = { fonts: 0.6, poster: 0.4, engine: 0, model: 0, shaders: 0, firstFrame: 0 }

const parts: Record<Part, number> = { fonts: 0, poster: 0, engine: 0, model: 0, shaders: 0, firstFrame: 0 }
let webgl = true

export function setLoadMode(withWebgl: boolean) {
  webgl = withWebgl
  publish()
}

export function setLoadPart(part: Part, value: number) {
  parts[part] = Math.max(parts[part], Math.min(1, value))
  publish()
}

function publish() {
  const w = webgl ? WEIGHTS_3D : WEIGHTS_STATIC
  let total = 0
  for (const k of Object.keys(parts) as Part[]) total += parts[k] * w[k]
  const s = useExperience.getState()
  if (total > s.loaded) s.set({ loaded: Math.min(1, total) })
}
