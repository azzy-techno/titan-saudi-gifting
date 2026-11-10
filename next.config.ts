import type { NextConfig } from 'next'

/** '' at a domain root; '/titan-saudi-gifting' for GitHub Pages (see src/lib/basePath.ts). */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // no dev badge over the HUD in QA captures
  devIndicators: false,
  experimental: {
    // CSS arrives with the HTML: no render-blocking stylesheet round trip for first-time visitors
    inlineCss: true,
  },
}

export default nextConfig
