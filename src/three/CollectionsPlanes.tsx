'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { frame } from '@/lib/store'
import { damp } from '@/lib/motion'
import { cameraShift } from './CameraRig'

/**
 * Collection images as WebGL planes, positioned every frame from their DOM placeholders
 * (`[data-collection-plane]`), so layout, RTL and accessibility stay in the DOM.
 * Hover distortion: a soft lens bulge under the pointer + velocity bend while the strip moves.
 */
const vertex = /* glsl */ `
uniform float uHover; uniform vec2 uMouse; uniform float uVelocity;
varying vec2 vUv; varying float vBulge;
void main() {
  vUv = uv;
  vec3 p = position;
  float d = distance(uv, uMouse);
  float bulge = exp(-d * d * 9.0) * uHover;
  p.z += bulge * 0.06;
  p.x += sin(uv.y * 3.14159) * uVelocity * 0.04;
  vBulge = bulge;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`
const fragment = /* glsl */ `
uniform sampler2D uMap; uniform float uHover; uniform vec2 uMouse; uniform float uOpacity;
uniform float uVelocity; uniform vec2 uCover;
varying vec2 vUv; varying float vBulge;
void main() {
  vec2 uv = (vUv - 0.5) * uCover + 0.5;
  vec2 dir = uv - uMouse;
  uv -= dir * vBulge * 0.16;            // magnify under the pointer
  uv = (uv - 0.5) * (1.0 - 0.04 * uHover) + 0.5; // gentle zoom on hover
  float split = 0.0025 * abs(uVelocity) + 0.0015 * vBulge;
  vec3 c;
  c.r = texture2D(uMap, uv + vec2(split, 0.0)).r;
  c.g = texture2D(uMap, uv).g;
  c.b = texture2D(uMap, uv - vec2(split, 0.0)).b;
  gl_FragColor = vec4(c, uOpacity);
  #include <colorspace_fragment>
}
`

interface PlaneEntry {
  el: HTMLElement
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  hover: number
  mouse: THREE.Vector2
  aspect: number
}

export function CollectionsPlanes() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const group = useRef<THREE.Group>(null)
  /** Own scene, drawn AFTER the post chain: product images are never tone-mapped or blurred. */
  const planesScene = useMemo(() => new THREE.Scene(), [])
  const anyVisible = useRef(false)
  const [elements, setElements] = useState<HTMLElement[]>([])
  const loader = useMemo(() => new THREE.TextureLoader(), [])
  const entries = useRef<PlaneEntry[]>([])
  const lastX = useRef(0)
  const velocity = useRef(0)

  // Find DOM placeholders (they mount with the page; re-scan on navigation)
  useEffect(() => {
    const scan = () => setElements(Array.from(document.querySelectorAll<HTMLElement>('[data-collection-plane]')))
    scan()
    const mo = new MutationObserver(() => scan())
    mo.observe(document.body, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    const g = group.current
    if (!g) return
    const geo = new THREE.PlaneGeometry(1, 1, 24, 24)
    const list: PlaneEntry[] = elements.map((el) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uMap: { value: null },
          uHover: { value: 0 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uOpacity: { value: 0 },
          uVelocity: { value: 0 },
          uCover: { value: new THREE.Vector2(1, 1) },
        },
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.renderOrder = 10
      mesh.frustumCulled = false
      const entry: PlaneEntry = { el, mesh, hover: 0, mouse: new THREE.Vector2(0.5, 0.5), aspect: 1 }
      const src = el.dataset.src
      if (src) {
        loader.load(src, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          tex.anisotropy = 4
          mat.uniforms.uMap!.value = tex
          const img = tex.image as { width: number; height: number }
          entry.aspect = img.width / img.height
          el.dataset.gl = 'on'
        })
      }
      g.add(mesh)
      return entry
    })
    entries.current = list
    return () => {
      for (const e of list) {
        g.remove(e.mesh)
        e.mesh.material.dispose()
        ;(e.mesh.material.uniforms.uMap?.value as THREE.Texture | null)?.dispose()
        e.el.dataset.gl = 'off'
      }
      geo.dispose()
    }
  }, [elements, loader])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const g = group.current
    anyVisible.current = false
    if (!g || entries.current.length === 0) return
    // follow the camera
    g.position.copy(camera.position)
    g.quaternion.copy(camera.quaternion)
    const D = 100
    const visH = 2 * D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const s = visH / size.height
    const shiftWorld = cameraShift.k * visH // undo lens shift so planes sit exactly on their DOM boxes
    const strip = document.querySelector<HTMLElement>('[data-collections-track]')
    const x = strip?.getBoundingClientRect().left ?? 0
    velocity.current = damp(velocity.current, (x - lastX.current) / Math.max(dt, 1e-3) / 3000, 6, dt)
    lastX.current = x
    for (const e of entries.current) {
      const r = e.el.getBoundingClientRect()
      const onScreen = r.right > -50 && r.left < size.width + 50 && r.bottom > -50 && r.top < size.height + 50
      const mat = e.mesh.material
      e.mesh.visible = onScreen && !!mat.uniforms.uMap!.value
      if (!e.mesh.visible) continue
      anyVisible.current = true
      const cx = r.left + r.width / 2 - size.width / 2
      const cy = r.top + r.height / 2 - size.height / 2
      e.mesh.position.set(cx * s - shiftWorld, -cy * s - cameraShift.ky * visH, -D)
      e.mesh.scale.set(r.width * s, r.height * s, 1)
      const inside =
        frame.pointer.active &&
        frame.pointer.px >= r.left &&
        frame.pointer.px <= r.right &&
        frame.pointer.py >= r.top &&
        frame.pointer.py <= r.bottom
      e.hover = damp(e.hover, inside ? 1 : 0, 6, dt)
      if (inside) e.mouse.set((frame.pointer.px - r.left) / r.width, 1 - (frame.pointer.py - r.top) / r.height)
      const boxAspect = r.width / Math.max(1, r.height)
      const cover = e.aspect > boxAspect ? [boxAspect / e.aspect, 1] : [1, e.aspect / boxAspect]
      mat.uniforms.uCover!.value.set(cover[0], cover[1])
      mat.uniforms.uHover!.value = e.hover
      ;(mat.uniforms.uMouse!.value as THREE.Vector2).lerp(e.mouse, 1 - Math.exp(-10 * dt))
      mat.uniforms.uVelocity!.value = velocity.current
      mat.uniforms.uOpacity!.value = damp(mat.uniforms.uOpacity!.value as number, 1, 4, dt)
    }
  })

  useFrame(({ gl }) => {
    if (!anyVisible.current) return
    const prev = gl.autoClear
    gl.autoClear = false
    gl.clearDepth()
    gl.render(planesScene, camera)
    gl.autoClear = prev
  }, 2)

  return createPortal(<group ref={group} />, planesScene)
}
