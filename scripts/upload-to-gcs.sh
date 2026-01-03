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

# Use gcloud storage instead of gsutil (faster, no crcmod issues)

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
        videos|trailers|images|all|help|--help)
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

# Default to "all" if no upload type specified
if [ -z "$UPLOAD_TYPE" ]; then
    UPLOAD_TYPE="all"
fi

# Show help if requested
if [ "$UPLOAD_TYPE" = "help" ] || [ "$UPLOAD_TYPE" = "--help" ]; then
    cat << EOF
Usage: $0 [--env preview|staging|production] [type] [target] [options]

UPLOAD TYPES:
  (no argument)           Upload everything: videos, trailers, and all images
  all                     Same as no argument

  videos [movie-name]     Upload HLS video files only
                          - No argument: upload all movies
                          - With name: upload specific movie

  trailers [trailer-name] Upload trailer files only (HLS + thumbnails)
                          - No argument: upload all trailers
                          - With name: upload specific trailer

  images [category]       Upload image files only (logos, posters, backdrops, profiles)
                          - all: upload all categories
                          - Or specify: logos, posters, backdrops, profiles

OPTIONS:
  --env ENV               Target environment (preview, staging, production)
  --dry-run               Show what would be uploaded without uploading
  --update-db             (images only) Update database URLs after upload

EXAMPLES:
  $0                                  # Upload everything to preview (default)
  $0 --env staging                    # Upload everything to staging
  $0 videos                           # Upload all videos to preview
  $0 videos the-signal                # Upload specific movie
  $0 --env staging trailers           # Upload trailers to staging
  $0 images posters --dry-run         # Dry run for posters

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

# Set bucket names based on environment
get_bucket_name() {
    local type=$1
    case $type in
        videos)
            case $ENV in
                preview|production) echo "lao-cinema-videos" ;;
                staging) echo "lao-cinema-videos-staging" ;;
            esac
            ;;
        trailers)
            case $ENV in
                preview|production) echo "lao-cinema-trailers" ;;
                staging) echo "lao-cinema-trailers-staging" ;;
            esac
            ;;
        images)
            case $ENV in
                preview|production) echo "lao-cinema-images" ;;
                staging) echo "lao-cinema-images-staging" ;;
            esac
            ;;
    esac
}

# For single-type uploads, set BUCKET_NAME
if [ "$UPLOAD_TYPE" != "all" ]; then
    BUCKET_NAME=$(get_bucket_name "$UPLOAD_TYPE")
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
[ -n "$BUCKET_NAME" ] && log_info "✓ Bucket: $BUCKET_NAME"
[ -n "$DRY_RUN" ] && log_warn "DRY RUN MODE - No files will be uploaded"
echo ""

# Helper function to ensure bucket exists
ensure_bucket_exists() {
    local bucket=$1
    local is_public=$2
    
    if ! gcloud storage buckets describe gs://$bucket &> /dev/null; then
        if [ -n "$DRY_RUN" ]; then
            log_info "Would create bucket gs://$bucket (dry run)"
        else
            log_info "Creating bucket gs://$bucket..."
            gcloud storage buckets create gs://$bucket --project=$PROJECT_ID --location=asia-southeast1
            gcloud storage buckets update gs://$bucket --uniform-bucket-level-access
            [ "$is_public" = "true" ] && \
                gcloud storage buckets add-iam-policy-binding gs://$bucket --member=allUsers --role=roles/storage.objectViewer
            log_info "Bucket created successfully"
        fi
    fi
}

# Check bucket exists for single-type uploads
if [ "$UPLOAD_TYPE" != "all" ] && [ -n "$BUCKET_NAME" ]; then
    is_public="false"
    [ "$UPLOAD_TYPE" = "images" ] || [ "$UPLOAD_TYPE" = "trailers" ] && is_public="true"
    ensure_bucket_exists "$BUCKET_NAME" "$is_public"
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
            gcloud storage rsync -r --checksums-only --dry-run "$source_path" gs://$BUCKET_NAME/hls/$movie_id/
        else
            gcloud storage rsync -r --checksums-only "$source_path" gs://$BUCKET_NAME/hls/$movie_id/
            gcloud storage objects update "gs://$BUCKET_NAME/hls/$movie_id/**" \
                --cache-control="public, max-age=31536000" 2>/dev/null || true
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
# TRAILER UPLOAD
# ========================================
upload_trailers() {
    local TRAILERS_DIR="$SCRIPT_DIR/../video-server/trailers/hls"
    local specific_trailer="$1"
    
    # Count files by type in a directory
    count_file_types() {
        local dir=$1
        local m3u8_count=$(find "$dir" -type f -name "*.m3u8" 2>/dev/null | wc -l | tr -d ' ')
        local ts_count=$(find "$dir" -type f -name "*.ts" 2>/dev/null | wc -l | tr -d ' ')
        local jpg_count=$(find "$dir" -type f -name "*.jpg" 2>/dev/null | wc -l | tr -d ' ')
        local png_count=$(find "$dir" -type f -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
        local total=$((m3u8_count + ts_count + jpg_count + png_count))
        
        echo "  - Playlists (.m3u8): $m3u8_count"
        echo "  - Segments (.ts): $ts_count"
        echo "  - Thumbnails (.jpg): $jpg_count"
        [ "$png_count" -gt 0 ] && echo "  - Images (.png): $png_count"
        echo "  - Total: $total files"
    }
    
    upload_trailer_folder() {
        local source_path=$1
        local trailer_id=$2
        
        if [ ! -d "$source_path" ]; then
            log_warn "Directory not found: $source_path"
            return 1
        fi
        
        log_section "🎬 Uploading trailer: $trailer_id"
        local dir_size=$(du -sh "$source_path" 2>/dev/null | cut -f1 || echo "unknown")
        echo "Source: $source_path"
        echo "Size: $dir_size"
        count_file_types "$source_path"
        echo ""
        
        if [ -n "$DRY_RUN" ]; then
            gcloud storage rsync -r --checksums-only --dry-run "$source_path" gs://$BUCKET_NAME/hls/$trailer_id/
        else
            gcloud storage rsync -r --checksums-only "$source_path" gs://$BUCKET_NAME/hls/$trailer_id/
            gcloud storage objects update "gs://$BUCKET_NAME/hls/$trailer_id/**" \
                --cache-control="public, max-age=31536000" 2>/dev/null || true
        fi
        
        log_info "✅ Uploaded: https://storage.googleapis.com/$BUCKET_NAME/hls/$trailer_id/"
        echo ""
    }
    
    if [ -n "$specific_trailer" ]; then
        trailer_path="$TRAILERS_DIR/$specific_trailer"
        if [ -d "$trailer_path" ]; then
            upload_trailer_folder "$trailer_path" "$specific_trailer"
        else
            log_error "Trailer not found: $trailer_path"
            echo ""
            echo "Available trailers:"
            ls -1 "$TRAILERS_DIR" 2>/dev/null || echo "  (none)"
            exit 1
        fi
    else
        if [ -d "$TRAILERS_DIR" ]; then
            log_section "🎬 Uploading all trailers"
            echo ""
            
            # Show summary first
            local total_m3u8=$(find "$TRAILERS_DIR" -type f -name "*.m3u8" 2>/dev/null | wc -l | tr -d ' ')
            local total_ts=$(find "$TRAILERS_DIR" -type f -name "*.ts" 2>/dev/null | wc -l | tr -d ' ')
            local total_jpg=$(find "$TRAILERS_DIR" -type f -name "*.jpg" 2>/dev/null | wc -l | tr -d ' ')
            local total_size=$(du -sh "$TRAILERS_DIR" 2>/dev/null | cut -f1 || echo "unknown")
            local trailer_count=$(ls -1d "$TRAILERS_DIR"/*/ 2>/dev/null | wc -l | tr -d ' ')
            
            echo "📊 Summary:"
            echo "  - Trailers: $trailer_count"
            echo "  - Playlists (.m3u8): $total_m3u8"
            echo "  - Segments (.ts): $total_ts"
            echo "  - Thumbnails (.jpg): $total_jpg"
            echo "  - Total size: $total_size"
            echo ""
            
            for trailer_dir in "$TRAILERS_DIR"/*/; do
                if [ -d "$trailer_dir" ]; then
                    trailer_id=$(basename "$trailer_dir")
                    upload_trailer_folder "$trailer_dir" "$trailer_id"
                fi
            done
        else
            log_warn "No local trailers found in $TRAILERS_DIR"
        fi
    fi
    
    echo ""
    log_info "Trailer upload complete!"
    log_info "Base URL: https://storage.googleapis.com/$BUCKET_NAME/hls/"
}

# ========================================
# IMAGE UPLOAD
# ========================================
upload_images() {
    local IMAGE_DIR="$SCRIPT_DIR/../video-server/public"
    local SUPPORTED_CATEGORIES=("logos" "posters" "backdrops" "profiles")
    local category="$1"
    
    # Track totals for summary
    declare -A UPLOAD_COUNTS
    declare -A UPLOAD_SIZES
    local TOTAL_FILES=0
    
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
            UPLOAD_COUNTS[$cat]=0
            return 0
        fi
        
        local dir_size=$(du -sh "$source_path" 2>/dev/null | cut -f1 || echo "unknown")
        
        # Store for summary
        UPLOAD_COUNTS[$cat]=$file_count
        UPLOAD_SIZES[$cat]=$dir_size
        TOTAL_FILES=$((TOTAL_FILES + file_count))
        
        log_section "📁 Uploading $cat"
        echo "Source: $source_path"
        echo "Files: $file_count ($dir_size)"
        echo ""
        
        if [ -n "$DRY_RUN" ]; then
            log_info "Would upload $file_count files (dry run)"
            gcloud storage rsync -r --dry-run "$source_path" gs://$BUCKET_NAME/$cat/
        else
            gcloud storage rsync -r "$source_path" gs://$BUCKET_NAME/$cat/
            gcloud storage objects update "gs://$BUCKET_NAME/$cat/**" \
                --cache-control="public, max-age=31536000" 2>/dev/null || true
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
    
    # Show summary
    echo ""
    log_info "Image upload complete!"
    echo ""
    echo "📊 Summary:"
    for cat in "${SUPPORTED_CATEGORIES[@]}"; do
        local count=${UPLOAD_COUNTS[$cat]:-0}
        local size=${UPLOAD_SIZES[$cat]:-"0"}
        if [ "$count" -gt 0 ]; then
            echo "  - $cat: $count files ($size)"
        else
            echo "  - $cat: 0 files"
        fi
    done
    echo "  - Total: $TOTAL_FILES files"
    echo ""
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
case $UPLOAD_TYPE in
    all)
        log_section "🚀 Uploading everything (videos, trailers, images)"
        echo ""
        
        # Videos
        BUCKET_NAME=$(get_bucket_name "videos")
        log_info "Videos bucket: $BUCKET_NAME"
        ensure_bucket_exists "$BUCKET_NAME" "false"
        upload_videos ""
        
        # Trailers
        BUCKET_NAME=$(get_bucket_name "trailers")
        log_info "Trailers bucket: $BUCKET_NAME"
        ensure_bucket_exists "$BUCKET_NAME" "true"
        upload_trailers ""
        
        # Images
        BUCKET_NAME=$(get_bucket_name "images")
        log_info "Images bucket: $BUCKET_NAME"
        ensure_bucket_exists "$BUCKET_NAME" "true"
        upload_images "all"
        
        echo ""
        log_info "✅ All uploads complete!"
        ;;
    videos)
        upload_videos "$TARGET"
        ;;
    trailers)
        upload_trailers "$TARGET"
        ;;
    images)
        upload_images "$TARGET"
        ;;
esac

echo ""
