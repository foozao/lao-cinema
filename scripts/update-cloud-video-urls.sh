#!/bin/bash
# Update video URLs in Cloud SQL database

set -e

# Load environment variables from .env if it exists
[[ -f "$(dirname "$0")/../.env" ]] && source "$(dirname "$0")/../.env"

# Configuration
PROJECT_ID="lao-cinema"
INSTANCE_NAME="lao-cinema-db"
DB_NAME="laocinema"
DB_USER="laocinema"
DB_PASS="${CLOUD_DB_PASS:?Error: CLOUD_DB_PASS environment variable is not set}"

# Check GCP project configuration
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "❌ Error: Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID"
    echo "Run: gcloud config configurations activate lao-cinema"
    exit 1
fi
echo "✓ GCP project: $PROJECT_ID"
echo ""

echo "🔄 Updating video URLs in Cloud SQL..."
echo ""

# Connect to Cloud SQL and run the update
gcloud sql connect $INSTANCE_NAME --user=$DB_USER --database=$DB_NAME <<EOF
-- Show video sources that need updating
SELECT 
    vs.id,
    mt.title,
    vs.url as current_url
FROM video_sources vs
JOIN movies m ON vs.movie_id = m.id
JOIN movie_translations mt ON m.id = mt.movie_id
WHERE (
    vs.url LIKE 'http://%' 
    OR vs.url LIKE 'https://%'
)
AND mt.language = 'en'
ORDER BY mt.title;

-- Update all video sources that have full URLs (http/https)
-- Extract just the slug from URLs like:
--   http://localhost:3002/videos/hls/chanthaly/master.m3u8 -> chanthaly
--   https://storage.googleapis.com/bucket/hls/movie-name/master.m3u8 -> movie-name
UPDATE video_sources 
SET url = 
    CASE
        -- Extract slug from localhost URLs: http://localhost:3002/videos/hls/SLUG/...
        WHEN url LIKE '%/videos/hls/%' THEN 
            split_part(split_part(url, '/videos/hls/', 2), '/', 1)
        -- Extract slug from GCS URLs: https://storage.googleapis.com/bucket/hls/SLUG/...
        WHEN url LIKE '%/hls/%' THEN 
            split_part(split_part(url, '/hls/', 2), '/', 1)
        -- If no recognizable pattern, keep as-is
        ELSE url
    END
WHERE (
    url LIKE 'http://%' 
    OR url LIKE 'https://%'
);

-- Show all video sources after update
SELECT 
    vs.id,
    vs.movie_id,
    mt.title,
    vs.quality,
    vs.format,
    vs.url
FROM video_sources vs
JOIN movies m ON vs.movie_id = m.id
JOIN movie_translations mt ON m.id = mt.movie_id
WHERE mt.language = 'en'
ORDER BY mt.title, vs.quality;
EOF

echo ""
echo "✅ Cloud SQL database updated!"
echo ""
echo "Test the API:"
echo "curl https://lao-cinema-api-3ra6tqt7cq-as.a.run.app/api/movies/3e5f236f-1a1b-40d4-aba8-729a8033d3bb | jq '.video_sources[0].url'"
