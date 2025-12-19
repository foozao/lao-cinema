# Sentry Error Monitoring Setup

This document explains how Sentry error monitoring is configured for the Lao Cinema platform.

## Overview

Sentry captures errors and performance data from both the Next.js web app and Fastify API in production.

**Free Tier Limits:**
- 5,000 error events/month
- 10,000 performance transactions/month
- 5,000 replay sessions/month
- 1 team member
- 14 days data retention

## Projects

Two separate Sentry projects are configured:
1. **lao-cinema-web** - Next.js frontend (client + server + edge)
2. **lao-cinema-api** - Fastify backend

## Local Development

Sentry is **disabled** in development mode to avoid wasting quota. It only runs when `NODE_ENV=production`.

### Testing Sentry Locally

To test Sentry integration in development:

1. Temporarily enable in config files (see TODO comments)
2. Restart servers
3. Visit http://localhost:3000/en/test-error
4. Trigger test errors
5. Revert configs back to production-only

## Production Deployment

### Environment Variables Required

Before deploying, set these environment variables in your shell:

```bash
# Get these DSNs from your Sentry dashboard
export SENTRY_WEB_DSN="https://xxx@xxx.ingest.sentry.io/web-project-id"
export SENTRY_API_DSN="https://yyy@yyy.ingest.sentry.io/api-project-id"

# Also required for deployment
export CLOUD_DB_PASS="your-db-password"
```

### Deploy

```bash
./scripts/deploy.sh
```

The deployment script will:
- Set `NEXT_PUBLIC_SENTRY_DSN` for the web app
- Set `SENTRY_DSN` for the API
- Set `NODE_ENV=production` for both services

### Verify Deployment

After deployment:
1. Visit your production site
2. Trigger an error (or wait for natural errors)
3. Check Sentry dashboard for captured errors

## Configuration Files

### Web App (Next.js)
- `web/sentry.client.config.ts` - Browser error tracking
- `web/sentry.server.config.ts` - Server-side error tracking
- `web/sentry.edge.config.ts` - Edge runtime tracking
- `web/instrumentation.ts` - Server/edge initialization
- `web/instrumentation-client.ts` - Client initialization

### API (Fastify)
- `api/src/lib/sentry.ts` - Sentry initialization and helpers
- `api/src/index.ts` - Calls `initSentry()` on startup

## Features Enabled

### Web App
- ✅ Client-side error capture
- ✅ Server-side error capture
- ✅ Edge runtime error capture
- ✅ Performance monitoring (10% sample rate)
- ✅ Session replay (10% sessions, 100% on errors)
- ✅ Source maps uploaded automatically
- ✅ Ad-blocker bypass via `/monitoring` tunnel

### API
- ✅ Error capture with context
- ✅ Performance monitoring (10% sample rate)
- ✅ Sensitive data filtering (auth headers, cookies)
- ✅ Request context attached to errors

## Error Filtering

Both apps filter out noisy errors:
- Browser extension errors
- Network timeouts (expected)
- User-triggered navigation cancellations

## Monitoring Usage

Check your Sentry dashboard regularly:
1. Go to **Settings** → **Usage & Billing**
2. Monitor error event count
3. Set up alerts at 80% of quota
4. Upgrade to Team plan ($29/mo) if needed

## Troubleshooting

### Errors not appearing in Sentry

1. Check `NODE_ENV` is set to `production`
2. Verify DSN environment variables are set correctly
3. Check Cloud Run logs for Sentry initialization messages
4. Ensure no ad-blockers are interfering (use `/monitoring` tunnel)

### Too many errors

1. Review error patterns in Sentry dashboard
2. Add filters to `ignoreErrors` in config files
3. Fix underlying issues causing errors
4. Consider upgrading plan if legitimate errors exceed quota

## Cost Management

To stay within free tier:
- Keep error rate low by fixing bugs promptly
- Use error filtering to reduce noise
- Monitor usage weekly during initial rollout
- Budget for Team plan ($29/mo) once you have >20 active users

## Test Endpoints

For testing Sentry integration:
- Web: http://localhost:3000/en/test-error (dev only)
- API: GET /api/test-error (dev only)

**Note:** Remove test endpoints before production launch.

## Additional Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Node.js Docs](https://docs.sentry.io/platforms/javascript/guides/node/)
- [Sentry Pricing](https://sentry.io/pricing/)
