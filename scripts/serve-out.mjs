#!/usr/bin/env node
/** Minimal static server for out/ (Cloudflare-Pages-like trailing-slash + 404 handling). PORT=4173 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('out')
const PORT = Number(process.env.PORT ?? 4173)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream', '.txt': 'text/plain',
  '.xml': 'application/xml', '.ico': 'image/x-icon', '.webm': 'video/webm', '.mp4': 'video/mp4',
}
http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0])
    let file = path.join(ROOT, url)
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end()
      return
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!url.endsWith('/')) {
        res.writeHead(308, { location: url + '/' }).end()
        return
      }
      file = path.join(file, 'index.html')
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'content-type': TYPES['.html'] })
      fs.createReadStream(path.join(ROOT, '404.html')).pipe(res)
      return
    }
    const ext = path.extname(file)
    const immutable = url.startsWith('/_next/static/')
    res.writeHead(200, {
      'content-type': TYPES[ext] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
      'content-length': fs.statSync(file).size,
    })
    if (req.method === 'HEAD') res.end()
    else fs.createReadStream(file).pipe(res)
  })
  .listen(PORT, () => console.log(`serving out/ on http://localhost:${PORT}`))
