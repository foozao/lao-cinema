# GCS Bucket Migration Guide

## Overview

This guide documents how to migrate GCS buckets to new naming conventions. This is useful when restructuring environments or standardizing bucket names.

## Current Bucket Structure

As of December 2025:

| Bucket | Environment | Purpose |
|--------|-------------|---------|
| `lao-cinema-images` | Preview/Production | Shared image storage |
| `lao-cinema-videos` | Preview/Production | Shared video storage |
| `lao-cinema-images-staging` | Staging | Isolated staging images |
| `lao-cinema-videos-staging` | Staging | Isolated staging videos |

## Future Migration: Add `-preview` Suffix

**Rationale**: Currently preview and production share buckets. If we want full isolation, we should rename to:
- `lao-cinema-images-preview`
- `lao-cinema-videos-preview`
- `lao-cinema-images-production` (future)
- `lao-cinema-videos-production` (future)

**Complexity**: Moderate (30-60 minutes)

**Why not done yet**: Preview and production are intended to share infrastructure (preview is just a traffic-split deployment, not a separate environment). Only staging needs isolation for testing destructive operations.

## Migration Steps (When Needed)

### 1. Create New Buckets

```bash
# Images bucket
gsutil mb -p lao-cinema -l asia-southeast1 gs://lao-cinema-images-preview
gsutil uniformbucketlevelaccess set on gs://lao-cinema-images-preview
gsutil iam ch allUsers:objectViewer gs://lao-cinema-images-preview

# Videos bucket
gsutil mb -p lao-cinema -l asia-southeast1 gs://lao-cinema-videos-preview
gsutil uniformbucketlevelaccess set on gs://lao-cinema-videos-preview
gsutil iam ch allUsers:objectViewer gs://lao-cinema-videos-preview
```

### 2. Copy Data

```bash
# Copy images (this will take time)
gsutil -m rsync -r gs://lao-cinema-images gs://lao-cinema-images-preview

# Copy videos (this will take significant time - videos are large)
gsutil -m rsync -r gs://lao-cinema-videos gs://lao-cinema-videos-preview
```

### 3. Update Preview API Environment Variables

```bash
# Update preview API service
gcloud run services update lao-cinema-api-preview \
  --region=asia-southeast1 \
  --update-env-vars="VIDEO_BASE_URL=https://storage.googleapis.com/lao-cinema-videos-preview/hls"
```

### 4. Update Preview Database URLs

```bash
# Start proxy to preview instance
./cloud-sql-proxy lao-cinema:asia-southeast1:laocinema-preview --port=5433 &

# Update image URLs
export CLOUD_DB_PASS="your_preview_password"
PGPASSWORD=$CLOUD_DB_PASS psql -h 127.0.0.1 -p 5433 -U laocinema -d laocinema << 'EOF'
-- Update movie_images
UPDATE movie_images 
SET file_path = REPLACE(file_path, 
  'https://storage.googleapis.com/lao-cinema-images/', 
  'https://storage.googleapis.com/lao-cinema-images-preview/')
WHERE file_path LIKE 'https://storage.googleapis.com/lao-cinema-images/%';

-- Update movies table
UPDATE movies 
SET poster_path = REPLACE(poster_path, 
  'https://storage.googleapis.com/lao-cinema-images/', 
  'https://storage.googleapis.com/lao-cinema-images-preview/')
WHERE poster_path LIKE 'https://storage.googleapis.com/lao-cinema-images/%';

UPDATE movies 
SET backdrop_path = REPLACE(backdrop_path, 
  'https://storage.googleapis.com/lao-cinema-images/', 
  'https://storage.googleapis.com/lao-cinema-images-preview/')
WHERE backdrop_path LIKE 'https://storage.googleapis.com/lao-cinema-images/%';

-- Update people table
UPDATE people 
SET profile_path = REPLACE(profile_path, 
  'https://storage.googleapis.com/lao-cinema-images/', 
  'https://storage.googleapis.com/lao-cinema-images-preview/')
WHERE profile_path LIKE 'https://storage.googleapis.com/lao-cinema-images/%';

-- Update production_companies
UPDATE production_companies 
SET custom_logo_url = REPLACE(custom_logo_url, 
  'https://storage.googleapis.com/lao-cinema-images/', 
  'https://storage.googleapis.com/lao-cinema-images-preview/')
WHERE custom_logo_url LIKE 'https://storage.googleapis.com/lao-cinema-images/%';

-- Verify no localhost URLs remain
SELECT 'movie_images old bucket' as type, COUNT(*) 
FROM movie_images 
WHERE file_path LIKE '%lao-cinema-images/%' 
  AND file_path NOT LIKE '%lao-cinema-images-preview/%'
UNION ALL
SELECT 'movies old bucket', COUNT(*) 
FROM movies 
WHERE (poster_path LIKE '%lao-cinema-images/%' 
  AND poster_path NOT LIKE '%lao-cinema-images-preview/%')
   OR (backdrop_path LIKE '%lao-cinema-images/%' 
  AND backdrop_path NOT LIKE '%lao-cinema-images-preview/%');
EOF

# Stop proxy
killall cloud-sql-proxy
```

### 5. Update Script Defaults (Optional)

Update `scripts/upload-images-to-gcs.sh` and `scripts/upload-to-gcs.sh` to use new bucket names for preview environment.

### 6. Verify Preview Works

```bash
# Test preview site
open https://preview.laocinema.com

# Check API responses have correct URLs
curl https://api.preview.laocinema.com/api/movies | jq '.[0].poster_path'
```

### 7. Delete Old Buckets (After Verification)

**⚠️ DANGER ZONE - Only after thorough verification**

```bash
# Delete old buckets (cannot be undone)
gsutil -m rm -r gs://lao-cinema-images
gsutil -m rm -r gs://lao-cinema-videos
```

## Rollback Plan

If issues occur:

1. **Revert API env vars** to old bucket names
2. **Revert database URLs** using reverse REPLACE queries
3. **Keep old buckets** until fully verified

## Cost Considerations

- **Storage**: Doubled during migration (old + new buckets)
- **Egress**: Data transfer costs for copying between buckets
- **Time**: Large video files take hours to copy

**Recommendation**: Schedule during low-traffic period, monitor costs.

## Alternative: Keep Current Structure

**Current approach is valid** because:
- Preview is not a separate environment, just a traffic-split deployment
- Preview and production share the same infrastructure
- Only staging needs isolation for destructive testing
- Simpler to manage fewer buckets

**When to migrate**:
- When preview needs to test different content than production
- When implementing true blue-green deployments
- When preview becomes a long-lived environment with different data

## Related Documentation

- `docs/setup/STAGING_ENVIRONMENT.md` - Staging isolation setup
- `scripts/upload-images-to-gcs.sh` - Image upload script
- `scripts/upload-to-gcs.sh` - Video upload script
