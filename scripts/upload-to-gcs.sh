#!/bin/bash
# Upload videos or images to Google Cloud Storage
# Usage: 
#   ./upload-to-gcs.sh videos [movie-name] [--dry-run]     # Upload HLS videos
#   ./upload-to-gcs.sh images [category] [--dry-run] [--update-db]  # Upload images
#
# Examples:
#   ./upload-to-gcs.sh videos                    # Upload all videos
#   ./upload-to-gcs.sh videos the-signal         # Upload specific movie
#   ./upload-to-gcs.sh images all                # Upload all image categories
#   ./upload-to-gcs.sh images posters --dry-run  # Dry run for posters only
#   ./upload-to-gcs.sh --env staging videos      # Upload to staging bucket

set -e

# Force gsutil to use Python 3.9 (compatible with gsutil, avoids Python 3.13 issues)
if [ -f /opt/homebrew/bin/python3.9 ]; then
    export CLOUDSDK_PYTHON=/opt/homebrew/bin/python3.9
elif [ -f /usr/local/bin/python3.9 ]; then
    export CLOUDSDK_PYTHON=/usr/local/bin/python3.9
fi

# Configuration
PROJECT_ID="lao-cinema"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_section() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Parse arguments
ENV="preview"
UPLOAD_TYPE=""
TARGET=""
DRY_RUN=""
UPDATE_DB=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --env=*) ENV="${1#*=}"; shift ;;
        --env) ENV="$2"; shift 2 ;;
        --dry-run) DRY_RUN="true"; shift ;;
        --update-db) UPDATE_DB="true"; shift ;;
        videos|images)
            if [ -z "$UPLOAD_TYPE" ]; then
                UPLOAD_TYPE="$1"
            fi
            shift ;;
        *)
            if [ -z "$TARGET" ] && [ -n "$UPLOAD_TYPE" ]; then
                TARGET="$1"
            fi
            shift ;;
    esac
done

# Show help if no upload type specified
if [ -z "$UPLOAD_TYPE" ]; then
    cat << EOF
Usage: $0 [--env preview|staging|production] <videos|images> [target] [options]

UPLOAD TYPES:
  videos [movie-name]     Upload HLS video files
                          - No argument: upload all movies
                          - With name: upload specific movie

  images [category]       Upload image files (logos, posters, backdrops, profiles)
                          - all: upload all categories
                          - Or specify: logos, posters, backdrops, profiles

OPTIONS:
  --env ENV               Target environment (preview, staging, production)
  --dry-run               Show what would be uploaded without uploading
  --update-db             (images only) Update database URLs after upload

EXAMPLES:
  $0 videos                           # Upload all videos to preview
  $0 videos the-signal                # Upload specific movie
  $0 --env staging videos             # Upload to staging
  $0 images all                       # Upload all images
  $0 images posters --dry-run         # Dry run for posters
  $0 images all --update-db           # Upload images and update DB URLs

EOF
    exit 0
fi

# Validate environment
case $ENV in
    preview|staging|production) ;;
    *)
        log_error "Invalid environment: $ENV"
        echo "Use: --env preview|staging|production"
        exit 1
        ;;
esac

# Set bucket names based on environment and type
if [ "$UPLOAD_TYPE" = "videos" ]; then
    case $ENV in
        preview|production) BUCKET_NAME="lao-cinema-videos" ;;
        staging) BUCKET_NAME="lao-cinema-videos-staging" ;;
    esac
else
    case $ENV in
        preview|production) BUCKET_NAME="lao-cinema-images" ;;
        staging) BUCKET_NAME="lao-cinema-images-staging" ;;
    esac
fi

# Check GCP project configuration
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    log_error "Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID"
    log_error "Run: gcloud config configurations activate lao-cinema"
    exit 1
fi

echo ""
log_info "✓ GCP project: $PROJECT_ID"
log_info "✓ Environment: $ENV"
log_info "✓ Upload type: $UPLOAD_TYPE"
log_info "✓ Bucket: $BUCKET_NAME"
[ -n "$DRY_RUN" ] && log_warn "DRY RUN MODE - No files will be uploaded"
echo ""

# Check if bucket exists, create if not
if ! gsutil ls -b gs://$BUCKET_NAME &> /dev/null; then
    if [ -n "$DRY_RUN" ]; then
        log_info "Would create bucket gs://$BUCKET_NAME (dry run)"
    else
        log_info "Creating bucket gs://$BUCKET_NAME..."
        gsutil mb -p $PROJECT_ID -l asia-southeast1 gs://$BUCKET_NAME
        gsutil uniformbucketlevelaccess set on gs://$BUCKET_NAME
        [ "$UPLOAD_TYPE" = "images" ] && gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME
        log_info "Bucket created successfully"
    fi
else
    log_info "Bucket gs://$BUCKET_NAME exists"
fi

# ========================================
# VIDEO UPLOAD
# ========================================
upload_videos() {
    local VIDEOS_DIR="$SCRIPT_DIR/../video-server/videos/hls"
    local specific_movie="$1"
    
    upload_video_folder() {
        local source_path=$1
        local movie_id=$2
        
        if [ ! -d "$source_path" ]; then
            log_warn "Directory not found: $source_path"
            return 1
        fi
        
        log_info "Uploading $movie_id..."
        
        if [ -n "$DRY_RUN" ]; then
            gsutil -o "GSUtil:parallel_process_count=1" -m rsync -r -c -n "$source_path" gs://$BUCKET_NAME/hls/$movie_id/
        else
            gsutil -o "GSUtil:parallel_process_count=1" -m rsync -r -c "$source_path" gs://$BUCKET_NAME/hls/$movie_id/
            gsutil -o "GSUtil:parallel_process_count=1" -m setmeta -h "Cache-Control:public, max-age=31536000" \
                "gs://$BUCKET_NAME/hls/$movie_id/**" 2>/dev/null || true
        fi
        
        log_info "✓ Uploaded: https://storage.googleapis.com/$BUCKET_NAME/hls/$movie_id/master.m3u8"
    }
    
    if [ -n "$specific_movie" ]; then
        video_path="$VIDEOS_DIR/$specific_movie"
        if [ -d "$video_path" ]; then
            log_section "📹 Uploading video: $specific_movie"
            upload_video_folder "$video_path" "$specific_movie"
        else
            log_error "Movie not found: $video_path"
            echo ""
            echo "Available movies:"
            ls -1 "$VIDEOS_DIR" 2>/dev/null | grep -v "\.old$" || echo "  (none)"
            exit 1
        fi
    else
        if [ -d "$VIDEOS_DIR" ]; then
            log_section "📹 Uploading all videos"
            for video_dir in "$VIDEOS_DIR"/*/; do
                if [ -d "$video_dir" ]; then
                    movie_id=$(basename "$video_dir")
                    [[ ! "$movie_id" =~ \.old$ ]] && upload_video_folder "$video_dir" "$movie_id"
                fi
            done
        else
            log_warn "No local videos found in $VIDEOS_DIR"
        fi
    fi
    
    echo ""
    log_info "Video upload complete!"
    log_info "Base URL: https://storage.googleapis.com/$BUCKET_NAME/hls/"
}

# ========================================
# IMAGE UPLOAD
# ========================================
upload_images() {
    local IMAGE_DIR="$SCRIPT_DIR/../video-server/public"
    local SUPPORTED_CATEGORIES=("logos" "posters" "backdrops" "profiles")
    local category="$1"
    
    upload_category() {
        local cat=$1
        local source_path="$IMAGE_DIR/$cat"
        
        if [ ! -d "$source_path" ]; then
            log_warn "Directory not found: $source_path"
            return 1
        fi
        
        local file_count=$(find "$source_path" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" -o -iname "*.gif" \) 2>/dev/null | wc -l | tr -d ' ')
        
        if [ "$file_count" -eq 0 ]; then
            log_warn "No image files found in $source_path"
            return 0
        fi
        
        local dir_size=$(du -sh "$source_path" 2>/dev/null | cut -f1 || echo "unknown")
        
        log_section "📁 Uploading $cat"
        echo "Source: $source_path"
        echo "Files: $file_count ($dir_size)"
        echo ""
        
        if [ -n "$DRY_RUN" ]; then
            log_info "Would upload $file_count files (dry run)"
            gsutil -m rsync -r -n "$source_path" gs://$BUCKET_NAME/$cat/
        else
            gsutil -o "GSUtil:parallel_process_count=1" -m rsync -r "$source_path" gs://$BUCKET_NAME/$cat/
            gsutil -o "GSUtil:parallel_process_count=1" -m setmeta -h "Cache-Control:public, max-age=31536000" \
                "gs://$BUCKET_NAME/$cat/**" 2>/dev/null || true
            log_info "✅ Uploaded $cat successfully"
        fi
        echo ""
    }
    
    # Validate category
    if [ -n "$category" ] && [ "$category" != "all" ]; then
        if [[ ! " ${SUPPORTED_CATEGORIES[@]} " =~ " ${category} " ]]; then
            log_error "Invalid category: $category"
            echo "Supported: ${SUPPORTED_CATEGORIES[@]} all"
            exit 1
        fi
    fi
    
    # Upload
    if [ "$category" = "all" ] || [ -z "$category" ]; then
        log_section "🚀 Uploading all image categories"
        echo ""
        for cat in "${SUPPORTED_CATEGORIES[@]}"; do
            upload_category "$cat"
        done
    else
        upload_category "$category"
    fi
    
    echo ""
    log_info "Image upload complete!"
    log_info "Base URL: https://storage.googleapis.com/$BUCKET_NAME/"
    
    # Update database URLs if requested
    if [ -n "$UPDATE_DB" ] && [ -z "$DRY_RUN" ]; then
        update_database_urls
    fi
}

# ========================================
# DATABASE URL UPDATE (for images)
# ========================================
update_database_urls() {
    log_section "🔄 Updating Database URLs"
    echo ""
    
    if ! lsof -i:5433 > /dev/null 2>&1; then
        log_error "Cloud SQL proxy is not running on port 5433"
        log_error "Start it with: ./cloud-sql-proxy <CONNECTION_NAME> --port=5433"
        exit 1
    fi
    
    log_info "Connecting to Cloud SQL via proxy..."
    
    CLOUD_DB_NAME="laocinema"
    CLOUD_DB_USER="laocinema"
    CLOUD_DB_PASS="${CLOUD_DB_PASS:?Error: CLOUD_DB_PASS environment variable is not set}"
    GCS_BASE_URL="https://storage.googleapis.com/$BUCKET_NAME"
    
    log_info "Updating movie_images URLs..."
    PGPASSWORD=$CLOUD_DB_PASS psql -h 127.0.0.1 -p 5433 -U $CLOUD_DB_USER -d $CLOUD_DB_NAME << EOF
UPDATE movie_images SET file_path = REPLACE(file_path, 'http://localhost:3002/posters/', '$GCS_BASE_URL/posters/') WHERE file_path LIKE 'http://localhost:3002/posters/%';
UPDATE movie_images SET file_path = REPLACE(file_path, 'http://localhost:3002/backdrops/', '$GCS_BASE_URL/backdrops/') WHERE file_path LIKE 'http://localhost:3002/backdrops/%';
UPDATE movie_images SET file_path = REPLACE(file_path, 'http://localhost:3002/logos/', '$GCS_BASE_URL/logos/') WHERE file_path LIKE 'http://localhost:3002/logos/%';
EOF
    
    log_info "Updating people URLs..."
    PGPASSWORD=$CLOUD_DB_PASS psql -h 127.0.0.1 -p 5433 -U $CLOUD_DB_USER -d $CLOUD_DB_NAME << EOF
UPDATE people SET profile_path = REPLACE(profile_path, 'http://localhost:3002/profiles/', '$GCS_BASE_URL/profiles/') WHERE profile_path LIKE 'http://localhost:3002/profiles/%';
EOF
    
    log_info "Updating movies URLs..."
    PGPASSWORD=$CLOUD_DB_PASS psql -h 127.0.0.1 -p 5433 -U $CLOUD_DB_USER -d $CLOUD_DB_NAME << EOF
UPDATE movies SET poster_path = REPLACE(poster_path, 'http://localhost:3002/posters/', '$GCS_BASE_URL/posters/') WHERE poster_path LIKE 'http://localhost:3002/posters/%';
UPDATE movies SET backdrop_path = REPLACE(backdrop_path, 'http://localhost:3002/backdrops/', '$GCS_BASE_URL/backdrops/') WHERE backdrop_path LIKE 'http://localhost:3002/backdrops/%';
EOF
    
    log_info "Updating production_companies URLs..."
    PGPASSWORD=$CLOUD_DB_PASS psql -h 127.0.0.1 -p 5433 -U $CLOUD_DB_USER -d $CLOUD_DB_NAME << EOF
UPDATE production_companies SET custom_logo_url = REPLACE(custom_logo_url, 'http://localhost:3002/logos/', '$GCS_BASE_URL/logos/') WHERE custom_logo_url LIKE 'http://localhost:3002/logos/%';
EOF
    
    log_info "✅ Database URLs updated successfully"
}

# ========================================
# MAIN
# ========================================
if [ "$UPLOAD_TYPE" = "videos" ]; then
    upload_videos "$TARGET"
else
    upload_images "$TARGET"
fi

echo ""
