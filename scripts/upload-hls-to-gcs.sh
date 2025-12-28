#!/bin/bash

# Upload HLS directory from video-server to Google Cloud Storage
# Usage: ./scripts/upload-hls-to-gcs.sh <movie-name>
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - gsutil available (comes with gcloud SDK)

set -e

# Parse --env argument
ENV="preview"
for arg in "$@"; do
    case $arg in
        --env)
            shift
            ENV="$1"
            shift
            ;;
        --env=*)
            ENV="${arg#*=}"
            ;;
    esac
done

# Configuration
PROJECT_ID="lao-cinema"
GCS_HLS_PATH="hls"

# Environment-specific bucket
case $ENV in
    preview|production)
        GCS_BUCKET="lao-cinema-videos"
        ;;
    staging)
        GCS_BUCKET="lao-cinema-videos-staging"
        ;;
    *)
        echo "Invalid environment: $ENV"
        echo "Use: --env preview|staging|production"
        exit 1
        ;;
esac

# Script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VIDEO_SERVER_DIR="${SCRIPT_DIR}/../video-server/videos/hls"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check GCP project configuration
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID${NC}"
    echo -e "${YELLOW}Run: gcloud config configurations activate lao-cinema${NC}"
    exit 1
fi
echo -e "${GREEN}✓ GCP project: $PROJECT_ID${NC}"
echo -e "${GREEN}✓ Environment: $ENV${NC}"
echo -e "${GREEN}✓ Bucket: $GCS_BUCKET${NC}"
echo ""

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo -e "${RED}Error: gsutil is not installed${NC}"
    echo "Install with: brew install --cask google-cloud-sdk"
    echo "Then run: gcloud auth login"
    exit 1
fi

# Filter out --env from positional args
POS_ARGS=()
while [[ $# -gt 0 ]]; do
    case $1 in
        --env) shift; shift ;; # skip --env and its value
        --env=*) shift ;;
        *) POS_ARGS+=("$1"); shift ;;
    esac
done
set -- "${POS_ARGS[@]}"

# Show usage if no arguments
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 [--env preview|staging|production] <movie-name> [--dry-run]"
    echo ""
    echo "Arguments:"
    echo "  movie-name   Name of the HLS folder in video-server/videos/hls/"
    echo "  --dry-run    Show what would be uploaded without actually uploading"
    echo ""
    echo "Available HLS folders:"
    if [ -d "$VIDEO_SERVER_DIR" ]; then
        ls -1 "$VIDEO_SERVER_DIR" 2>/dev/null | grep -v "^$" || echo "  (none found)"
    else
        echo "  (video-server/videos/hls/ directory not found)"
    fi
    exit 1
fi

MOVIE_NAME="$1"
DRY_RUN=""

# Check for --dry-run flag
if [ "$2" == "--dry-run" ]; then
    DRY_RUN="-n"
    echo -e "${YELLOW}DRY RUN MODE - No files will be uploaded${NC}"
    echo ""
fi

LOCAL_DIR="${VIDEO_SERVER_DIR}/${MOVIE_NAME}"
GCS_DEST="gs://${GCS_BUCKET}/${GCS_HLS_PATH}/${MOVIE_NAME}"

# Validate local directory exists
if [ ! -d "$LOCAL_DIR" ]; then
    echo -e "${RED}Error: HLS directory not found: ${LOCAL_DIR}${NC}"
    echo ""
    echo "Available HLS folders:"
    ls -1 "$VIDEO_SERVER_DIR" 2>/dev/null | grep -v "^$" || echo "  (none found)"
    exit 1
fi

# Check for master.m3u8
if [ ! -f "${LOCAL_DIR}/master.m3u8" ]; then
    echo -e "${YELLOW}Warning: master.m3u8 not found in ${LOCAL_DIR}${NC}"
    echo "This directory may not be a valid HLS output."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Count files
FILE_COUNT=$(find "$LOCAL_DIR" -type f | wc -l | tr -d ' ')
DIR_SIZE=$(du -sh "$LOCAL_DIR" | cut -f1)

echo "📁 Source: ${LOCAL_DIR}"
echo "☁️  Destination: ${GCS_DEST}"
echo "📊 Files: ${FILE_COUNT} (${DIR_SIZE})"
echo ""

# Confirm upload
if [ -z "$DRY_RUN" ]; then
    read -p "Proceed with upload? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

echo ""
echo "Uploading..."

# Upload with appropriate content types and cache headers
# -m: parallel upload for speed
# -h: set headers
gsutil $DRY_RUN -m \
    -h "Cache-Control:public, max-age=31536000" \
    cp -r "${LOCAL_DIR}/*" "${GCS_DEST}/"

echo ""
echo -e "${GREEN}✅ Upload complete!${NC}"
echo ""
echo "HLS URL: https://storage.googleapis.com/${GCS_BUCKET}/${GCS_HLS_PATH}/${MOVIE_NAME}/master.m3u8"
echo ""
echo "To use this in the database, update the video_sources for your movie:"
echo "  URL: /${MOVIE_NAME}/master.m3u8"
echo "  (The VIDEO_BASE_URL env var provides the base path)"
