# Cloud Run Versioning & Traffic Management

Cloud Run provides powerful versioning capabilities through **revisions**. Each deployment creates a new immutable revision.

## Quick Reference

### Deploy Without Traffic (Test First)

```bash
# Deploy API with test tag (doesn't affect production traffic)
gcloud run deploy lao-cinema-api \
  --image=asia-southeast1-docker.pkg.dev/lao-cinema/lao-cinema/api:latest \
  --region=asia-southeast1 \
  --no-traffic \
  --tag=test

# Deploy Web with test tag
gcloud run deploy lao-cinema-web \
  --image=asia-southeast1-docker.pkg.dev/lao-cinema/lao-cinema/web:latest \
  --region=asia-southeast1 \
  --no-traffic \
  --tag=test
```

This creates stable test URLs:
- `https://test---lao-cinema-api-xxx.run.app`
- `https://test---lao-cinema-web-xxx.run.app`

### List All Revisions

```bash
# List API revisions
gcloud run revisions list \
  --service=lao-cinema-api \
  --region=asia-southeast1

# List Web revisions
gcloud run revisions list \
  --service=lao-cinema-web \
  --region=asia-southeast1
```

### Traffic Splitting

```bash
# Get the revision name from list command above
REVISION_NAME="lao-cinema-api-00042-abc"

# Send 10% traffic to new revision (canary)
gcloud run services update-traffic lao-cinema-api \
  --region=asia-southeast1 \
  --to-revisions=$REVISION_NAME=10

# Increase to 50%
gcloud run services update-traffic lao-cinema-api \
  --region=asia-southeast1 \
  --to-revisions=$REVISION_NAME=50

# Send 100% traffic (full release)
gcloud run services update-traffic lao-cinema-api \
  --region=asia-southeast1 \
  --to-revisions=$REVISION_NAME=100
```

### Split Between Multiple Revisions

```bash
# A/B test or blue-green deployment
gcloud run services update-traffic lao-cinema-api \
  --region=asia-southeast1 \
  --to-revisions=REVISION-A=50,REVISION-B=50
```

### Rollback to Previous Revision

```bash
# List revisions to find the previous one
gcloud run revisions list \
  --service=lao-cinema-api \
  --region=asia-southeast1 \
  --limit=5

# Rollback (send 100% traffic to old revision)
gcloud run services update-traffic lao-cinema-api \
  --region=asia-southeast1 \
  --to-revisions=PREVIOUS-REVISION-NAME=100
```

### Get Tagged URL

```bash
# Get the test URL
gcloud run services describe lao-cinema-api \
  --region=asia-southeast1 \
  --format='value(status.traffic[0].url)'
```

## Recommended Workflows

### Workflow 1: Test-Then-Release

```bash
# 1. Build and deploy without traffic
./deploy.sh  # Modify to add --no-traffic

# 2. Test the new revision
curl https://test---lao-cinema-api-xxx.run.app/health

# 3. Release to production
gcloud run services update-traffic lao-cinema-api \
  --region=asia-southeast1 \
  --to-latest

gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-latest
```

### Workflow 2: Canary Deployment

```bash
# 1. Deploy normally (creates new revision)
./deploy.sh

# 2. Immediately set traffic to 90% old, 10% new
LATEST_REVISION=$(gcloud run revisions list \
  --service=lao-cinema-api \
  --region=asia-southeast1 \
  --limit=1 \
  --format='value(metadata.name)')

gcloud run services update-traffic lao-cinema-api \
  --region=asia-southeast1 \
  --to-revisions=$LATEST_REVISION=10

# 3. Monitor logs and metrics
gcloud run services logs read lao-cinema-api \
  --region=asia-southeast1 \
  --limit=100

# 4. Gradually increase: 25%, 50%, 100%
```

### Workflow 3: Blue-Green Deployment

```bash
# 1. Deploy with tag (green)
gcloud run deploy lao-cinema-api \
  --image=... \
  --region=asia-southeast1 \
  --no-traffic \
  --tag=green

# 2. Test green environment
curl https://green---lao-cinema-api-xxx.run.app/health

# 3. Switch traffic instantly (blue → green)
gcloud run services update-traffic lao-cinema-api \
  --region=asia-southeast1 \
  --to-tags=green=100

# 4. If issues, instant rollback to blue
gcloud run services update-traffic lao-cinema-api \
  --region=asia-southeast1 \
  --to-tags=blue=100
```

## Revision Management

### View Revision Details

```bash
gcloud run revisions describe REVISION-NAME \
  --region=asia-southeast1
```

### Delete Old Revisions

```bash
# Cloud Run keeps the last 1000 revisions
# Delete manually if needed
gcloud run revisions delete REVISION-NAME \
  --region=asia-southeast1 \
  --quiet
```

### Set Revision Retention

Old revisions are kept automatically for 1000 revisions or until manually deleted.

## Monitoring

### View Traffic Distribution

```bash
gcloud run services describe lao-cinema-api \
  --region=asia-southeast1 \
  --format='value(status.traffic)'
```

### View Logs by Revision

```bash
gcloud run services logs read lao-cinema-api \
  --region=asia-southeast1 \
  --filter="resource.labels.revision_name=REVISION-NAME"
```

## Comparison: Cloud Run vs App Engine

| Feature | App Engine | Cloud Run |
|---------|-----------|-----------|
| Versioning | Versions | Revisions |
| Traffic Split | ✅ Yes | ✅ Yes |
| Tagged URLs | ✅ Yes | ✅ Yes (with tags) |
| Instant Rollback | ✅ Yes | ✅ Yes |
| Gradual Migration | ✅ Yes | ✅ Yes |
| Max Versions | No limit | 1000 revisions |
| Auto-cleanup | Manual | Auto (1000 limit) |

## Enhanced Deploy Script

See `scripts/deploy-staged.sh` for a script with built-in versioning support:

```bash
# Test deployment
./scripts/deploy-staged.sh --no-traffic

# Canary deployment
./scripts/deploy-staged.sh --canary 10

# Full deployment
./scripts/deploy-staged.sh

# Rollback
./scripts/deploy-staged.sh --rollback
```

## Best Practices

1. **Always deploy without traffic first** for critical releases
2. **Use tags** for stable test URLs (`test`, `staging`, `canary`)
3. **Monitor metrics** during traffic migration
4. **Keep 2-3 recent revisions** for quick rollback
5. **Test rollback procedure** regularly
6. **Document revision history** in git commit messages

## Resources

- [Cloud Run Revisions](https://cloud.google.com/run/docs/managing/revisions)
- [Traffic Management](https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration)
- [Tags](https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration#tags)
