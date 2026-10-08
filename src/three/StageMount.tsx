'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { frame, useExperience } from '@/lib/store'
import { quickTier, refineTier } from '@/lib/tier'
import { readSoundPreference } from '@/lib/audio'
import { setLoadMode } from './loadProgress'
import { readMotionPref } from '@/lib/prefs'

/**
 * Root-layout mount point for the ONE persistent WebGL canvas.
 * - decides the device tier once (quick heuristics, refined with detect-gpu)
 * - lazy-loads the 3D chunk only after first paint/idle (LCP stays HTML text + poster)
 * - keeps the canvas alive across /en ⇄ /ar (unmount is debounced)
 */
export function StageMount() {
  const sceneActive = useExperience((s) => s.sceneActive)
  const tier = useExperience((s) => s.tier)
  const reducedMotion = useExperience((s) => s.reducedMotion)
  const canvasReady = useExperience((s) => s.canvasReady)
  const [Stage, setStage] = useState<ComponentType | null>(null)
  const offTimer = useRef(0)

  // Tier, motion and sound preferences — once per session
  useEffect(() => {
    const q = quickTier()
    const set = useExperience.getState().set
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pref = readMotionPref()
    const applyMotion = () => {
      const p = useExperience.getState().motionPref
      const reduce = p === 'reduced' || (p === 'system' && mq.matches)
      document.documentElement.classList.toggle('reduce-motion', reduce)
      useExperience.getState().set({ reducedMotion: reduce })
    }
    set({ tier: q.tier, tierReason: q.reason, motionPref: pref, soundOn: false })
    applyMotion()
    mq.addEventListener('change', applyMotion)
    const unsub = useExperience.subscribe((s) => s.motionPref, applyMotion)
    // the remembered sound choice is restored on the first user gesture (browsers require one)
    if (readSoundPreference()) document.documentElement.dataset.soundPref = 'on'
    setLoadMode(q.tier !== 'C')
    refineTier(q).then((r) => {
      if (r.tier !== useExperience.getState().tier) {
        useExperience.getState().set({ tier: r.tier, tierReason: r.reason })
        setLoadMode(r.tier !== 'C')
      }
    })
    return () => {
      mq.removeEventListener('change', applyMotion)
      unsub()
    }
  }, [])

  // Pointer (normalised −1…1 and px), shared with the 3D scene and the loupe
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const onMove = (e: PointerEvent) => {
      frame.pointer.px = e.clientX
      frame.pointer.py = e.clientY
      frame.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      frame.pointer.y = (e.clientY / window.innerHeight) * 2 - 1
      frame.pointer.active = fine && e.pointerType === 'mouse'
    }
    const onLeave = () => {
      frame.pointer.active = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  // Mount / unmount (debounced so a locale switch does not destroy the WebGL context)
  const active = sceneActive && tier !== 'C'
  const [lingering, setLingering] = useState(false)
  if (active && !lingering) setLingering(true) // derived state during render (React pattern)
  useEffect(() => {
    if (active) return
    offTimer.current = window.setTimeout(() => setLingering(false), 800)
    return () => window.clearTimeout(offTimer.current)
  }, [active])
  const mounted = active || lingering

  // Lazy-load the 3D chunk after first paint / idle
  useEffect(() => {
    if (!mounted || Stage) return
    let cancelled = false
    const load = () =>
      import('./Stage').then((m) => {
        if (!cancelled) setStage(() => m.Stage)
      })
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    const id = w.requestIdleCallback ? w.requestIdleCallback(load, { timeout: 900 }) : window.setTimeout(load, 200)
    return () => {
      cancelled = true
      if (!w.requestIdleCallback) window.clearTimeout(id)
    }
  }, [mounted, Stage])

  return (
    <div
      className="stage-root"
      aria-hidden="true"
      data-ready={canvasReady ? 'true' : 'false'}
      data-reduced={reducedMotion ? 'true' : 'false'}
    >
      {mounted && Stage ? <Stage /> : null}
    </div>
  )
}
