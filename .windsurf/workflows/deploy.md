---
description: Deploy to GCP Cloud Run (preview, staging, or production)
---

# Deployment Workflow

## Prerequisites

1. GCP CLI authenticated: `gcloud auth login`
2. Docker running locally
3. Environment variables configured in `.env` files

## Quick Commands

### Preview Environment (Default)
```bash
# Deploy all services to preview
// turbo
./scripts/deploy.sh --all

# Deploy with database migrations
./scripts/deploy.sh --all --db-migrate
```

### Staging Environment
```bash
# Deploy all services to staging
./scripts/deploy.sh --all --env staging

# Deploy with migrations
./scripts/deploy.sh --all --env staging --db-migrate
```

### Production Environment
```bash
# Deploy all services to production
./scripts/deploy.sh --all --env production

# Canary deployment (10% traffic first)
./scripts/deploy.sh --all --env production --canary 10

# After monitoring, increase to 100%
./scripts/deploy.sh --all --env production
```

## Staged Deployment (Recommended for Production)

1. **Deploy without traffic**
   ```bash
   ./scripts/deploy.sh --all --env production --no-traffic
   ```

2. **Test at tagged URL** (shown in deploy output)

3. **Shift traffic to new revision**
   ```bash
   gcloud run services update-traffic lao-cinema-web --region=asia-southeast1 --to-latest
   gcloud run services update-traffic lao-cinema-api --region=asia-southeast1 --to-latest
   ```

## Database Operations

### Run migrations (safe, recommended)
```bash
./scripts/deploy.sh --db-migrate --env staging
```

### Generate and run migration (schema changes)
```bash
./scripts/deploy.sh --db-generate --env staging
```

### Sync content data
```bash
./scripts/deploy.sh --sync-content --env staging
```

## Individual Services

```bash
# API only
./scripts/deploy.sh --api --env preview

# Web only
./scripts/deploy.sh --web --env preview

# Video server only
./scripts/deploy.sh --video --env preview
```

## Rollback

```bash
./scripts/deploy.sh --rollback --env production
```

## Environment URLs

| Environment | Web | API | Video |
|-------------|-----|-----|-------|
| Preview | preview.laocinema.com | api.preview.laocinema.com | stream.preview.laocinema.com |
| Staging | staging.laocinema.com | api.staging.laocinema.com | stream.staging.laocinema.com |
| Production | laocinema.com | api.laocinema.com | stream.laocinema.com |

## Common Issues

- **Docker not running**: Start Docker Desktop before deploying
- **Auth expired**: Run `gcloud auth login` to re-authenticate
- **DB connection failed**: Ensure Cloud SQL proxy is configured correctly
