/**
 * Sub-path the site is served from — '' at a domain root (Cloudflare Pages), '/titan-saudi-gifting' on
 * GitHub Pages. Set at build time with NEXT_PUBLIC_BASE_PATH (next.config.ts reads the same variable).
 * Next adds it to routes and its own bundles; files from /public need it added by hand: use `asset()`.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** URL of a file in /public, under the base path: asset('/models/watch.glb'). */
export const asset = (path: string): string => `${BASE_PATH}${path}`
