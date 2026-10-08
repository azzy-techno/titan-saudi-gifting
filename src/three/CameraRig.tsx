'use client'

import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { cameraPose, updateView, type Pose } from './choreography'
import { useExperience } from '@/lib/store'

/**
 * Lens shift (like a tilt-shift camera / Blender shift_x, shift_y):
 * the subject appears `kx × visible height` right of centre and `ky × visible height` above centre.
 * Perspective is unchanged — only the image window moves.
 */
export function applyLensShift(camera: THREE.PerspectiveCamera, kx: number, ky: number, aspect: number) {
  if (!kx && !ky) return
  camera.projectionMatrix.elements[8] -= (2 * kx) / aspect
  camera.projectionMatrix.elements[9] -= 2 * ky
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
}

export const cameraShift = { k: 0, ky: 0 }

/** Drives the camera along the single continuous scroll path (runs before the watch projects labels). */
export function CameraRig({ mobile }: { mobile: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const pose = useRef<Pose>({ pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 24, shiftK: 0, shiftY: 0 })
  const smooth = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 24, shift: 0, shiftY: 0, init: false })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const { locale, reducedMotion } = useExperience.getState()
    updateView(reducedMotion)
    cameraPose(pose.current, mobile, locale === 'ar')
    const s = smooth.current
    const p = pose.current
    const k = !s.init || reducedMotion ? 1 : 1 - Math.exp(-7 * dt)
    if (!s.init) {
      s.pos.copy(p.pos)
      s.target.copy(p.target)
      s.fov = p.fov
      s.shift = p.shiftK
      s.shiftY = p.shiftY
      s.init = true
    }
    s.pos.lerp(p.pos, k)
    s.target.lerp(p.target, k)
    s.fov += (p.fov - s.fov) * k
    s.shift += (p.shiftK - s.shift) * k
    s.shiftY += (p.shiftY - s.shiftY) * k
    camera.position.copy(s.pos)
    camera.up.set(0, 1, 0)
    camera.lookAt(s.target)
    camera.fov = s.fov
    camera.updateProjectionMatrix()
    applyLensShift(camera, s.shift, s.shiftY, size.width / Math.max(1, size.height))
    cameraShift.k = s.shift
    cameraShift.ky = s.shiftY
  }, -2)

  return null
}
