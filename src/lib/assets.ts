/**
 * Render-pipeline assets (Blender → scripts/render-assets). Flip `ready` once the files exist.
 * Posters are composed with the SAME cameras as the live scene (config/cameras.json), so the
 * crossfade poster → WebGL is seamless. RTL has its own composition (never a mirrored image).
 */
import { asset } from '@/lib/basePath'
export const POSTER = {
  ready: false,
  desktopEn: { avif: asset('/img/poster/hero-desktop-en.avif'), webp: asset('/img/poster/hero-desktop-en.webp'), w: 2520, h: 1080 },
  desktopAr: { avif: asset('/img/poster/hero-desktop-ar.avif'), webp: asset('/img/poster/hero-desktop-ar.webp'), w: 2520, h: 1080 },
  mobile: { avif: asset('/img/poster/hero-mobile.avif'), webp: asset('/img/poster/hero-mobile.webp'), w: 900, h: 1950 },
} as const
