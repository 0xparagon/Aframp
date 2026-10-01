import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Limit concurrency only in resource-constrained CI environments.
    // Set CI_LOW_RESOURCES=1 in your CI pipeline to enable these caps;
    // leave it unset for normal development and production builds so they
    // use all available CPU cores.
    ...(process.env.CI_LOW_RESOURCES
      ? {
          cpus: 1,
          staticGenerationMaxConcurrency: 1,
          staticGenerationMinPagesPerWorker: 1,
        }
      : {}),
  },
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  output: 'standalone',
  // The browser only ever calls this app's own origin at `/backend/*`; this
  // forwards those requests server-side to the real backend. NEXT_API_URL
  // (deliberately not NEXT_PUBLIC_*) never reaches client-side code — it
  // can't leak via devtools, a bundle diff, or CSP `connect-src`.
  rewrites() {
    const backendUrl = (process.env.NEXT_API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')
    return [
      {
        source: '/backend/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
  headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.coingecko.com https://horizon.stellar.org https://horizon-testnet.stellar.org https://*.sentry.io https://*.ingest.us.sentry.io https://vitals.vercel-insights.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
})

export default withSentryConfig(withAnalyzer(nextConfig))
