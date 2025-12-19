// Sentry initialization for API server
// https://docs.sentry.io/platforms/javascript/guides/node/

import * as Sentry from "@sentry/node";

export function initSentry() {
  // Only initialize in production
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (!process.env.SENTRY_DSN) {
    console.warn("⚠️ SENTRY_DSN not set - error monitoring disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Set environment
    environment: process.env.NODE_ENV,

    // Filter out noisy errors
    ignoreErrors: [
      // Expected errors
      "ECONNRESET",
      "EPIPE",
      "ECONNREFUSED",
    ],

    // Add context to errors
    beforeSend(event) {
      // Remove sensitive data
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });

  console.log("✅ Sentry error monitoring initialized");
}

// Helper to capture errors with context
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("Error:", error, context);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

// Re-export Sentry for direct access
export { Sentry };
