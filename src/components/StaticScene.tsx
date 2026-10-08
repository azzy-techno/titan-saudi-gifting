'use client'

import { useEffect, useRef, useState } from 'react'
import { CHAPTERS, frame, useExperience, type ChapterId } from '@/lib/store'
import styles from './static-scene.module.css'

/**
 * Tier C (low-end / Save-Data / no WebGL2): no live WebGL. A fixed layer shows a Blender still per
 * chapter (crossfade on chapter change); the anatomy chapter scrubs a 120-frame explode sequence on a
 * 2D canvas. Content and the form stay fully usable. Files come from the render pipeline:
 *   /img/stills/{chapter}-desktop-{en|ar}.webp (watch on the end side; RTL gets its own mirrored
 *   COMPOSITION, never a mirrored image) · /img/stills/{chapter}-mobile.webp ·
 *   /img/sequence/{720|1080}/f000.webp … f119.webp
 */
const STILL_CHAPTERS: ChapterId[] = ['hero', 'anatomy', 'movement', 'finishes', 'collections', 'gifting', 'khobar']
const FRAMES = 120

export function StaticScene() {
  const tier = useExperience((s) => s.tier)
  const chapter = useExperience((s) => s.chapter)
  const locale = useExperience((s) => s.locale)
  const [manifest, setManifest] = useState<{ stills?: boolean; sequence?: boolean } | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const id = CHAPTERS[chapter] ?? 'hero'
  const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches

  useEffect(() => {
    if (tier !== 'C') return
    fetch('/img/stills/manifest.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((m) => setManifest(m as { stills?: boolean; sequence?: boolean }))
      .catch(() => setManifest({}))
  }, [tier])

  // Anatomy: scrub the explode sequence
  useEffect(() => {
    if (tier !== 'C' || !manifest?.sequence || id !== 'anatomy') return
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const w = mobile ? 720 : 1080
    const cache = new Map<number, HTMLImageElement>()
    const load = (i: number) => {
      let img = cache.get(i)
      if (!img) {
        img = new Image()
        img.decoding = 'async'
        img.src = `/img/sequence/${w}/f${String(i).padStart(3, '0')}.webp`
        cache.set(i, img)
      }
      return img
    }
    let raf = 0
    let last = -1
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const reduce = useExperience.getState().reducedMotion
      const i = reduce ? FRAMES - 1 : Math.min(FRAMES - 1, Math.round(frame.chapter.anatomy * (FRAMES - 1)))
      for (let k = 1; k <= 6; k++) load(Math.min(FRAMES - 1, i + k)) // prefetch ahead
      const img = load(i)
      if (i === last || !img.complete) return
      last = i
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [tier, manifest, id, mobile])

  if (tier !== 'C' || !manifest?.stills) return null
  const variant = mobile ? 'mobile' : `desktop-${locale}`
  return (
    <div className={styles.root} aria-hidden="true" data-rtl={locale === 'ar' ? 'true' : 'false'}>
      {STILL_CHAPTERS.map((c) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={c}
          src={`/img/stills/${c}-${variant}.webp`}
          alt=""
          className={styles.still}
          data-on={c === id && !(c === 'anatomy' && manifest.sequence) ? 'true' : 'false'}
          loading={c === 'hero' ? 'eager' : 'lazy'}
          decoding="async"
        />
      ))}
      {manifest.sequence ? <canvas ref={canvas} className={styles.sequence} data-on={id === 'anatomy' ? 'true' : 'false'} /> : null}
    </div>
  )
}
