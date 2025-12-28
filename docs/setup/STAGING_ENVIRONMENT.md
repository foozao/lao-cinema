# Staging Environment Setup

This document explains the staging environment infrastructure and deployment process.

## Overview

The staging environment is **completely isolated** from preview and production:

| Resource | Preview | Staging | Production |
|----------|---------|---------|------------|
| **Web Domain** | preview.laocinema.com | staging.laocinema.com | laocinema.com |
| **API Domain** | api.preview.laocinema.com | api.staging.laocinema.com | api.laocinema.com |
| **Video Domain** | stream.preview.laocinema.com | stream.staging.laocinema.com | stream.laocinema.com |
| **Cloud SQL** | `laocinema` | `laocinema-staging` | `laocinema` (future) |
| **GCS Bucket** | `lao-cinema-videos` | `lao-cinema-videos-staging` | `lao-cinema-videos` (future) |

## Why Separate Infrastructure?

Staging is where you:
- Test new features before production
- Run destructive operations safely
- Break things without affecting preview
- Experiment with schema changes
- Load test with production-like data

**Preview** and **Production** share the same database (for now), so staging needs its own infrastructure to avoid disrupting either environment.

## Initial Setup

### 1. Create Staging Infrastructure

Run the automated setup script:

```bash
./scripts/setup-staging-infrastructure.sh
```

This creates:
- Cloud SQL instance: `laocinema-staging` (PostgreSQL 16, db-f1-micro)
- Database: `laocinema`
- User: `laocinema`
- GCS bucket: `lao-cinema-videos-staging`

**Save the passwords** displayed at the end - you'll need them for deployment.

### 2. Set Environment Variables

Add the staging database password to your environment:

```bash
# Add to ~/.zshrc or ~/.bashrc
export CLOUD_DB_PASS_STAGING='<password-from-setup-script>'

# Reload shell
source ~/.zshrc
```

### 3. DNS and SSL (Already Done)

DNS records and Cloud Run domain mappings were created during the initial staging setup:
- `staging.laocinema.com` → lao-cinema-web
- `api.staging.laocinema.com` → lao-cinema-api
- `stream.staging.laocinema.com` → lao-cinema-video

SSL certificates are automatically provisioned and renewed.

## Deployment

### Deploy to Staging

```bash
# Deploy all services with local data
./scripts/deploy.sh --all --env staging --db-wipe

# Deploy without data migration (schema only)
./scripts/deploy.sh --all --env staging --db-update

# Deploy specific service
./scripts/deploy.sh --api --env staging
```

### Environment Variables

The deploy script automatically uses staging-specific resources when `--env staging` is set:

- `DB_INSTANCE_NAME`: `laocinema-staging`
- `VIDEO_BUCKET`: `lao-cinema-videos-staging`
- `CLOUD_DB_PASS`: Uses `$CLOUD_DB_PASS_STAGING` (falls back to `$CLOUD_DB_PASS`)

## Database Management

### Initialize Schema

On first deployment, push the schema to the new staging database:

```bash
# Start Cloud SQL Proxy
CONNECTION_NAME=$(gcloud sql instances describe laocinema-staging --format='value(connectionName)')
./cloud-sql-proxy $CONNECTION_NAME --port=5433 &

# Push schema
cd db
DATABASE_URL='postgresql://laocinema:<password>@127.0.0.1:5433/laocinema' npm run db:push
cd ..

# Stop proxy
killall cloud-sql-proxy
```

### Migrate Data from Local

```bash
# Deploy with --db-wipe flag (destructive)
./scripts/deploy.sh --all --env staging --db-wipe

# Or manually:
./scripts/sync-db-to-cloud.sh
# (Update script to use laocinema-staging instance)
```

### Sync Content Only

```bash
./scripts/deploy.sh --env staging --sync-content
```

## Video Files

### Upload Videos to Staging Bucket

```bash
# Upload single file
gcloud storage cp local-video.mp4 gs://lao-cinema-videos-staging/hls/

# Upload directory
gcloud storage cp -r local-videos/* gs://lao-cinema-videos-staging/hls/

# Sync from preview bucket (for testing)
gcloud storage rsync gs://lao-cinema-videos/ gs://lao-cinema-videos-staging/ --recursive
```

### Video URLs

Staging videos are served from:
- Direct: `https://storage.googleapis.com/lao-cinema-videos-staging/hls/`
- Via video server: `https://stream.staging.laocinema.com/`

## Testing Staging

### Access Staging Site

```bash
# Web
open https://staging.laocinema.com

# API Health Check
curl https://api.staging.laocinema.com/health

# Video Server
curl https://stream.staging.laocinema.com/health
```

### HTTP Basic Auth

Same credentials as preview (for now):
- Username: `admin` / Password: `uCQkoNT_DsUTo6` (admin)
- Username: `test` / Password: `LaoCinema5050` (viewer)

See `docs/FUTURE.md` for plans to use environment-specific credentials.

## Staged Deployments

Test changes in staging before full release:

```bash
# 1. Deploy without traffic (test new revision)
./scripts/deploy.sh --all --env staging --no-traffic

# 2. Test at tagged URL
# https://test---lao-cinema-web-<hash>.asia-southeast1.run.app

# 3. Release to staging (100% traffic)
gcloud run services update-traffic lao-cinema-web --region=asia-southeast1 --to-latest

# 4. Or use canary (10% traffic)
./scripts/deploy.sh --all --env staging --canary 10

# 5. Rollback if needed
./scripts/deploy.sh --env staging --rollback
```

## Cost Considerations

**Staging Infrastructure Costs** (approximate):
- Cloud SQL (db-f1-micro): ~$10-15/month
- GCS Storage: ~$0.02/GB/month
- Cloud Run: Pay per use (minimal when idle)

**Total**: ~$10-20/month for dedicated staging environment

## Troubleshooting

### Database Connection Issues

```bash
# Verify instance exists
gcloud sql instances describe laocinema-staging

# Check connection name
gcloud sql instances describe laocinema-staging --format='value(connectionName)'

# Test connection via proxy
./cloud-sql-proxy <connection-name> --port=5433 &
psql 'postgresql://laocinema:<password>@127.0.0.1:5433/laocinema'
```

### GCS Bucket Access

```bash
# List files
gcloud storage ls gs://lao-cinema-videos-staging/

# Check permissions
gcloud storage buckets describe gs://lao-cinema-videos-staging

# Test public access
curl https://storage.googleapis.com/lao-cinema-videos-staging/hls/test.m3u8
```

### Deployment Fails

```bash
# Check Cloud Run logs
gcloud run services logs read lao-cinema-api --region=asia-southeast1 --limit=50

# Verify environment variables
gcloud run services describe lao-cinema-api --region=asia-southeast1 --format='value(spec.template.spec.containers[0].env)'

# Check if correct DB instance is used
gcloud run services describe lao-cinema-api --region=asia-southeast1 --format='value(spec.template.spec.containers[0].env[?(@.name=="INSTANCE_CONNECTION_NAME")].value)'
```

## Cleanup

To delete staging infrastructure (if needed):

```bash
# Delete Cloud SQL instance
gcloud sql instances delete laocinema-staging

# Delete GCS bucket
gcloud storage rm -r gs://lao-cinema-videos-staging/

# Remove domain mappings
gcloud beta run domain-mappings delete --domain=staging.laocinema.com --region=asia-southeast1
gcloud beta run domain-mappings delete --domain=api.staging.laocinema.com --region=asia-southeast1
gcloud beta run domain-mappings delete --domain=stream.staging.laocinema.com --region=asia-southeast1
```

## Next Steps

1. ✅ Staging infrastructure created
2. ✅ DNS and SSL configured
3. ✅ Deploy script updated for environment-specific resources
4. 🔄 Deploy to staging with `--db-wipe`
5. 📋 Test staging environment thoroughly
6. 🚀 Use staging for all testing before production releases

## Related Documentation

- [Custom Domain Setup](./CUSTOM_DOMAIN.md)
- [Backend Setup](./BACKEND_SETUP.md)
- [Deployment Guide](../../scripts/deploy.sh) (run with `--help`)
- [Future Enhancements](../FUTURE.md) (environment-specific auth)
