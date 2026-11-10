'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { pad } from '@/lib/i18n/numerals'
import { useExperience, type DialId, type Finish, type StrapId } from '@/lib/store'
import { crownClick, tick } from '@/lib/audio'
import { triggerSweep } from '../hooks'
import s from './gifting.module.css'

const MAX_LINE = 24

/** Live configurator — every change updates the 3D watch and is announced to screen readers. */
export function Configurator({
  locale,
  t,
  finishes,
}: {
  locale: Locale
  t: Dictionary['gifting']['configurator']
  finishes: Dictionary['finishes']['options']
}) {
  const id = useId()
  const engraving = useExperience((st) => st.engraving)
  const finish = useExperience((st) => st.finish)
  const dial = useExperience((st) => st.dial)
  const strap = useExperience((st) => st.strap)
  const showFront = useExperience((st) => st.giftingShowFront)
  const [announce, setAnnounce] = useState('')
  const [l1, l2] = [engraving.split('\n')[0] ?? '', engraving.split('\n')[1] ?? '']
  const lastTick = useRef(0)

  const say = (what: string) => setAnnounce(t.announce.replace('{what}', what))

  const setLine = (i: 0 | 1, v: string) => {
    const clean = v.replace(/\n/g, ' ').slice(0, MAX_LINE)
    const next = i === 0 ? [clean, l2] : [l1, clean]
    useExperience.getState().set({ engraving: next.join('\n').replace(/\n$/, '') })
    const now = performance.now()
    if (now - lastTick.current > 70) {
      tick(0.25)
      lastTick.current = now
    }
  }

  useEffect(() => {
    if (!engraving) return
    const tmr = window.setTimeout(() => say(`${t.engraving} — ${engraving.replace('\n', ' / ')}`), 900)
    return () => window.clearTimeout(tmr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engraving])

  return (
    <div className={s.configurator}>
      <p className="label">{t.title}</p>
      <div className={s.engrave}>
        <label className={s.fieldLabel} htmlFor={`${id}-l1`}>
          {t.engraving} · {t.line} {pad(1, 1, locale)}
        </label>
        <input
          id={`${id}-l1`}
          className={s.engraveInput}
          value={l1}
          maxLength={MAX_LINE}
          placeholder={t.engravingPlaceholder.split('·')[0]?.trim()}
          onChange={(e) => setLine(0, e.target.value)}
          dir="auto"
          autoComplete="off"
          spellCheck={false}
        />
        <label className={s.fieldLabel} htmlFor={`${id}-l2`}>
          {t.engraving} · {t.line} {pad(2, 1, locale)}
        </label>
        <input
          id={`${id}-l2`}
          className={s.engraveInput}
          value={l2}
          maxLength={MAX_LINE}
          placeholder={t.engravingPlaceholder.split('·')[1]?.trim()}
          onChange={(e) => setLine(1, e.target.value)}
          dir="auto"
          autoComplete="off"
          spellCheck={false}
        />
        <p className={`note ${s.hint}`}>{t.engravingHint}</p>
        {engraving.trim() ? null : <p className={`note ${s.hint}`}>{t.sample}</p>}
        <p className={`note ${s.hint}`}>{t.rules}</p>
      </div>

      <Choice
        legend={t.finish}
        options={finishes.map((f) => ({ id: f.id, name: f.name }))}
        value={finish}
        onChange={(v) => {
          useExperience.getState().set({ finish: v as Finish })
          triggerSweep()
          crownClick(0.6)
          say(`${t.finish} — ${finishes.find((f) => f.id === v)?.name ?? v}`)
        }}
      />
      <Choice
        legend={t.dial}
        options={t.dials}
        value={dial}
        onChange={(v) => {
          useExperience.getState().set({ dial: v as DialId, giftingShowFront: true })
          crownClick(0.6)
          say(`${t.dial} — ${t.dials.find((d) => d.id === v)?.name ?? v}`)
        }}
      />
      <Choice
        legend={t.strap}
        options={t.straps}
        value={strap}
        onChange={(v) => {
          useExperience.getState().set({ strap: v as StrapId })
          crownClick(0.6)
          say(`${t.strap} — ${t.straps.find((d) => d.id === v)?.name ?? v}`)
        }}
      />
      <button
        type="button"
        className={s.flip}
        aria-pressed={showFront}
        onClick={() => {
          const next = !showFront
          useExperience.getState().set({ giftingShowFront: next })
          crownClick(0.7)
          say(next ? t.showFront : t.showBack)
        }}
      >
        {showFront ? t.showBack : t.showFront}
      </button>
      <p className={`note ${s.hint}`}>{t.illustrative}</p>
      <p className="sr-only" aria-live="polite" role="status">
        {announce}
      </p>
    </div>
  )
}

function Choice({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string
  options: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
}) {
  const name = useId()
  return (
    <fieldset className={s.choice}>
      <legend className={s.fieldLabel}>{legend}</legend>
      <div className={s.choiceRow}>
        {options.map((o) => (
          <label key={o.id} className={s.chip} data-checked={value === o.id}>
            <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} />
            <span>{o.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
