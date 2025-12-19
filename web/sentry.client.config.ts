// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions in production

  // Session Replay - capture errors with full context
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  integrations: [
    Sentry.replayIntegration({
      // Mask all text content for privacy
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    /extensions\//i,
    /^chrome-extension:\/\//i,
    // Network errors that are expected
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    // User-triggered navigation
    "AbortError",
  ],

  // Set environment
  environment: process.env.NODE_ENV,
});
