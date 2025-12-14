# Deployment Workflows - Quick Reference

## Available Scripts

1. **`scripts/deploy.sh`** - Original script (immediate 100% traffic)
2. **`scripts/deploy-staged.sh`** - New script with versioning support

## Common Workflows

### 1. Standard Deployment (Original Behavior)

```bash
# Deploy with 100% traffic immediately
./scripts/deploy.sh
# OR
./scripts/deploy-staged.sh
```

**When to use:** Minor updates, bug fixes, low-risk changes

---

### 2. Test-Then-Release (Recommended for Major Changes)

```bash
# Step 1: Deploy without traffic
./scripts/deploy-staged.sh --no-traffic

# Step 2: Test the new version
# Visit: https://test---lao-cinema-web-xxx.run.app
# Visit: https://test---lao-cinema-api-xxx.run.app

# Step 3: Release to production
gcloud run services update-traffic lao-cinema-api \
  --region=asia-southeast1 \
  --to-latest

gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-latest
```

**When to use:** Major features, breaking changes, risky updates

---

### 3. Canary Deployment (Gradual Rollout)

```bash
# Step 1: Deploy with 10% traffic
./scripts/deploy-staged.sh --canary 10

# Step 2: Monitor for 10-30 minutes
gcloud run services logs read lao-cinema-web \
  --region=asia-southeast1 \
  --limit=100

# Step 3: Increase to 50%
./scripts/deploy-staged.sh --canary 50

# Step 4: Full release
./scripts/deploy-staged.sh
```

**When to use:** High-traffic changes, performance updates, database schema changes

---

### 4. Blue-Green Deployment (Instant Switch)

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

**When to use:** Critical updates where you need instant rollback capability

---

### 5. Emergency Rollback

```bash
# Instant rollback to previous revision
./scripts/deploy-staged.sh --rollback
```

**When to use:** Production issues, critical bugs discovered after deployment

---

## Command Reference

### Deploy Commands

```bash
# Standard deployment
./scripts/deploy-staged.sh

# Test deployment (no traffic)
./scripts/deploy-staged.sh --no-traffic

# Canary deployment (10% traffic)
./scripts/deploy-staged.sh --canary 10

# Custom tag deployment
./scripts/deploy-staged.sh --no-traffic --tag staging

# Rollback to previous revision
./scripts/deploy-staged.sh --rollback

# Show help
./scripts/deploy-staged.sh --help
```

### Traffic Management

```bash
# List all revisions
gcloud run revisions list \
  --service=lao-cinema-web \
  --region=asia-southeast1

# View current traffic split
gcloud run services describe lao-cinema-web \
  --region=asia-southeast1 \
  --format='value(status.traffic)'

# Send 100% traffic to latest
gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-latest

# Send 100% traffic to specific revision
gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-revisions=REVISION-NAME=100

# Split traffic between revisions
gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-revisions=REVISION-A=50,REVISION-B=50
```

### Monitoring

```bash
# View logs (all revisions)
gcloud run services logs read lao-cinema-web \
  --region=asia-southeast1 \
  --limit=100

# View logs (specific revision)
gcloud run services logs read lao-cinema-web \
  --region=asia-southeast1 \
  --filter="resource.labels.revision_name=REVISION-NAME"

# Tail logs (live)
gcloud run services logs tail lao-cinema-web \
  --region=asia-southeast1
```

## Decision Tree

```
┌─────────────────────────────────────┐
│    What are you deploying?          │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
  Minor update     Major feature
  Bug fix          Breaking change
       │                │
       │                │
       v                v
  deploy.sh    deploy-staged.sh --no-traffic
                      │
                      v
                Test → Release
                      or
                Canary (10% → 50% → 100%)
```

## Pre-Deployment Checklist

- [ ] Code reviewed and merged to main
- [ ] All tests passing locally
- [ ] Database migrations tested (if applicable)
- [ ] Environment variables updated (if needed)
- [ ] Choose appropriate deployment strategy
- [ ] Notify team of deployment
- [ ] Have rollback plan ready

## Post-Deployment Checklist

- [ ] Verify services are healthy
- [ ] Check logs for errors
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Verify database connectivity
- [ ] Check API response times
- [ ] Confirm video playback works

## Rollback Decision Criteria

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

## Tips & Best Practices

1. **Always test before releasing**
   - Use `--no-traffic` for major changes
   - Test on the tagged URL before sending traffic

2. **Use canary for risky changes**
   - Start with 10% traffic
   - Monitor for 10-30 minutes
   - Gradually increase

3. **Keep recent revisions**
   - Cloud Run keeps last 1000 revisions
   - Manually delete old revisions if needed

4. **Document deployments**
   - Note revision names in git commits
   - Log deployment decisions
   - Track rollbacks

5. **Practice rollbacks**
   - Test rollback procedure regularly
   - Ensure team knows how to rollback
   - Document rollback process

6. **Monitor metrics**
   - Watch logs during deployment
   - Check error rates
   - Monitor response times
   - Verify database queries

7. **Communicate**
   - Notify team before deployment
   - Share test URLs
   - Announce when complete
   - Document any issues

## Troubleshooting

### Issue: Tagged URL not working

```bash
# Check if tag exists
gcloud run services describe lao-cinema-web \
  --region=asia-southeast1 \
  --format='value(status.traffic)'

# Recreate tag
gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --update-tags=test=REVISION-NAME
```

### Issue: Traffic not splitting correctly

```bash
# Verify current split
gcloud run services describe lao-cinema-web \
  --region=asia-southeast1 \
  --format='value(status.traffic)'

# Reset to 100% latest
gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-latest
```

### Issue: Rollback not working

```bash
# List revisions to find working one
gcloud run revisions list \
  --service=lao-cinema-web \
  --region=asia-southeast1 \
  --limit=10

# Manually set traffic to specific revision
gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-revisions=WORKING-REVISION=100
```

## Common Deployment Gotchas

### Docker Build Failures

**Problem:** API Docker build fails with `Cannot find module '../../../db/src/schema.js'`

**Solution:** All API files must import from local re-export:
```typescript
// ❌ Wrong - breaks Docker build
import { users } from '../../../db/src/schema.js';

// ✅ Correct - works in Docker
import { users } from '../db/schema.js';
```

**Affected files:**
- `api/src/lib/auth-middleware.ts`
- `api/src/lib/auth-service.ts`
- All route files (`auth.test.ts`, `rentals.ts`, `watch-progress.ts`, etc.)

The Dockerfile copies the schema into the build context at `src/db/schema.ts`, so imports must use this path.

---

### Database Migration: Local → Cloud SQL

After deploying, you'll need to run migrations and optionally migrate local data.

#### Step 1: Set Up Cloud SQL Proxy

```bash
# Download proxy (macOS)
curl -o cloud-sql-proxy \
  https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64

# Make executable
chmod +x cloud-sql-proxy

# Get connection name
export CONNECTION_NAME=$(gcloud sql instances describe lao-cinema-db \
  --format='value(connectionName)')

# Start proxy
./cloud-sql-proxy $CONNECTION_NAME &
```

#### Step 2: Run Database Migrations

```bash
cd db

# Set DATABASE_URL (use single quotes for passwords with special chars!)
export DATABASE_URL="postgresql://laocinema:${CLOUD_DB_PASS}@127.0.0.1:5432/laocinema"

# Run migrations
npm run db:push

cd ..
```

**Important:** Use **single quotes** for `DATABASE_URL` if the password contains special characters (`!`, `@`, etc.). Double quotes cause zsh to interpret these as shell commands.

#### Step 3: Migrate Local Data (Optional)

If you want to copy your local movies/people data to Cloud SQL:

```bash
# Dump local data (note: local DB is 'lao_cinema' with underscore)
pg_dump -h localhost -p 5432 -U laocinema -d lao_cinema \
  --data-only \
  --no-owner \
  --no-acl \
  -f local_data_dump.sql

# Truncate Cloud SQL tables (removes __drizzle_migrations from list)
psql "postgresql://laocinema:${CLOUD_DB_PASS}@127.0.0.1:5432/laocinema" << 'EOF'
TRUNCATE TABLE 
  video_sources,
  movie_images,
  movie_genres,
  movie_crew_translations,
  movie_crew,
  movie_cast_translations,
  movie_cast,
  movie_translations,
  people_translations,
  people,
  homepage_featured,
  movies,
  genre_translations,
  genres,
  rentals,
  watch_progress,
  video_analytics_events,
  user_sessions,
  oauth_accounts,
  users
CASCADE;
EOF

# Restore to Cloud SQL
psql "postgresql://laocinema:${CLOUD_DB_PASS}@127.0.0.1:5432/laocinema" \
  -f local_data_dump.sql

# Cleanup
killall cloud-sql-proxy
rm local_data_dump.sql
```

**Database Name Differences:**
- Local: `lao_cinema` (with underscore)
- Cloud SQL: `laocinema` (no underscore)

**Common Errors:**
- `ERROR: relation "__drizzle_migrations" does not exist` - Remove from TRUNCATE list (it's internal to Drizzle)
- `ERROR: duplicate key value violates unique constraint` - Truncate tables first for clean import
- `zsh: event not found: @127.0.0.1` - Use single quotes around DATABASE_URL

---

### Complete Deployment Flow

```bash
# 1. Ensure schema imports are correct
git status  # Check for modified API files

# 2. Deploy to Cloud Run
./scripts/deploy.sh

# 3. Run migrations
./cloud-sql-proxy $CONNECTION_NAME &
cd db
export DATABASE_URL="postgresql://laocinema:${CLOUD_DB_PASS}@127.0.0.1:5432/laocinema"
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

## Resources

- [Cloud Run Versioning Guide](docs/setup/CLOUD_RUN_VERSIONING.md)
- [Full Deployment Guide](docs/setup/DEPLOYMENT.md)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Proxy Documentation](https://cloud.google.com/sql/docs/postgres/sql-proxy)
