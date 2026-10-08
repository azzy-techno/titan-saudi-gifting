#!/usr/bin/env node
/**
 * Downsample a Radiance .hdr (RGBE) for the web environment fallback.
 * node scripts/hdr-downsample.mjs blender/hdri/monochrome_studio_04_2k.hdr public/env/studio-512.hdr 512
 * Reads new-style RLE or flat scanlines; box-filters in linear float; writes RLE-encoded RGBE.
 */
import fs from 'node:fs'

const [src, dst, wArg] = process.argv.slice(2)
const OUT_W = Number(wArg ?? 512)
const buf = fs.readFileSync(src)
let pos = 0
const line = () => {
  let s = ''
  while (buf[pos] !== 0x0a) s += String.fromCharCode(buf[pos++])
  pos++
  return s
}
let l
while ((l = line()) !== '') {
  /* header */
}
const dims = line().match(/-Y (\d+) \+X (\d+)/)
const H = Number(dims[1])
const W = Number(dims[2])
const rgbe = new Uint8Array(W * H * 4)
for (let y = 0; y < H; y++) {
  if (buf[pos] === 2 && buf[pos + 1] === 2 && ((buf[pos + 2] << 8) | buf[pos + 3]) === W) {
    pos += 4
    for (let c = 0; c < 4; c++) {
      let x = 0
      while (x < W) {
        let n = buf[pos++]
        if (n > 128) {
          n -= 128
          const v = buf[pos++]
          for (let i = 0; i < n; i++) rgbe[(y * W + x++) * 4 + c] = v
        } else {
          for (let i = 0; i < n; i++) rgbe[(y * W + x++) * 4 + c] = buf[pos++]
        }
      }
    }
  } else {
    for (let x = 0; x < W; x++) for (let c = 0; c < 4; c++) rgbe[(y * W + x) * 4 + c] = buf[pos++]
  }
}
const OUT_H = OUT_W / 2
const f = W / OUT_W
const out = new Float32Array(OUT_W * OUT_H * 3)
for (let y = 0; y < OUT_H; y++)
  for (let x = 0; x < OUT_W; x++) {
    let r = 0, g = 0, b = 0, n = 0
    for (let sy = Math.floor(y * f); sy < Math.floor((y + 1) * f); sy++)
      for (let sx = Math.floor(x * f); sx < Math.floor((x + 1) * f); sx++) {
        const i = (sy * W + sx) * 4
        const e = rgbe[i + 3]
        if (e) {
          const s = Math.pow(2, e - 136)
          r += rgbe[i] * s
          g += rgbe[i + 1] * s
          b += rgbe[i + 2] * s
        }
        n++
      }
    const o = (y * OUT_W + x) * 3
    out[o] = r / n
    out[o + 1] = g / n
    out[o + 2] = b / n
  }
const toRGBE = (r, g, b) => {
  const v = Math.max(r, g, b)
  if (v < 1e-32) return [0, 0, 0, 0]
  const e = Math.ceil(Math.log2(v) + 1e-9)
  const s = 256 / Math.pow(2, e)
  return [Math.min(255, Math.floor(r * s)), Math.min(255, Math.floor(g * s)), Math.min(255, Math.floor(b * s)), e + 128]
}
const chunks = [Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\nSOURCE=Poly Haven monochrome_studio_04 (CC0), downsampled ${OUT_W}x${OUT_H}\n\n-Y ${OUT_H} +X ${OUT_W}\n`)]
for (let y = 0; y < OUT_H; y++) {
  const sc = []
  for (let x = 0; x < OUT_W; x++) {
    const o = (y * OUT_W + x) * 3
    sc.push(toRGBE(out[o], out[o + 1], out[o + 2]))
  }
  const row = [2, 2, OUT_W >> 8, OUT_W & 255]
  for (let c = 0; c < 4; c++) {
    let x = 0
    while (x < OUT_W) {
      let run = 1
      while (x + run < OUT_W && run < 127 && sc[x + run][c] === sc[x][c]) run++
      if (run >= 3) {
        row.push(128 + run, sc[x][c])
        x += run
      } else {
        let lit = 0
        const start = x
        while (x < OUT_W && lit < 128) {
          let r2 = 1
          while (x + r2 < OUT_W && r2 < 3 && sc[x + r2][c] === sc[x][c]) r2++
          if (r2 >= 3) break
          x++
          lit++
        }
        row.push(lit)
        for (let i = start; i < start + lit; i++) row.push(sc[i][c])
      }
    }
  }
  chunks.push(Buffer.from(row))
}
fs.mkdirSync(dst.substring(0, dst.lastIndexOf('/')), { recursive: true })
fs.writeFileSync(dst, Buffer.concat(chunks))
console.log(`${src} ${W}x${H} → ${dst} ${OUT_W}x${OUT_H} ${(fs.statSync(dst).size / 1024).toFixed(0)} KB`)
