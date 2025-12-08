#!/bin/bash

# Update CORS configuration for GCS bucket to allow Chromecast access
# This allows Chromecast devices to fetch video files directly from GCS

BUCKET_NAME="lao-cinema-videos"
CORS_FILE="$(dirname "$0")/gcs-cors-cast.json"

echo "Updating CORS configuration for gs://${BUCKET_NAME}..."

gcloud storage buckets update gs://${BUCKET_NAME} \
  --cors-file="${CORS_FILE}"

if [ $? -eq 0 ]; then
  echo "✅ CORS configuration updated successfully"
  echo ""
  echo "Current CORS configuration:"
  gcloud storage buckets describe gs://${BUCKET_NAME} --format="json(cors)"
else
  echo "❌ Failed to update CORS configuration"
  exit 1
fi
