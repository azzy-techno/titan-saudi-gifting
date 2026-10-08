'use client'

import { useEffect } from 'react'
import { useExperience } from '@/lib/store'
import { crownClick, setSoundEnabled } from '@/lib/audio'
import { writeMotionPref } from '@/lib/prefs'
import type { Dictionary } from '@/i18n'
import styles from './chrome.module.css'

export function SoundToggle({ t }: { t: Dictionary['hud'] }) {
  const on = useExperience((s) => s.soundOn)
  // Restore a remembered "on" choice at the first gesture (autoplay policies need one)
  useEffect(() => {
    if (document.documentElement.dataset.soundPref !== 'on') return
    const restore = async () => {
      await setSoundEnabled(true)
      useExperience.getState().set({ soundOn: true })
      window.removeEventListener('pointerdown', restore)
      window.removeEventListener('keydown', restore)
    }
    window.addEventListener('pointerdown', restore, { once: true })
    window.addEventListener('keydown', restore, { once: true })
    return () => {
      window.removeEventListener('pointerdown', restore)
      window.removeEventListener('keydown', restore)
    }
  }, [])
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={on}
      onClick={async () => {
        const next = !on
        await setSoundEnabled(next)
        useExperience.getState().set({ soundOn: next })
        document.documentElement.dataset.soundPref = next ? 'on' : 'off'
        if (next) crownClick(0.7)
      }}
    >
      <span className={styles.toggleKey}>{t.sound}</span>
      <span className={styles.toggleBars} data-on={on} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="sr-only">{on ? t.soundOn : t.soundOff}</span>
    </button>
  )
}

export function MotionToggle({ t }: { t: Dictionary['hud'] }) {
  const reduced = useExperience((s) => s.reducedMotion)
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={reduced}
      onClick={() => {
        const next = reduced ? 'full' : 'reduced'
        writeMotionPref(next)
        useExperience.getState().set({ motionPref: next })
        crownClick(0.5)
      }}
    >
      <span className={styles.toggleKey}>{t.motion}</span>
      <span className={styles.toggleValue}>{reduced ? t.motionReduced : t.motionOn}</span>
    </button>
  )
}
