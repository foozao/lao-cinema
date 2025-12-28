#!/bin/bash
# Upload videos to Google Cloud Storage
# Usage: 
#   ./upload-to-gcs.sh              # Upload all videos
#   ./upload-to-gcs.sh the-signal   # Upload specific movie

set -e

# Parse --env argument
ENV="preview"
ARGS=()
for arg in "$@"; do
    case $arg in
        --env=*)
            ENV="${arg#*=}"
            ;;
        *)
            ARGS+=("$arg")
            ;;
    esac
done

# Handle --env with space
NEW_ARGS=()
i=0
while [ $i -lt ${#ARGS[@]} ]; do
    if [ "${ARGS[$i]}" = "--env" ]; then
        ENV="${ARGS[$((i+1))]}"
        i=$((i+2))
    else
        NEW_ARGS+=("${ARGS[$i]}")
        i=$((i+1))
    fi
done
set -- "${NEW_ARGS[@]}"

# Configuration
PROJECT_ID="lao-cinema"

# Environment-specific bucket
case $ENV in
    preview|production)
        BUCKET_NAME="lao-cinema-videos"
        ;;
    staging)
        BUCKET_NAME="lao-cinema-videos-staging"
        ;;
    *)
        echo "Invalid environment: $ENV"
        echo "Use: --env preview|staging|production"
        exit 1
        ;;
esac

SPECIFIC_MOVIE="$1"  # Optional: specific movie to upload

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check GCP project configuration
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    log_error "Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID"
    log_error "Run: gcloud config configurations activate lao-cinema"
    exit 1
fi
log_info "✓ GCP project: $PROJECT_ID"
log_info "✓ Environment: $ENV"
log_info "✓ Bucket: $BUCKET_NAME"
echo ""

# Check if bucket exists, create if not
if ! gsutil ls -b gs://$BUCKET_NAME &> /dev/null; then
    log_info "Creating bucket gs://$BUCKET_NAME..."
    gsutil mb -p $PROJECT_ID -l asia-southeast1 gs://$BUCKET_NAME
    
    # Enable uniform bucket-level access
    gsutil uniformbucketlevelaccess set on gs://$BUCKET_NAME
    
    log_info "Bucket created successfully"
else
    log_info "Bucket gs://$BUCKET_NAME already exists"
fi

# Function to upload a video folder
upload_video() {
    local source_path=$1
    local movie_id=$2
    
    if [ ! -d "$source_path" ]; then
        log_warn "Directory not found: $source_path"
        return 1
    fi
    
    log_info "Uploading $movie_id..."
    
    # Use rsync for resumable uploads (skips existing files automatically)
    # -r: recursive
    # -c: compare checksums (more accurate than size/time)
    # -d: delete extra files in destination (optional, commented out for safety)
    gsutil -m rsync -r -c "$source_path" gs://$BUCKET_NAME/hls/$movie_id/
    
    # Set cache control for HLS files
    gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" \
        "gs://$BUCKET_NAME/hls/$movie_id/**" 2>/dev/null || true
    
    log_info "✓ Uploaded: https://storage.googleapis.com/$BUCKET_NAME/hls/$movie_id/master.m3u8"
}

# Upload videos
# Videos are now stored in video-server/videos/hls/
VIDEOS_DIR="video-server/videos/hls"

if [ -n "$SPECIFIC_MOVIE" ]; then
    # Upload specific movie
    video_path="$VIDEOS_DIR/$SPECIFIC_MOVIE"
    
    if [ -d "$video_path" ]; then
        log_info "Uploading specific movie: $SPECIFIC_MOVIE"
        upload_video "$video_path" "$SPECIFIC_MOVIE"
    else
        log_warn "Movie not found: $video_path"
        echo ""
        echo "Available movies:"
        ls -1 "$VIDEOS_DIR" 2>/dev/null | grep -v "\.old$" || echo "  (none)"
        exit 1
    fi
else
    # Upload all videos
    if [ -d "$VIDEOS_DIR" ]; then
        log_info "Found local HLS videos, uploading all..."
        
        for video_dir in "$VIDEOS_DIR"/*/; do
            if [ -d "$video_dir" ]; then
                movie_id=$(basename "$video_dir")
                # Skip .old directories
                if [[ ! "$movie_id" =~ \.old$ ]]; then
                    upload_video "$video_dir" "$movie_id"
                fi
            fi
        done
    else
        log_warn "No local videos found in $VIDEOS_DIR"
    fi
fi

# Print summary
echo ""
log_info "========================================="
log_info "Upload complete!"
log_info "========================================="
echo ""
log_info "Bucket: gs://$BUCKET_NAME"
log_info "Base URL: https://storage.googleapis.com/$BUCKET_NAME/hls/"
echo ""
log_info "Next steps:"
log_info "1. Update movie URLs in database to point to GCS"
log_info "2. Enable Cloud CDN for better performance"
log_info "3. Set up signed URLs for access control"
echo ""
