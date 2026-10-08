'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap, registerGsap, SplitText } from '@/lib/gsap'
import { DUR, EASE, STAGGER } from '@/lib/motion'
import s from './lab.module.css'

/** Live demos of every motion token (reveal, camera, mechanical steps, micro, stagger). */
export function MotionDemos() {
  const reveal = useRef<HTMLParagraphElement>(null)
  const chars = useRef<HTMLParagraphElement>(null)
  const dot = useRef<HTMLSpanElement>(null)
  const hand = useRef<HTMLSpanElement>(null)
  const [run, setRun] = useState(0)

  useEffect(() => {
    registerGsap()
    const ctx = gsap.context(() => {
      const a = SplitText.create(reveal.current!, { type: 'lines', mask: 'lines', linesClass: 'split-line' })
      gsap.from(a.lines, { yPercent: 112, duration: DUR.reveal, ease: EASE.reveal, stagger: STAGGER.lines })
      const b = SplitText.create(chars.current!, { type: 'chars,words,lines', mask: 'lines', linesClass: 'split-line' })
      gsap.from(b.chars, { yPercent: 112, duration: 1.15, ease: EASE.reveal, stagger: STAGGER.chars })
      gsap.fromTo(dot.current, { x: 0 }, { x: 320, duration: 2.4, ease: EASE.camera, repeat: -1, yoyo: true })
    })
    return () => ctx.revert()
  }, [run])

  useEffect(() => {
    // mechanical: 8 steps per second, no easing between beats
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const ms = Date.now() % 60000
      const deg = Math.floor(ms / 125) * 0.75
      if (hand.current) hand.current.style.transform = `rotate(${deg}deg)`
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={s.motion}>
      <div className={s.demo}>
        <p className="label">Reveal · cubic-bezier(0.16, 1, 0.3, 1) · 1050 ms · stagger 80 ms (lines)</p>
        <p ref={reveal} className={`display ${s.demoText}`} key={`r${run}`}>
          Every gift has an inside.
          <br />
          Forty-five parts, one intention.
        </p>
      </div>
      <div className={s.demo}>
        <p className="label">Display words by character · stagger 35 ms</p>
        <p ref={chars} className={`display display-xl ${s.demoMega}`} key={`c${run}`}>
          Time, well given.
        </p>
      </div>
      <div className={s.demo}>
        <p className="label">Camera · power3.inOut · scrubbed to scroll in the scene</p>
        <div className={s.track}>
          <span ref={dot} className={s.dot} />
        </div>
      </div>
      <div className={s.demo}>
        <p className="label">Mechanical · steps — 8 beats per second (28,800 vph)</p>
        <div className={s.dial}>
          <span ref={hand} className={s.hand} />
        </div>
      </div>
      <div className={s.demo}>
        <p className="label">Micro · 200 ms · hover / focus</p>
        <button type="button" className={s.microBtn} onClick={() => setRun((n) => n + 1)}>
          Replay reveals
        </button>
      </div>
    </div>
  )
}
