'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, SMAA, ToneMapping, Noise, Vignette, DepthOfField } from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction, type DepthOfFieldEffect } from 'postprocessing'
import { LoupeEffect } from './LoupeEffect'
import { anchors, sceneState } from '../choreography'
import { applyLensShift, cameraShift } from '../CameraRig'
import { frame, useExperience } from '@/lib/store'
import { damp } from '@/lib/motion'

const LOUPE_RADIUS = 112 // CSS px
const LOUPE_ZOOM = 2.6

/** Loupe pre-pass: re-render the region under the cursor at full detail (runs before the composer). */
function useLoupe(loupe: LoupeEffect, enabled: boolean) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)
  const target = useMemo(
    () =>
      new THREE.WebGLRenderTarget(256, 256, {
        type: THREE.HalfFloatType,
        depthBuffer: true,
        samples: 2,
      }),
    [],
  )
  useEffect(() => {
    loupe.magTexture = target.texture
    return () => target.dispose()
  }, [loupe, target])
  const state = useRef({ active: 0 })

  useFrame((_, dt) => {
    const want =
      enabled && frame.pointer.active && sceneState.loupe > 0.5 && useExperience.getState().loupe ? 1 : 0
    state.current.active = damp(state.current.active, want * Math.min(1, sceneState.loupe * 1.4), 10, dt)
    const a = state.current.active
    loupe.active = a
    if (a < 0.002) return
    const W = size.width
    const H = size.height
    const px = frame.pointer.px
    const py = frame.pointer.py
    const w = (2 * LOUPE_RADIUS) / LOUPE_ZOOM
    const res = Math.round(2 * LOUPE_RADIUS * Math.min(2, dpr))
    if (target.width !== res) target.setSize(res, res)
    const shiftPx = ((2 * cameraShift.k) / (W / H)) * (W / 2)
    const shiftPy = cameraShift.ky * H // + = image moved up
    camera.setViewOffset(W, H, px - w / 2 - shiftPx, py - w / 2 + shiftPy, w, w)
    const prev = gl.getRenderTarget()
    gl.setRenderTarget(target)
    gl.clear()
    gl.render(scene, camera)
    gl.setRenderTarget(prev)
    camera.clearViewOffset()
    applyLensShift(camera, cameraShift.k, cameraShift.ky, W / H)
    loupe.center.set(px / W, 1 - py / H)
    loupe.radius = LOUPE_RADIUS / H
    loupe.aspect = W / H
  })
}

export function Effects({ tier, fine }: { tier: 'A' | 'B'; fine: boolean }) {
  const loupe = useMemo(() => new LoupeEffect(), [])
  const dof = useRef<DepthOfFieldEffect>(null)
  const focus = useMemo(() => new THREE.Vector3(-5, -7.4, -25), [])
  useLoupe(loupe, fine)

  useFrame((_, dt) => {
    const d = dof.current
    if (!d) return
    d.bokehScale = damp(d.bokehScale, sceneState.dof * 3.2, 4, dt)
    d.target = anchors.get(sceneState.focus) ?? focus
  })

  return (
    <EffectComposer multisampling={0} frameBufferType={THREE.HalfFloatType} enableNormalPass={false}>
      {tier === "A" ? <DepthOfField ref={dof} focusRange={9} bokehScale={0} resolutionScale={0.5} /> : null}
      <primitive object={loupe} />
      <Bloom
        mipmapBlur
        luminanceThreshold={0.92}
        luminanceSmoothing={0.18}
        intensity={0.42}
        radius={0.68}
        resolutionScale={tier === 'A' ? 1 : 0.5}
      />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <SMAA />
      <Noise premultiply opacity={0.05} blendFunction={BlendFunction.SOFT_LIGHT} />
      <Vignette offset={0.36} darkness={0.46} eskil={false} />
    </EffectComposer>
  )
}
