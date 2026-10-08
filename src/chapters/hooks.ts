'use client'

import { useEffect, type RefObject } from 'react'
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
      let tween: gsap.core.Tween | null = null
      const s = SplitText.create(el, {
        type,
        mask: 'lines',
        linesClass: 'split-line',
        autoSplit: true,
        aria: 'auto',
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
      return () => {
        tween?.scrollTrigger?.kill()
        s.revert()
      }
    },
    { scope: ref, dependencies: [locale] },
  )
}

/** Plays a manual reveal registered with `manual: true` (e.g. the hero after the preloader). */
export function playReveal(el: HTMLElement | null) {
  const t = (el as (HTMLElement & { __reveal?: gsap.core.Tween | null }) | null)?.__reveal
  t?.play(0)
}
