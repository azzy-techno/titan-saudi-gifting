import sharp from 'sharp';
const dir = 'blender/textures/';
const files = process.argv.slice(3);
const out = process.argv[2];
const tiles = [];
for (const f of files) {
  const [name, crop] = f.split('@');
  let img = sharp(dir + name);
  const meta = await img.metadata();
  if (crop) { const [l,t,w,h] = crop.split(',').map(Number); img = img.extract({left:l, top:t, width:w, height:h}); }
  tiles.push(await img.resize(400, 400, {fit:'fill'}).flatten({background:'#808080'}).png().toBuffer());
}
const cols = 4, rows = Math.ceil(tiles.length / cols);
await sharp({create:{width: cols*410, height: rows*410, channels:3, background:'#202020'}})
  .composite(tiles.map((b,i)=>({input:b, left:(i%cols)*410, top: Math.floor(i/cols)*410})))
  .png().toFile(out);
console.log('ok', out);
