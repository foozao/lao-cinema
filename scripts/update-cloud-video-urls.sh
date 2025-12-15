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
-- Update Last Dance video sources
UPDATE video_sources 
SET url = 'last-dance'
WHERE movie_id = '3e5f236f-1a1b-40d4-aba8-729a8033d3bb';

-- Update The Signal video sources (if exists)
UPDATE video_sources 
SET url = 'the-signal'
WHERE movie_id IN (
    SELECT m.id 
    FROM movies m
    JOIN movie_translations mt ON m.id = mt.movie_id
    WHERE mt.title ILIKE '%signal%'
);

-- Verify updates
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
WHERE vs.url IN ('last-dance', 'the-signal')
  AND mt.language = 'en';
EOF

echo ""
echo "✅ Cloud SQL database updated!"
echo ""
echo "Test the API:"
echo "curl https://lao-cinema-api-3ra6tqt7cq-as.a.run.app/api/movies/3e5f236f-1a1b-40d4-aba8-729a8033d3bb | jq '.video_sources[0].url'"
