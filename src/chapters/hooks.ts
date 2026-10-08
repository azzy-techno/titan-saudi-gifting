'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger, SplitText, registerGsap } from '@/lib/gsap'
import { CHAPTERS, frame, useExperience, type ChapterId } from '@/lib/store'
import type { Locale } from '@/lib/i18n/config'

registerGsap()

export type ChapterMode = 'hero' | 'pinned' | 'enter'

/** Writes normalised chapter progress (0…1) into the frame store and tracks the active chapter. */
export function useChapterTracking(ref: RefObject<HTMLElement | null>, id: ChapterId, mode: ChapterMode) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const index = CHAPTERS.indexOf(id)
    const [start, end] =
      mode === 'hero' ? ['top top', 'bottom top'] : mode === 'pinned' ? ['top top', 'bottom bottom'] : ['top bottom', 'bottom bottom']
    const progress = ScrollTrigger.create({
      trigger: el,
      start,
      end,
      onUpdate: (self) => {
        frame.chapter[id] = self.progress
      },
      onRefresh: (self) => {
        frame.ranges[id] = [self.start, self.end]
        frame.chapter[id] = self.progress
        window.dispatchEvent(new Event('tsg:layout'))
      },
    })
    const active = ScrollTrigger.create({
      trigger: el,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => {
        if (self.isActive) useExperience.getState().set({ chapter: index })
      },
    })
    frame.ranges[id] = [progress.start, progress.end]
    return () => {
      progress.kill()
      active.kill()
    }
  }, [ref, id, mode])
}

/** Triggers the light sweep across brushed metal (signature detail 6). */
export function triggerSweep() {
  frame.sweepAt = performance.now()
}

/**
 * Headline reveal — SplitText line masks rising (expo-out); display words by character.
 * Arabic is split by words (never characters: splitting breaks letter joining).
 * Reversible: plays on enter, reverses on leave-back. Server HTML stays fully visible (LCP, no-JS).
 */
export function useReveal(
  ref: RefObject<HTMLElement | null>,
  opts: { locale: Locale; split?: 'lines' | 'chars'; start?: string; sweep?: boolean; delay?: number; trigger?: RefObject<HTMLElement | null>; manual?: boolean },
) {
  const { locale, split = 'lines', start = 'top 82%', sweep = true, delay = 0, manual = false } = opts
  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      if (useExperience.getState().reducedMotion) {
        gsap.set(el, { autoAlpha: 1 })
        return
      }
      const ar = locale === 'ar'
      const byChar = split === 'chars'
      const type = byChar ? (ar ? 'words,lines' : 'chars,words,lines') : 'lines'
      // aria-label is valid on headings only; other elements get aria-hidden + a screen-reader copy
      const heading = /^H[1-6]$/.test(el.tagName)
      let srCopy: HTMLSpanElement | null = null
      if (!heading) {
        srCopy = document.createElement('span')
        srCopy.className = 'sr-only'
        srCopy.textContent = (el.textContent ?? '').trim()
        el.after(srCopy)
      }
      let tween: gsap.core.Tween | null = null
      let s: SplitText | null = null
      const run = () => {
        s = SplitText.create(el, {
        type,
        mask: 'lines',
        linesClass: 'split-line',
        autoSplit: true,
        aria: heading ? 'auto' : 'hidden',
        onSplit(self) {
          const targets = byChar ? (ar ? self.words : self.chars) : self.lines
          tween?.scrollTrigger?.kill()
          tween = gsap.from(targets, {
            yPercent: 112,
            duration: byChar ? 1.15 : 1.05,
            ease: 'reveal',
            stagger: byChar ? (ar ? 0.07 : 0.035) : 0.08,
            delay,
            paused: manual,
            scrollTrigger: manual
              ? undefined
              : {
                  trigger: opts.trigger?.current ?? el,
                  start,
                  toggleActions: 'play none none reverse',
                  onEnter: () => sweep && triggerSweep(),
                },
          })
          ;(el as HTMLElement & { __reveal?: gsap.core.Tween | null }).__reveal = tween
          return tween
        },
        })
      }
      // Split lazily: measuring lines forces layout, so only do it as the element approaches
      let io: IntersectionObserver | null = null
      if (manual) run()
      else {
        io = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              io?.disconnect()
              io = null
              run()
            }
          },
          { rootMargin: '150% 0px 150% 0px' },
        )
        io.observe(el)
      }
      return () => {
        io?.disconnect()
        tween?.scrollTrigger?.kill()
        s?.revert()
        srCopy?.remove()
      }
    },
    { scope: ref, dependencies: [locale] },
  )
}

/** Mutable flag: is `ref` within `margin` of the viewport? (cheap gate for per-frame DOM work) */
export function useNearViewport(ref: RefObject<HTMLElement | null>, margin = '50%') {
  const near = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => (near.current = entries.some((e) => e.isIntersecting)), {
      rootMargin: `${margin} 0px ${margin} 0px`,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin])
  return near
}

/**
 * rAF loop that only runs while `ref` is within `margin` of the viewport (saves main-thread time:
 * every chapter's per-frame DOM work stops when the chapter is off screen).
 */
export function useVisibleLoop(ref: RefObject<HTMLElement | null>, tick: () => void, deps: unknown[] = [], margin = '50%') {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let on = false
    const loop = () => {
      raf = requestAnimationFrame(loop)
      tick()
    }
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.some((e) => e.isIntersecting)
        if (vis && !on) {
          on = true
          raf = requestAnimationFrame(loop)
        } else if (!vis && on) {
          on = false
          cancelAnimationFrame(raf)
          tick() // settle one last time (e.g. hide labels)
        }
      },
      { rootMargin: `${margin} 0px ${margin} 0px` },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Plays a manual reveal registered with `manual: true` (e.g. the hero after the preloader). */
export function playReveal(el: HTMLElement | null) {
  const t = (el as (HTMLElement & { __reveal?: gsap.core.Tween | null }) | null)?.__reveal
  t?.play(0)
}
