// composite.mjs -- flatten transparent Cycles renders onto the site's near-black (#0A0A0B).
// Usage (project root): node blender/scripts/composite.mjs <in.png> <out.png> [--bg #0A0A0B] [--webp]
import sharp from 'sharp';

const args = process.argv.slice(2);
const inp = args[0];
const out = args[1];
const bgIdx = args.indexOf('--bg');
const bg = bgIdx >= 0 ? args[bgIdx + 1] : '#0A0A0B';
let img = sharp(inp).flatten({ background: bg });
if (out.endsWith('.webp')) img = img.webp({ quality: 92 });
else img = img.png({ compressionLevel: 9 });
await img.toFile(out);
const meta = await sharp(out).metadata();
console.log(JSON.stringify({ out, width: meta.width, height: meta.height, bg }));
