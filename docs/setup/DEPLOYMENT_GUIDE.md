# Lao Cinema - Complete Deployment Guide

This comprehensive guide covers deploying Lao Cinema to Google Cloud Platform using Cloud Run with advanced versioning and workflow strategies.

**Quick Links:**
- [Quick Start](#quick-start) - Get deployed fast
- [Standard Deployment](#standard-deployment) - Simple 100% traffic deployment
- [Advanced Workflows](#advanced-workflows) - Test-first, canary, blue-green
- [Database Management](#database-management) - Migrations and data sync
- [Troubleshooting](#troubleshooting) - Common issues and fixes

---

## Quick Start

### Prerequisites

1. **Google Cloud CLI** installed and authenticated
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Docker** installed locally

3. **GCP Project** with billing enabled

4. **Required APIs** enabled:
   ```bash
   gcloud services enable \
     cloudbuild.googleapis.com \
     run.googleapis.com \
     sqladmin.googleapis.com \
     artifactregistry.googleapis.com
   ```

### First-Time Setup

#### 1. Create Cloud SQL PostgreSQL Instance

```bash
# Set variables
export PROJECT_ID=YOUR_PROJECT_ID
export REGION=asia-southeast1
export DB_INSTANCE_NAME=lao-cinema-db
export DB_NAME=laocinema
export DB_USER=laocinema
export DB_PASSWORD=YOUR_SECURE_PASSWORD

# Create Cloud SQL instance (PostgreSQL 16)
gcloud sql instances create $DB_INSTANCE_NAME \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=$DB_PASSWORD

# Create database
gcloud sql databases create $DB_NAME \
  --instance=$DB_INSTANCE_NAME

# Create user
gcloud sql users create $DB_USER \
  --instance=$DB_INSTANCE_NAME \
  --password=$DB_PASSWORD
```

**Production tip:** Use `db-n1-standard-1` or larger for production workloads.

#### 2. Set Up Artifact Registry

```bash
# Create Docker repository
gcloud artifacts repositories create lao-cinema \
  --repository-format=docker \
  --location=$REGION \
  --description="Lao Cinema Docker images"

# Configure Docker
gcloud auth configure-docker $REGION-docker.pkg.dev
```

---

## Standard Deployment

Use this for minor updates, bug fixes, and when you want immediate 100% traffic to the new version.

### Using the Deploy Script

```bash
./scripts/deploy.sh
```

This script:
1. Builds Docker images for API and Web
2. Pushes to Artifact Registry
3. Deploys to Cloud Run with 100% traffic
4. Outputs deployment URLs

### Manual Deployment Steps

#### Build and Push Images

```bash
# API
cd api
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest
cd ..

# Web
cd web
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest
cd ..
```

#### Deploy API

```bash
# Get Cloud SQL connection name
export CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME \
  --format='value(connectionName)')

# Deploy API service
gcloud run deploy lao-cinema-api \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=3001 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost/$DB_NAME?host=/cloudsql/$CONNECTION_NAME" \
  --add-cloudsql-instances=$CONNECTION_NAME \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10

# Get API URL
export API_URL=$(gcloud run services describe lao-cinema-api \
  --region=$REGION \
  --format='value(status.url)')
```

#### Deploy Web App

```bash
# Deploy web service
gcloud run deploy lao-cinema-web \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --set-env-vars="NEXT_PUBLIC_API_URL=$API_URL" \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10

# Get Web URL
export WEB_URL=$(gcloud run services describe lao-cinema-web \
  --region=$REGION \
  --format='value(status.url)')

echo "🚀 Deployed at: $WEB_URL"
```

---

## Advanced Workflows

Cloud Run uses **revisions** for versioning - each deployment creates a new immutable revision. You can control traffic distribution between revisions.

### Available Scripts

| Script | Use Case |
|--------|----------|
| `deploy.sh` | Standard deployment (100% traffic) |
| `deploy-staged.sh` | Advanced deployment with versioning options |
| `deploy-staged.sh --no-traffic` | Deploy without traffic (test first) |
| `deploy-staged.sh --canary 10` | Canary deployment (10% traffic) |
| `deploy-staged.sh --rollback` | Instant rollback to previous version |

### Workflow 1: Test-Then-Release

**Best for:** Major features, breaking changes, risky updates

```bash
# Step 1: Deploy without traffic
./scripts/deploy-staged.sh --no-traffic

# Step 2: Test the new version
# Visit: https://test---lao-cinema-web-xxx.run.app
# Visit: https://test---lao-cinema-api-xxx.run.app
# Test all critical features

# Step 3: Release to production
gcloud run services update-traffic lao-cinema-api \
  --region=asia-southeast1 \
  --to-latest

gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-latest
```

### Workflow 2: Canary Deployment

**Best for:** High-traffic changes, performance updates, database schema changes

```bash
# Step 1: Deploy with 10% traffic
./scripts/deploy-staged.sh --canary 10

# Step 2: Monitor for 10-30 minutes
gcloud run services logs read lao-cinema-web \
  --region=asia-southeast1 \
  --limit=100

# Step 3: Increase to 50%
./scripts/deploy-staged.sh --canary 50

# Step 4: Monitor again

# Step 5: Full release
./scripts/deploy-staged.sh
```

### Workflow 3: Blue-Green Deployment

**Best for:** Critical updates where you need instant rollback capability

```bash
# Step 1: Deploy green (new version)
./scripts/deploy-staged.sh --no-traffic --tag green

# Step 2: Test green
# Visit: https://green---lao-cinema-web-xxx.run.app

# Step 3: Switch all traffic to green
gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-tags=green=100

gcloud run services update-traffic lao-cinema-api \
  --region=asia-southeast1 \
  --to-tags=green=100
```

### Emergency Rollback

```bash
# Instant rollback to previous revision
./scripts/deploy-staged.sh --rollback
```

---

## Traffic Management

### View Current Traffic Split

```bash
gcloud run services describe lao-cinema-web \
  --region=asia-southeast1 \
  --format='value(status.traffic)'
```

### List All Revisions

```bash
gcloud run revisions list \
  --service=lao-cinema-web \
  --region=asia-southeast1
```

### Manual Traffic Control

```bash
# Send 100% traffic to latest
gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-latest

# Send 100% traffic to specific revision
gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-revisions=REVISION-NAME=100

# Split traffic between revisions (A/B testing)
gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-revisions=REVISION-A=50,REVISION-B=50
```

---

## Database Management

### Scenario A: Schema Changes Only (Preserves Data)

Use when you've modified the schema but want to keep existing data.

```bash
# 1. Start Cloud SQL Proxy
./cloud-sql-proxy $CONNECTION_NAME &

# 2. Set connection string
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME"

# 3. Push schema changes
cd db
npm run db:push

# 4. Stop proxy
killall cloud-sql-proxy
```

### Scenario B: Full Data Sync (Replace Remote with Local)

Use when you want to completely replace the remote database with your local data.

**⚠️ Warning:** This deletes ALL data in the remote database.

```bash
# 1. Start Cloud SQL Proxy
./cloud-sql-proxy $CONNECTION_NAME &

# 2. Dump local data
pg_dump -h localhost -p 5432 -U laocinema -d lao_cinema \
  --data-only --no-owner --no-acl -f local_data_dump.sql

# 3. Truncate remote tables (order matters for foreign keys)
psql "postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME" << 'EOF'
TRUNCATE TABLE 
  video_sources, movie_images, movie_genres, trailers,
  movie_external_platforms, movie_production_companies,
  movie_crew_translations, movie_crew, 
  movie_cast_translations, movie_cast, 
  movie_translations, people_translations, people,
  production_company_translations, production_companies,
  homepage_featured, movies, 
  genre_translations, genres,
  rentals, watch_progress, video_analytics_events,
  user_sessions, oauth_accounts, users,
  audit_logs
CASCADE;
EOF

# 4. Restore local data to remote
psql "postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME" -f local_data_dump.sql

# 5. Cleanup
rm local_data_dump.sql
killall cloud-sql-proxy
```

### Cloud SQL Proxy Setup

```bash
# Download (macOS ARM)
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.arm64
chmod +x cloud-sql-proxy

# Or macOS Intel
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy
```

---

## Monitoring and Logs

### View Logs

```bash
# API logs
gcloud run services logs read lao-cinema-api \
  --region=$REGION \
  --limit=50

# Web logs
gcloud run services logs read lao-cinema-web \
  --region=$REGION \
  --limit=50

# Tail logs (live)
gcloud run services logs tail lao-cinema-web \
  --region=$REGION

# Logs for specific revision
gcloud run services logs read lao-cinema-web \
  --region=$REGION \
  --filter="resource.labels.revision_name=REVISION-NAME"
```

### Cloud SQL Logs

```bash
gcloud sql operations list --instance=$DB_INSTANCE_NAME
```

---

## Environment Variables

### API Service

- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL connection string with Cloud SQL socket
- `CORS_ORIGIN` - Web app URL for CORS
- `PORT=3001`
- `HOST=0.0.0.0`
- `LOG_LEVEL=info`

### Web Service

- `NEXT_PUBLIC_API_URL` - API service URL
- `NODE_ENV=production`

### Update Environment Variables

```bash
# Update API
gcloud run services update lao-cinema-api \
  --region=$REGION \
  --set-env-vars="CORS_ORIGIN=$WEB_URL"

# Update Web
gcloud run services update lao-cinema-web \
  --region=$REGION \
  --set-env-vars="NEXT_PUBLIC_API_URL=$API_URL"
```

---

## Troubleshooting

### API Can't Connect to Database

**Check Cloud SQL instance:**
```bash
gcloud sql instances describe $DB_INSTANCE_NAME
```

**Verify:**
- Cloud SQL instance is running
- Cloud Run service has `--add-cloudsql-instances` flag
- DATABASE_URL format includes `/cloudsql/$CONNECTION_NAME`

### CORS Errors

- Update API `CORS_ORIGIN` environment variable with exact web app URL
- Ensure web URL matches (including https://)

### Build Failures

**Docker Build Issue - Schema Imports:**
API Docker build fails with "Cannot find module '../../../db/src/schema.js'"

**Solution:** All API files must import from local re-export `'../db/schema.js'` instead of monorepo path `'../../../db/src/schema.js'`

**Affected files:**
- `api/src/lib/auth-middleware.ts`
- `api/src/lib/auth-service.ts`
- All route files

**Check build:**
```bash
docker build --progress=plain .
```

**Verify:**
- `next.config.ts` has `output: 'standalone'`
- All dependencies are in package.json

### Database Migration Errors

**Common errors:**
- `ERROR: relation "__drizzle_migrations" does not exist` - Remove from TRUNCATE list
- `ERROR: duplicate key value violates unique constraint` - Truncate tables first
- `zsh: event not found: @127.0.0.1` - Use single quotes around DATABASE_URL

**Database name differences:**
- Local: `lao_cinema` (with underscore)
- Cloud SQL: `laocinema` (no underscore)

**Use single quotes for special characters:**
```bash
export DATABASE_URL='postgresql://user:Pass!word@host/db'
```

### Rollback Not Working

```bash
# List revisions to find working one
gcloud run revisions list \
  --service=lao-cinema-web \
  --region=$REGION \
  --limit=10

# Manually set traffic to specific revision
gcloud run services update-traffic lao-cinema-web \
  --region=$REGION \
  --to-revisions=WORKING-REVISION=100
```

---

## Complete Deployment Flow

```bash
# 1. Ensure schema imports are correct
git status

# 2. Deploy to Cloud Run
./scripts/deploy.sh
# OR for staged deployment
./scripts/deploy-staged.sh --no-traffic

# 3. Run migrations
./cloud-sql-proxy $CONNECTION_NAME &
cd db
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME"
npm run db:push
cd ..

# 4. (Optional) Migrate local data
pg_dump -h localhost -p 5432 -U laocinema -d lao_cinema \
  --data-only --no-owner --no-acl -f local_data_dump.sql
# ... truncate and restore as shown above

# 5. Cleanup
killall cloud-sql-proxy

# 6. Verify deployment
# Visit: https://lao-cinema-web-xxx.run.app
# Test: Movies load, videos play, admin panel accessible
```

---

## Decision Tree

```
What are you deploying?
│
├─ Minor update / Bug fix
│  └─> Use: ./scripts/deploy.sh
│
├─ Major feature / Breaking change
│  └─> Use: ./scripts/deploy-staged.sh --no-traffic
│         Test → Release
│
└─ High-risk / Performance change
   └─> Use: Canary deployment
          10% → 50% → 100%
```

---

## Pre-Deployment Checklist

- [ ] Code reviewed and merged to main
- [ ] All tests passing locally
- [ ] Database migrations tested (if applicable)
- [ ] Environment variables updated (if needed)
- [ ] Chose appropriate deployment strategy
- [ ] Team notified of deployment
- [ ] Rollback plan ready

## Post-Deployment Checklist

- [ ] Services are healthy
- [ ] Check logs for errors
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Verify database connectivity
- [ ] Check API response times
- [ ] Confirm video playback works

## Rollback Criteria

**Rollback immediately if:**
- 5xx error rate > 1%
- API response time > 3 seconds
- Video playback failures > 5%
- Database connection errors
- Critical feature completely broken

**Monitor closely if:**
- Minor UI glitches
- Non-critical features affected
- Slightly elevated error rates
- Performance degradation < 20%

---

## Cost Optimization

For demo/limited use:

1. **Cloud Run**: Scales to zero (free when not in use)
   - First 2 million requests/month free
   - ~$0.00002400/request after

2. **Cloud SQL**: 
   - Use `db-f1-micro` ($7-10/month)
   - Stop instance when not in use:
     ```bash
     gcloud sql instances patch $DB_INSTANCE_NAME --activation-policy=NEVER
     ```
   - Restart:
     ```bash
     gcloud sql instances patch $DB_INSTANCE_NAME --activation-policy=ALWAYS
     ```

3. **Artifact Registry**: First 0.5 GB free

**Total estimated cost**: $10-20/month for limited demo

---

## Security: Password Protection

The web app includes **role-based HTTP Basic Auth** middleware. See `docs/setup/PASSWORD_PROTECTION.md` for full details.

**Two user roles:**
- `admin` - Full access including admin pages
- `viewer` - Public pages only (no admin access)

**Enable:**
```bash
--set-env-vars="AUTH_USERS=admin:AdminPass:admin,test:TestPass:viewer"
```

Format: `username:password:role` separated by commas

---

## Cleanup

To remove all resources:

```bash
# Delete Cloud Run services
gcloud run services delete lao-cinema-api --region=$REGION
gcloud run services delete lao-cinema-web --region=$REGION

# Delete Cloud SQL instance
gcloud sql instances delete $DB_INSTANCE_NAME

# Delete Artifact Registry repository
gcloud artifacts repositories delete lao-cinema --location=$REGION

# Delete Docker images locally
docker rmi $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest
docker rmi $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest
```

---

## Next Steps

- [ ] Set up **Cloud Build** for CI/CD from GitHub
- [ ] Configure **custom domain** with Cloud DNS
- [ ] Add **Cloud CDN** for static assets
- [ ] Set up **Cloud Monitoring** alerts
- [ ] Configure **Cloud Armor** for DDoS protection

---

## Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Proxy Documentation](https://cloud.google.com/sql/docs/postgres/sql-proxy)
- [Password Protection Setup](./PASSWORD_PROTECTION.md)
- [GCP Cost Projections](../GCP_COST_PROJECTION.md)
