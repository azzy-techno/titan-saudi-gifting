/**
 * Clearly-labelled PLACEHOLDER images for chapter 05 (official media kit pending — CONTENT_TODO A3).
 * Typographic only; no product imagery is invented. Boska is used to make an image (permitted by ITF FFL §01).
 */
import sharp from 'sharp'

const W = 1000
const H = 1250
const items = [
  ['edge', 'Edge'],
  ['raga', 'Raga'],
  ['nebula', 'Nebula'],
  ['mechanicals', 'Mechanicals'],
  ['stellar', 'Stellar'],
]
const BOSKA = '.cache/fontshare/boska/Boska_Complete/Fonts/OTF/Boska-Light.otf'

for (const [id, name] of items) {
  const title = await sharp({
    text: { text: `<span foreground="#ECE7DF">${name}</span>`, font: 'Boska Light 150', fontfile: BOSKA, rgba: true, dpi: 72 },
  }).png().toBuffer()
  const meta = await sharp(title).metadata()
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="100%" height="100%" fill="#121110"/>
    <rect x="28.5" y="28.5" width="${W - 57}" height="${H - 57}" fill="none" stroke="#ECE7DF" stroke-opacity="0.16"/>
    <line x1="60" y1="${H - 150}" x2="${W - 60}" y2="${H - 150}" stroke="#ECE7DF" stroke-opacity="0.16"/>
    <text x="60" y="96" fill="#C4A46F" font-family="Consolas, monospace" font-size="20" letter-spacing="3">PLACEHOLDER</text>
    <text x="60" y="${H - 104}" fill="#8F887D" font-family="Consolas, monospace" font-size="18" letter-spacing="3">OFFICIAL IMAGE PENDING — FRANCHISE MEDIA KIT</text>
    <text x="60" y="${H - 72}" fill="#8F887D" font-family="Consolas, monospace" font-size="18" letter-spacing="3">TITAN ${name.toUpperCase()}</text>
  </svg>`)
  await sharp(svg)
    .composite([{ input: title, left: Math.round((W - meta.width) / 2), top: Math.round(H * 0.42 - meta.height / 2) }])
    .webp({ quality: 82 })
    .toFile(`public/img/collections/${id}.webp`)
  console.log(id, 'ok')
}
