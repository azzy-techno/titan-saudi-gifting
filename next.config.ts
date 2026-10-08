import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // CSS arrives with the HTML: no render-blocking stylesheet round trip for first-time visitors
    inlineCss: true,
  },
}

export default nextConfig
