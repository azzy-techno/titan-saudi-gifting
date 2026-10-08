import * as THREE from 'three'
import { ENGRAVING_FONTS } from '@/fonts/site'

/**
 * Live caseback engraving: text → canvas mask (white = cut) → CanvasTexture consumed by patchEngraving.
 * Arabic is shaped by the browser's canvas text engine (direction rtl). OFL faces only (IBM Plex Sans /
 * IBM Plex Sans Arabic) — Fontshare's licence does not allow fonts in visitor-generated content.
 */
const SIZE = 1024
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/

let fontsReady: Promise<void> | null = null
export function loadEngravingFonts(): Promise<void> {
  if (fontsReady) return fontsReady
  fontsReady = (async () => {
    if (typeof FontFace === 'undefined') return
    await Promise.all(
      Object.values(ENGRAVING_FONTS).map(async (f) => {
        try {
          const face = new FontFace(f.family, `url(${f.url})`, { weight: f.weight, display: 'swap' })
          await face.load()
          document.fonts.add(face)
        } catch {
          /* fall back to system font; engraving still renders */
        }
      }),
    )
  })()
  return fontsReady
}

export interface EngravingCanvas {
  texture: THREE.CanvasTexture
  draw: (text: string, opts?: { flipX?: boolean; rotate?: number }) => void
}

export function createEngravingCanvas(): EngravingCanvas {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: false })!
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  texture.anisotropy = 4
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter

  const draw = (raw: string, opts: { flipX?: boolean; rotate?: number } = {}) => {
    const lines = raw
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 2)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.translate(SIZE / 2, SIZE / 2)
    if (opts.rotate) ctx.rotate((opts.rotate * Math.PI) / 180)
    if (opts.flipX) ctx.scale(-1, 1)
    ctx.translate(-SIZE / 2, -SIZE / 2)
    ctx.filter = 'blur(1.6px)'
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const maxW = SIZE * 0.66
    const lineGap = 1.42
    // Fit: start large, shrink until every line fits the medallion width
    let size = lines.length > 1 ? 92 : 108
    const fontFor = (line: string, px: number) =>
      ARABIC.test(line)
        ? `${ENGRAVING_FONTS.arabic.weight} ${px}px "${ENGRAVING_FONTS.arabic.family}", "Segoe UI", Tahoma, sans-serif`
        : `${ENGRAVING_FONTS.latin.weight} ${px}px "${ENGRAVING_FONTS.latin.family}", "Helvetica Neue", Arial, sans-serif`
    const measure = (line: string, px: number) => {
      ctx.font = fontFor(line, px)
      const arabic = ARABIC.test(line)
      const spacing = arabic ? 0 : px * 0.14
      const text = arabic ? line : line.toUpperCase()
      return ctx.measureText(text).width + spacing * Math.max(0, text.length - 1)
    }
    while (size > 28 && lines.some((l) => measure(l, size) > maxW)) size -= 4
    const total = (lines.length - 1) * size * lineGap
    lines.forEach((line, i) => {
      const arabic = ARABIC.test(line)
      const y = SIZE / 2 - total / 2 + i * size * lineGap
      ctx.font = fontFor(line, size)
      ctx.direction = arabic ? 'rtl' : 'ltr'
      if (arabic) {
        ctx.fillText(line, SIZE / 2, y)
      } else {
        // manual tracking for engraved capitals (canvas letterSpacing support is uneven)
        const text = line.toUpperCase()
        const spacing = size * 0.14
        const width = measure(line, size)
        let x = SIZE / 2 - width / 2
        ctx.textAlign = 'left'
        for (const ch of text) {
          ctx.fillText(ch, x, y)
          x += ctx.measureText(ch).width + spacing
        }
        ctx.textAlign = 'center'
      }
    })
    // Hairline rule between two lines
    if (lines.length === 2) {
      ctx.filter = 'blur(1px)'
      ctx.fillRect(SIZE / 2 - 34, SIZE / 2 - 2, 68, 4)
    }
    ctx.filter = 'none'
    texture.needsUpdate = true
  }

  return { texture, draw }
}
