import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone', // Required for Docker deployment
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3002',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/lao-cinema-images/**',
      },
    ],
  },
  // Skip TypeScript checking during production build (checked during dev)
  typescript: {
    ignoreBuildErrors: true,
  },
};

// Wrap with next-intl first, then Sentry
const configWithIntl = withNextIntl(nextConfig);

export default withSentryConfig(configWithIntl, {
  // Sentry organization and project (set in Sentry dashboard)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps (set in CI/CD)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Route Sentry requests through your server to avoid ad-blockers
  tunnelRoute: "/monitoring",

  // Suppress logs during build unless in CI
  silent: !process.env.CI,

  // Hide source maps from browser devtools in production
  hideSourceMaps: true,

  // Disable Sentry features in development
  disableLogger: true,
});
