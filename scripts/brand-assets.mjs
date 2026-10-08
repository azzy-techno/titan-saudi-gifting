/**
 * Brand assets from the supplied raster logo (brand/titan-logo.png, black on white, 447×447).
 * Recolouring only (alpha from luminance) at native resolution — the trademark is NOT traced or redrawn.
 */
import sharp from 'sharp'
import fs from 'node:fs'

const SRC = 'brand/titan-logo.png'
const BONE = { r: 236, g: 231, b: 223 }

async function alphaLogo(out, color, region) {
  let img = sharp(SRC).removeAlpha().greyscale()
  if (region) img = img.extract(region)
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const rgba = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0; i < info.width * info.height; i++) {
    const a = 255 - data[i]
    rgba[i * 4] = color.r
    rgba[i * 4 + 1] = color.g
    rgba[i * 4 + 2] = color.b
    rgba[i * 4 + 3] = a < 8 ? 0 : a
  }
  const trimmed = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true })
  fs.writeFileSync(out, trimmed.data)
  console.log(out, trimmed.info.width, 'x', trimmed.info.height, trimmed.data.length, 'bytes')
  return trimmed.info
}

const meta = await sharp(SRC).metadata()
console.log('source', meta.width, meta.height)
await alphaLogo('public/brand/titan-logo-light.png', BONE)
// Mark only (the emblem above the wordmark) — for favicon and small spaces
await alphaLogo('public/brand/titan-mark-light.png', BONE, { left: 0, top: 60, width: meta.width, height: 160 })
// Favicon: mark on ink, 64×64
const mark = await sharp('public/brand/titan-mark-light.png').resize(44, 44, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 11, g: 10, b: 9, alpha: 1 } } })
  .composite([{ input: mark, gravity: 'center' }])
  .png()
  .toFile('src/app/icon.png')
console.log('src/app/icon.png')
