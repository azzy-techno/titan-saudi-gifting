'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useExperience } from '@/lib/store'
import { Watch } from './Watch'
import { CameraRig } from './CameraRig'
import { Studio } from './Studio'
import { Effects } from './effects/Effects'
import { sceneState } from './choreography'
import { CollectionsPlanes } from './CollectionsPlanes'
import { setLoadPart } from './loadProgress'

/** Scene clear colour, pre-compensated so that after AgX + sRGB it lands on --ink-0 (#0b0a09). */
export const CLEAR_COLOR = '#0b0a09'

function ReadySignal() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const frames = useRef(0)
  const compiled = useRef(false)
  useEffect(() => {
    let cancelled = false
    setLoadPart('model', 1)
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          compiled.current = true
          setLoadPart('shaders', 1)
        }
      })
    return () => {
      cancelled = true
    }
  }, [gl, scene, camera])
  useFrame(() => {
    if (!compiled.current) return
    frames.current++
    if (frames.current === 3) {
      setLoadPart('firstFrame', 1)
      useExperience.getState().set({ canvasReady: true })
    }
  })
  return null
}

/** Fades the canvas out over the footer and stops rendering when fully hidden. */
function CanvasVisibility() {
  const gl = useThree((s) => s.gl)
  const setFrameloop = useThree((s) => s.setFrameloop)
  const hidden = useRef(false)
  useFrame(() => {
    const o = sceneState.canvasOpacity
    const el = gl.domElement.parentElement?.parentElement
    if (el) el.style.opacity = String(o)
  })
  useEffect(() => {
    const onScroll = () => {
      const shouldHide = sceneState.canvasOpacity <= 0.001
      if (shouldHide !== hidden.current) {
        hidden.current = shouldHide
        setFrameloop(shouldHide ? 'demand' : 'always')
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [setFrameloop])
  return null
}

function AdaptiveQuality({ tier }: { tier: 'A' | 'B' }) {
  const setDpr = useThree((s) => s.setDpr)
  const max = tier === 'A' ? 2 : 1.5
  return (
    <PerformanceMonitor
      bounds={(refresh) => (refresh > 90 ? [50, 90] : [42, 58])}
      flipflops={3}
      onChange={({ factor }) => setDpr(Math.max(1, Math.min(max, window.devicePixelRatio) * (0.6 + 0.4 * factor)))}
      onFallback={() => {
        setDpr(1)
        if (tier === 'A') useExperience.getState().set({ tier: 'B', tierReason: 'live fps fallback' })
      }}
    />
  )
}

export function Stage() {
  const tier = useExperience((s) => (s.tier === 'C' ? 'B' : s.tier))
  const model = useExperience((s) => s.model)
  const [mobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [fine] = useState(() => window.matchMedia('(pointer: fine)').matches)
  const maxDpr = tier === 'A' ? 2 : 1.5

  useEffect(() => {
    setLoadPart('engine', 1)
  }, [])

  return (
    <Canvas
      className="stage-canvas"
      dpr={[1, Math.min(maxDpr, window.devicePixelRatio || 1)]}
      flat
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true }}
      camera={{ fov: 24, near: 2, far: 3000, position: [118, 45, 215] }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(CLEAR_COLOR), 1)
        gl.toneMapping = THREE.NoToneMapping
        // ANGLE/D3D compiler info logs are not errors; keep the console clean in production
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== 'production'
      }}
      aria-hidden
      tabIndex={-1}
    >
      <color attach="background" args={[CLEAR_COLOR]} />
      <Suspense fallback={null}>
        <Studio />
        {model === 'pending' ? null : <Watch kind={model} mobile={mobile && model === 'glb'} tierA={tier === 'A'} />}
        <CollectionsPlanes />
        <ReadySignal />
      </Suspense>
      <CameraRig mobile={mobile} />
      <Effects tier={tier} fine={fine} />
      <AdaptiveQuality tier={tier} />
      <CanvasVisibility />
    </Canvas>
  )
}
