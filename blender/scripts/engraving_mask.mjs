// engraving_mask.mjs -- caseback engraving mask (white = engraved) for the QC2 caseback render.
// Text is shaped by sharp/libvips (Pango + HarfBuzz) so Arabic joins correctly. Fonts: OFL @fontsource
// woff2 files converted to TrueType with subset-font (written to blender/textures/fonts/).
// The square canvas maps 1:1 onto the medallion UVs (0..1 = 26 mm), u = 0.5 - x/26 so the
// image reads correctly when the caseback is seen from behind (12 o'clock up).
// Usage (project root): node blender/scripts/engraving_mask.mjs
import sharp from 'sharp';
import subsetFont from 'subset-font';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SIZE = 2048;                 // px for 26 mm -> 78.8 px/mm
const MM = SIZE / 26;
const EN = 'WITH GRATITUDE · 25 YEARS';
const AR = 'مع خالص الشكر والتقدير';
const OUT_DIR = 'blender/textures';
const FONT_DIR = `${OUT_DIR}/fonts`;
mkdirSync(FONT_DIR, { recursive: true });

async function ttf(src, text, name) {
  const buf = readFileSync(src);
  const out = await subsetFont(buf, text + ' ', { targetFormat: 'truetype' });
  const path = `${FONT_DIR}/${name}.ttf`;
  writeFileSync(path, out);
  return path;
}

const enFont = await ttf('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2', EN, 'InstrumentSerif-Regular-subset');
const arFont = await ttf('node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff2', AR, 'Amiri-Regular-subset');

async function textImage(markup, fontfile, font, dpi) {
  // no width -> no wrapping; fitted to the target width afterwards
  const img = sharp({ text: { text: markup, fontfile, font, align: 'centre', rgba: true, dpi } });
  const { data, info } = await img.png().toBuffer({ resolveWithObject: true });
  return { data, info };
}

// EN: letter-spaced capitals (Pango letter_spacing in 1/1024 pt)
const en = await textImage(`<span foreground="#FFFFFF" letter_spacing="2600">${EN.replace('&', '&amp;')}</span>`, enFont, 'Instrument Serif 32', 380);
// AR: no letter-spacing on Arabic (brand typography rule)
const ar = await textImage(`<span foreground="#FFFFFF">${AR}</span>`, arFont, 'Amiri 30', 440);

// border ring (engraved hairline) at r = 12.15 mm, 0.14 mm wide
const r = 12.15 * MM;
const ring = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${r}" fill="none" stroke="white" stroke-width="${0.14 * MM}"/>
  <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${r - 0.55 * MM}" fill="none" stroke="white" stroke-width="${0.05 * MM}"/>
</svg>`);

function fitWidth(info, maxMm) {
  const s = Math.min(1, (maxMm * MM) / info.width);
  return { w: Math.round(info.width * s), h: Math.round(info.height * s) };
}
const enSz = fitWidth(en.info, 18.6);
const arSz = fitWidth(ar.info, 16.4);
const enBuf = await sharp(en.data).resize(enSz.w, enSz.h).toBuffer();
const arBuf = await sharp(ar.data).resize(arSz.w, arSz.h).toBuffer();
const gap = 1.1 * MM;
const total = enSz.h + gap + arSz.h;
const top0 = Math.round(SIZE / 2 - total / 2);

const base = sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
const rgba = await base.composite([
  { input: ring, left: 0, top: 0 },
  { input: enBuf, left: Math.round(SIZE / 2 - enSz.w / 2), top: top0 },
  { input: arBuf, left: Math.round(SIZE / 2 - arSz.w / 2), top: Math.round(top0 + enSz.h + gap) },
]).png().toBuffer();
// mask = alpha (white engraved on black), image space with 12 o'clock at the top (as seen from behind)
const mask = await sharp(rgba).extractChannel('alpha').toColourspace('b-w').png().toBuffer();
await sharp(mask).toFile(`${OUT_DIR}/engraving_mask.png`);
await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: '#0A0A0B' } })
  .composite([{ input: rgba }]).png().toFile('blender/wip/engraving_preview.png');
console.log(JSON.stringify({ mask: `${OUT_DIR}/engraving_mask.png`, enFont, arFont, en: enSz, ar: arSz }));
