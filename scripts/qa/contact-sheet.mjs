#!/usr/bin/env node
/** node scripts/qa/contact-sheet.mjs <dir> <out.png> [cols=4] [thumbWidth=480] — grid of fNN.png frames with indices */
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const [dir, out, colsArg, twArg] = process.argv.slice(2)
const files = fs
  .readdirSync(dir)
  .filter((f) => /^(f\d+|m\d+|\d\d-[\w-]+)\.png$/.test(f))
  .sort()
const cols = Number(colsArg ?? 4)
const tw = Number(twArg ?? 480)
const first = await sharp(path.join(dir, files[0])).metadata()
const th = Math.round((tw * first.height) / first.width)
const rows = Math.ceil(files.length / cols)
const pad = 8
const W = cols * tw + (cols + 1) * pad
const H = rows * (th + 22) + (rows + 1) * pad
const composites = []
for (const [i, f] of files.entries()) {
  const x = pad + (i % cols) * (tw + pad)
  const y = pad + Math.floor(i / cols) * (th + 22 + pad)
  composites.push({ input: await sharp(path.join(dir, f)).resize(tw, th).toBuffer(), left: x, top: y + 22 })
  composites.push({
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="20"><text x="2" y="15" font-family="Consolas" font-size="14" fill="#c4a46f">${f.replace('.png', '')}</text></svg>`),
    left: x,
    top: y,
  })
}
await sharp({ create: { width: W, height: H, channels: 3, background: '#222' } }).composite(composites).png().toFile(out)
console.log(out, W, 'x', H)
