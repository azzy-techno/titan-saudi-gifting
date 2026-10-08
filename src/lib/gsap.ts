'use client'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { REVEAL_PATH } from './motion'

let registered = false

export function registerGsap() {
  if (registered || typeof window === 'undefined') return
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, DrawSVGPlugin)
  CustomEase.create('reveal', REVEAL_PATH)
  gsap.defaults({ ease: 'reveal', duration: 1.05 })
  ScrollTrigger.config({ ignoreMobileResize: true })
  registered = true
}

export { gsap, ScrollTrigger, SplitText, CustomEase }
