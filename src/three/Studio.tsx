'use client'

import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { frame } from '@/lib/store'
import { smoothstep } from '@/lib/motion'

/**
 * "Midnight atelier" studio: a procedural softbox environment (no downloads) for long, clean
 * highlights on polished steel, plus a key and a warm rim light. Al Khobar chapter warms the light.
 */
export function Studio() {
  const key = useRef<THREE.DirectionalLight>(null)
  const rim = useRef<THREE.DirectionalLight>(null)
  const cool = new THREE.Color('#fff7ee')
  const warm = new THREE.Color('#ffc58a')
  const tmp = new THREE.Color()

  useFrame(() => {
    const w = smoothstep(0, 1, frame.chapter.khobar)
    if (key.current) {
      key.current.color.copy(tmp.copy(cool).lerp(warm, w * 0.8))
      key.current.intensity = 1.6 + w * 0.6
    }
    if (rim.current) rim.current.intensity = 1.1 + w * 1.4
  })

  return (
    <>
      <Environment resolution={256} frames={1} near={1} far={2000} environmentIntensity={1}>
        {/* overhead softbox */}
        <Lightformer form="rect" intensity={2.4} color="#fff6ea" position={[0, 420, 60]} rotation={[Math.PI / 2, 0, 0]} scale={[520, 180, 1]} />
        {/* tall strip left (long highlight down the case flank) */}
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[-380, 40, 120]} rotation={[0, Math.PI / 2, 0]} scale={[60, 520, 1]} />
        {/* strip right, cooler and dimmer */}
        <Lightformer form="rect" intensity={2.2} color="#f2f0ec" position={[380, 80, -60]} rotation={[0, -Math.PI / 2, 0]} scale={[42, 520, 1]} />
        {/* frontal fill card (soft, low) */}
        <Lightformer form="rect" intensity={0.55} color="#fbefe0" position={[0, -60, 460]} rotation={[0, 0, 0]} scale={[420, 140, 1]} />
        {/* back kicker for the movement chapter */}
        <Lightformer form="rect" intensity={1.6} color="#fff1dc" position={[60, 160, -420]} rotation={[0, Math.PI, 0]} scale={[300, 120, 1]} />
        {/* floor bounce, warm */}
        <Lightformer form="rect" intensity={0.25} color="#c9a46f" position={[0, -420, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[600, 600, 1]} />
      </Environment>
      <directionalLight ref={key} position={[-160, 220, 260]} intensity={1.6} color="#fff7ee" />
      <directionalLight ref={rim} position={[220, 120, -240]} intensity={1.1} color="#ffe2bd" />
      <ambientLight intensity={0.04} />
    </>
  )
}
