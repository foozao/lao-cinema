#!/bin/bash
# Upload images to Google Cloud Storage and update database URLs
# Usage: 
#   ./upload-images-to-gcs.sh logos              # Upload all logos
#   ./upload-images-to-gcs.sh posters            # Upload all posters
#   ./upload-images-to-gcs.sh backdrops          # Upload all backdrops
#   ./upload-images-to-gcs.sh profiles           # Upload all profile images
#   ./upload-images-to-gcs.sh all                # Upload all categories
#   ./upload-images-to-gcs.sh logos --dry-run    # Dry run mode
#   ./upload-images-to-gcs.sh all --update-db    # Upload and update database URLs

set -e

# Force gsutil to use Python 3.9 (compatible with gsutil, avoids Python 3.13 issues)
export CLOUDSDK_PYTHON=/opt/homebrew/bin/python3.9

# Configuration
BUCKET_NAME="lao-cinema-images"
PROJECT_ID="lao-cinema"
IMAGE_SERVER_DIR="video-server/public"

# Supported image categories
SUPPORTED_CATEGORIES=("logos" "posters" "backdrops" "profiles")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

log_section() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Check GCP project configuration
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    log_error "Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID"
    log_error "Run: gcloud config configurations activate lao-cinema"
    exit 1
fi
log_info "✓ GCP project: $PROJECT_ID"
echo ""

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    log_error "gsutil is not installed"
    echo "Install with: brew install --cask google-cloud-sdk"
    echo "Then run: gcloud auth login"
    exit 1
fi

# Parse arguments
CATEGORY="$1"
DRY_RUN=""
UPDATE_DB=""

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN="true"
            log_warn "DRY RUN MODE - No files will be uploaded"
            echo ""
            ;;
        --update-db)
            UPDATE_DB="true"
            log_info "Will update database URLs after upload"
            echo ""
            ;;
    esac
done

# Show usage if no arguments
if [ -z "$CATEGORY" ]; then
    echo "Usage: $0 <category> [--dry-run]"
    echo ""
    echo "Categories:"
    echo "  logos      - Upload logo images"
    echo "  posters    - Upload movie poster images"
    echo "  backdrops  - Upload backdrop/banner images"
    echo "  profiles   - Upload profile images"
    echo "  all        - Upload all categories"
    echo ""
    echo "Options:"
    echo "  --dry-run  - Show what would be uploaded without actually uploading"
    echo "  --update-db - Update database URLs after upload (Cloud SQL only)"
    echo ""
    echo "Examples:"
    echo "  $0 logos"
    echo "  $0 all --dry-run"
    exit 1
fi

# Validate category
if [ "$CATEGORY" != "all" ]; then
    if [[ ! " ${SUPPORTED_CATEGORIES[@]} " =~ " ${CATEGORY} " ]]; then
        log_error "Invalid category: $CATEGORY"
        echo "Supported categories: ${SUPPORTED_CATEGORIES[@]} all"
        exit 1
    fi
fi

# Check if bucket exists, create if not
if ! gsutil ls -b gs://$BUCKET_NAME &> /dev/null; then
    if [ -n "$DRY_RUN" ]; then
        log_info "Would create bucket gs://$BUCKET_NAME (dry run)"
    else
        log_info "Creating bucket gs://$BUCKET_NAME..."
        gsutil mb -p $PROJECT_ID -l asia-southeast1 gs://$BUCKET_NAME
        
        # Enable uniform bucket-level access
        gsutil uniformbucketlevelaccess set on gs://$BUCKET_NAME
        
        # Make bucket public-read
        gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME
        
        log_info "Bucket created successfully"
    fi
else
    log_info "Bucket gs://$BUCKET_NAME exists"
fi

# Function to upload a category
upload_category() {
    local category=$1
    local source_path="$IMAGE_SERVER_DIR/$category"
    
    if [ ! -d "$source_path" ]; then
        log_warn "Directory not found: $source_path"
        return 1
    fi
    
    # Count files
    local file_count=$(find "$source_path" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" -o -iname "*.gif" \) 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$file_count" -eq 0 ]; then
        log_warn "No image files found in $source_path"
        return 0
    fi
    
    local dir_size=$(du -sh "$source_path" 2>/dev/null | cut -f1 || echo "unknown")
    
    log_section "📁 Uploading $category"
    echo "Source: $source_path"
    echo "Files: $file_count ($dir_size)"
    echo "Destination: gs://$BUCKET_NAME/$category/"
    echo ""
    
    if [ -n "$DRY_RUN" ]; then
        log_info "Would upload $file_count files (dry run)"
        gsutil -m rsync -r -c -n "$source_path" gs://$BUCKET_NAME/$category/
    else
        # Use rsync for resumable uploads (skips existing files automatically)
        # -m: parallel (multi-threaded)
        # -r: recursive
        # -d: delete extra files in destination (use with caution)
        # Disable multiprocessing to avoid MacOS Python crashes
        # Skip checksum comparison (-c) to avoid Python 2/3 compatibility issues
        gsutil -o "GSUtil:parallel_process_count=1" -m rsync -r "$source_path" gs://$BUCKET_NAME/$category/
        
        # Set cache control and content-type for image files
        # Disable multiprocessing to avoid MacOS Python crashes
        log_info "Setting cache headers..."
        gsutil -o "GSUtil:parallel_process_count=1" -m setmeta -h "Cache-Control:public, max-age=31536000" \
            "gs://$BUCKET_NAME/$category/**" 2>/dev/null || true
        
        log_info "✅ Uploaded $category successfully"
    fi
    
    echo ""
}

# Upload based on category
if [ "$CATEGORY" == "all" ]; then
    log_section "🚀 Uploading all image categories"
    echo ""
    
    for cat in "${SUPPORTED_CATEGORIES[@]}"; do
        upload_category "$cat"
    done
else
    upload_category "$CATEGORY"
fi

# Print summary
log_section "📊 Summary"
echo ""
log_info "Bucket: gs://$BUCKET_NAME"
log_info "Base URL: https://storage.googleapis.com/$BUCKET_NAME/"
echo ""

if [ -n "$DRY_RUN" ]; then
    log_warn "This was a dry run. No files were uploaded."
else
    log_info "Upload complete!"
    echo ""
    log_info "Example URLs:"
    log_info "  Logos: https://storage.googleapis.com/$BUCKET_NAME/logos/filename.png"
    log_info "  Posters: https://storage.googleapis.com/$BUCKET_NAME/posters/filename.jpg"
    log_info "  Backdrops: https://storage.googleapis.com/$BUCKET_NAME/backdrops/filename.jpg"
    log_info "  Profiles: https://storage.googleapis.com/$BUCKET_NAME/profiles/filename.jpg"
fi

echo ""

# Update database URLs if requested
if [ -n "$UPDATE_DB" ] && [ -z "$DRY_RUN" ]; then
    log_section "🔄 Updating Database URLs"
    echo ""
    
    # Check if Cloud SQL proxy is running
    if ! lsof -i:5433 > /dev/null 2>&1; then
        log_error "Cloud SQL proxy is not running on port 5433"
        log_error "Start it with: ./cloud-sql-proxy <CONNECTION_NAME> --port=5433"
        exit 1
    fi
    
    log_info "Connecting to Cloud SQL via proxy..."
    
    # Database configuration
    CLOUD_DB_NAME="laocinema"
    CLOUD_DB_USER="laocinema"
    CLOUD_DB_PASS="${CLOUD_DB_PASS:?Error: CLOUD_DB_PASS environment variable is not set}"
    GCS_BASE_URL="https://storage.googleapis.com/$BUCKET_NAME"
    
    # Update movie_images table
    log_info "Updating movie_images URLs..."
    PGPASSWORD=$CLOUD_DB_PASS psql -h 127.0.0.1 -p 5433 -U $CLOUD_DB_USER -d $CLOUD_DB_NAME << EOF
-- Update poster URLs
UPDATE movie_images 
SET file_path = REPLACE(file_path, 'http://localhost:3002/posters/', '$GCS_BASE_URL/posters/')
WHERE file_path LIKE 'http://localhost:3002/posters/%';

-- Update backdrop URLs
UPDATE movie_images 
SET file_path = REPLACE(file_path, 'http://localhost:3002/backdrops/', '$GCS_BASE_URL/backdrops/')
WHERE file_path LIKE 'http://localhost:3002/backdrops/%';

-- Update logo URLs
UPDATE movie_images 
SET file_path = REPLACE(file_path, 'http://localhost:3002/logos/', '$GCS_BASE_URL/logos/')
WHERE file_path LIKE 'http://localhost:3002/logos/%';
EOF
    
    # Update person_images table
    log_info "Updating person_images URLs..."
    PGPASSWORD=$CLOUD_DB_PASS psql -h 127.0.0.1 -p 5433 -U $CLOUD_DB_USER -d $CLOUD_DB_NAME << EOF
-- Update profile URLs
UPDATE person_images 
SET file_path = REPLACE(file_path, 'http://localhost:3002/profiles/', '$GCS_BASE_URL/profiles/')
WHERE file_path LIKE 'http://localhost:3002/profiles/%';
EOF
    
    # Update movies table (poster_path and backdrop_path)
    log_info "Updating movies table URLs..."
    PGPASSWORD=$CLOUD_DB_PASS psql -h 127.0.0.1 -p 5433 -U $CLOUD_DB_USER -d $CLOUD_DB_NAME << EOF
-- Update poster_path
UPDATE movies 
SET poster_path = REPLACE(poster_path, 'http://localhost:3002/posters/', '$GCS_BASE_URL/posters/')
WHERE poster_path LIKE 'http://localhost:3002/posters/%';

-- Update backdrop_path
UPDATE movies 
SET backdrop_path = REPLACE(backdrop_path, 'http://localhost:3002/backdrops/', '$GCS_BASE_URL/backdrops/')
WHERE backdrop_path LIKE 'http://localhost:3002/backdrops/%';

-- Set poster_path from primary movie_images if NULL
UPDATE movies m
SET poster_path = mi.file_path
FROM movie_images mi
WHERE m.id = mi.movie_id 
  AND mi.type = 'poster' 
  AND mi.is_primary = true 
  AND m.poster_path IS NULL;

-- Set backdrop_path from primary movie_images if NULL
UPDATE movies m
SET backdrop_path = mi.file_path
FROM movie_images mi
WHERE m.id = mi.movie_id 
  AND mi.type = 'backdrop' 
  AND mi.is_primary = true 
  AND m.backdrop_path IS NULL;
EOF
    
    # Update people table (profile_path)
    log_info "Updating people table URLs..."
    PGPASSWORD=$CLOUD_DB_PASS psql -h 127.0.0.1 -p 5433 -U $CLOUD_DB_USER -d $CLOUD_DB_NAME << EOF
-- Update profile_path
UPDATE people 
SET profile_path = REPLACE(profile_path, 'http://localhost:3002/profiles/', '$GCS_BASE_URL/profiles/')
WHERE profile_path LIKE 'http://localhost:3002/profiles/%';

-- Set profile_path from primary person_images if NULL
UPDATE people p
SET profile_path = pi.file_path
FROM person_images pi
WHERE p.id = pi.person_id 
  AND pi.is_primary = true 
  AND p.profile_path IS NULL;
EOF
    
    # Update production_companies table (custom_logo_url)
    log_info "Updating production_companies table URLs..."
    PGPASSWORD=$CLOUD_DB_PASS psql -h 127.0.0.1 -p 5433 -U $CLOUD_DB_USER -d $CLOUD_DB_NAME << EOF
-- Update custom_logo_url
UPDATE production_companies 
SET custom_logo_url = REPLACE(custom_logo_url, 'http://localhost:3002/logos/', '$GCS_BASE_URL/logos/')
WHERE custom_logo_url LIKE 'http://localhost:3002/logos/%';
EOF
    
    log_info "✅ Database URLs updated successfully"
    echo ""
    log_info "All localhost:3002 URLs have been replaced with GCS URLs"
    log_info "Primary images have been set in movies/people tables where NULL"
fi

echo ""
