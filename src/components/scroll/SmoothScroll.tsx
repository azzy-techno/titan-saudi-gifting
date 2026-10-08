'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, registerGsap } from '@/lib/gsap'
import { frame, useExperience } from '@/lib/store'

let lenisInstance: Lenis | null = null
export const getLenis = () => lenisInstance

/** Scroll to an element id, through Lenis when active; moves focus for keyboard/screen-reader users. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = useExperience.getState().reducedMotion
  if (lenisInstance && !reduce) {
    lenisInstance.scrollTo(el, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) })
  } else {
    el.scrollIntoView({ behavior: 'auto', block: 'start' })
  }
  const focusTarget = el.querySelector<HTMLElement>('[data-focus-target]') ?? el
  if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1')
  focusTarget.focus({ preventScroll: true })
}

/**
 * Lenis smooth scroll synced to the GSAP ticker (BRIEF §8):
 *  lenis.on('scroll', ScrollTrigger.update) · gsap.ticker drives lenis.raf · lagSmoothing(0)
 * Native scroll stays intact (keyboard, scrollbar, back button). Disabled for reduced motion.
 */
export function SmoothScroll() {
  const reducedMotion = useExperience((s) => s.reducedMotion)

  useEffect(() => {
    registerGsap()
    const update = () => {
      const y = window.scrollY
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      frame.velocity = y - frame.scrollY
      frame.scrollY = y
      frame.progress = Math.min(1, Math.max(0, y / max))
    }

    let raf: ((time: number) => void) | null = null
    if (!reducedMotion) {
      const lenis = new Lenis({
        autoRaf: false,
        lerp: 0.085,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.9,
        anchors: false,
        stopInertiaOnNavigate: true,
      })
      lenisInstance = lenis
      lenis.on('scroll', () => {
        update()
        ScrollTrigger.update()
      })
      raf = (time: number) => lenis.raf(time * 1000)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)
    }

    const onNativeScroll = () => {
      if (!lenisInstance) update()
    }
    window.addEventListener('scroll', onNativeScroll, { passive: true })
    const onResize = () => {
      frame.vw = window.innerWidth
      frame.vh = window.innerHeight
      update()
    }
    onResize()
    window.addEventListener('resize', onResize)

    // In-page anchor links go through Lenis (and still update focus + URL hash)
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]')
      if (!a) return
      const id = a.getAttribute('href')?.slice(1)
      if (!id || !document.getElementById(id)) return
      e.preventDefault()
      history.pushState(null, '', `#${id}`)
      scrollToId(id)
    }
    document.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('scroll', onNativeScroll)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('click', onClick)
      if (raf) gsap.ticker.remove(raf)
      lenisInstance?.destroy()
      lenisInstance = null
    }
  }, [reducedMotion])

  return null
}
