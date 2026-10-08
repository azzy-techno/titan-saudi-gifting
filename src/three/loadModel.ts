import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { setLoadPart } from './loadProgress'

const cache = new Map<string, Promise<GLTF>>()

/** Fetches the GLB with byte-level progress (drives the preloader), then parses it (Meshopt + WebP). */
export function loadWatchGLB(url: string): Promise<GLTF> {
  const hit = cache.get(url)
  if (hit) return hit
  const p = (async () => {
    const res = await fetch(url)
    if (!res.ok || !res.body) throw new Error(`model ${res.status}`)
    const total = Number(res.headers.get('content-length') ?? 0)
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.byteLength
      if (total) setLoadPart('model', (received / total) * 0.95)
    }
    const buffer = new Uint8Array(received)
    let o = 0
    for (const c of chunks) {
      buffer.set(c, o)
      o += c.byteLength
    }
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    const gltf = await loader.parseAsync(buffer.buffer, url.slice(0, url.lastIndexOf('/') + 1))
    setLoadPart('model', 1)
    return gltf
  })()
  cache.set(url, p)
  return p
}

