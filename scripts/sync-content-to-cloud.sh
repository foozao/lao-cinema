#!/bin/bash

# Sync content (movies, people, etc.) to Cloud SQL WITHOUT touching user data
# This is safe for staging/preview environments where you want to preserve:
# - User accounts
# - Rentals
# - Watch progress
# - Analytics events
# - Sessions

set -e

# Load environment variables from .env if it exists
[[ -f "$(dirname "$0")/../.env" ]] && source "$(dirname "$0")/../.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Configuration
PROJECT_ID="lao-cinema"
REGION="asia-southeast1"
INSTANCE_NAME="${1:-laocinema-preview}"  # Default to preview, or use first argument
CLOUD_DB_NAME="laocinema"
CLOUD_DB_USER="laocinema"
CLOUD_DB_PASS="${CLOUD_DB_PASS:?Error: CLOUD_DB_PASS environment variable is not set}"

LOCAL_DB_NAME="lao_cinema"
LOCAL_DB_USER="laocinema"
LOCAL_DB_PASS="laocinema_dev"
LOCAL_DB_HOST="localhost"
LOCAL_DB_PORT="5432"

DUMP_FILE="/tmp/lao_cinema_content_$(date +%Y%m%d_%H%M%S).sql"

# Content tables to sync (excludes user data)
CONTENT_TABLES=(
    "genres"
    "genre_translations"
    "movies"
    "movie_translations"
    "movie_genres"
    "movie_images"
    "video_sources"
    "people"
    "people_translations"
    "person_images"
    "person_aliases"
    "movie_cast"
    "movie_cast_translations"
    "movie_crew"
    "movie_crew_translations"
    "production_companies"
    "production_company_translations"
    "movie_production_companies"
    "short_packs"
    "short_pack_translations"
    "short_pack_items"
    "homepage_featured"
    "trailers"
    "award_shows"
    "award_show_translations"
    "award_editions"
    "award_edition_translations"
    "award_categories"
    "award_category_translations"
    "award_nominations"
    "award_nomination_translations"
)

# User data tables (will NOT be synced)
USER_TABLES=(
    "users"
    "user_sessions"
    "oauth_accounts"
    "rentals"
    "watch_progress"
    "video_analytics_events"
    "audit_logs"
)

echo ""
log_section "📦 Content Sync: Local → Cloud SQL"
echo ""

# Check GCP project configuration
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    log_error "Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID"
    log_error "Run: gcloud config configurations activate lao-cinema"
    exit 1
fi
log_info "✓ GCP project: $PROJECT_ID"
echo ""

log_info "This script syncs ONLY content tables (movies, people, etc.)"
log_info "User data (accounts, rentals, analytics) will NOT be touched"
echo ""

# Parse arguments
DRY_RUN=""
PUSH_SCHEMA=""
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN="true"
            log_warn "DRY RUN MODE - No changes will be made"
            ;;
        --with-schema)
            PUSH_SCHEMA="true"
            log_info "Will push schema changes before syncing content"
            ;;
    esac
done
echo ""

# Usage:
#   ./sync-content-to-cloud.sh                   # Sync content only
#   ./sync-content-to-cloud.sh --with-schema     # Push schema changes first, then sync content
#   ./sync-content-to-cloud.sh --dry-run         # Test without making changes

# Check if local database exists
log_info "Checking local database connection..."
if ! PGPASSWORD=$LOCAL_DB_PASS psql -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -c '\q' 2>/dev/null; then
    log_error "Cannot connect to local database"
    log_error "Make sure PostgreSQL is running and credentials are correct"
    exit 1
fi
log_info "✓ Local database connection successful"

# Dump only content tables
log_info "Dumping content tables from local database..."
echo ""
log_info "Tables to sync:"
for table in "${CONTENT_TABLES[@]}"; do
    echo "  - $table"
done
echo ""

PGPASSWORD=$LOCAL_DB_PASS pg_dump \
    -h $LOCAL_DB_HOST \
    -p $LOCAL_DB_PORT \
    -U $LOCAL_DB_USER \
    -d $LOCAL_DB_NAME \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    $(printf -- "-t %s " "${CONTENT_TABLES[@]}") \
    -f $DUMP_FILE

if [ $? -ne 0 ]; then
    log_error "Failed to dump local database"
    exit 1
fi
log_info "✓ Content tables dumped successfully"

if [ -n "$DRY_RUN" ]; then
    log_info "Dump file created at: $DUMP_FILE"
    log_info "File size: $(du -h $DUMP_FILE | cut -f1)"
    echo ""
    log_warn "DRY RUN: Skipping Cloud SQL restore"
    log_info "To actually sync, run: $0"
    echo ""
    exit 0
fi

# Get Cloud SQL connection info
log_info "Getting Cloud SQL connection info..."
CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --format='value(connectionName)')

if [ -z "$CONNECTION_NAME" ]; then
    log_error "Could not get Cloud SQL connection name"
    rm -f $DUMP_FILE
    exit 1
fi
log_info "✓ Connection name: $CONNECTION_NAME"

# Push schema changes if requested
if [ -n "$PUSH_SCHEMA" ] && [ -z "$DRY_RUN" ]; then
    log_section "📋 Pushing Schema Changes"
    echo ""
    log_info "Starting Cloud SQL proxy for schema push..."
    
    # Start proxy temporarily for schema push
    # Try local binary first, then gcloud SDK version
    PROXY_LOG="/tmp/cloud-sql-proxy-schema.log"
    if [ -f "./cloud-sql-proxy" ]; then
        ./cloud-sql-proxy $CONNECTION_NAME --port=5433 > "$PROXY_LOG" 2>&1 &
    else
        cloud-sql-proxy $CONNECTION_NAME --port=5433 > "$PROXY_LOG" 2>&1 &
    fi
    SCHEMA_PROXY_PID=$!
    
    # Wait longer for proxy to start
    log_info "Waiting for proxy to be ready..."
    sleep 5
    
    if ! kill -0 $SCHEMA_PROXY_PID 2>/dev/null; then
        log_error "Cloud SQL proxy failed to start for schema push"
        log_error "Proxy log:"
        cat "$PROXY_LOG"
        rm -f $DUMP_FILE
        exit 1
    fi
    
    # Check if port is actually listening
    if ! lsof -i:5433 > /dev/null 2>&1; then
        log_error "Proxy started but not listening on port 5433"
        log_error "Proxy log:"
        cat "$PROXY_LOG"
        kill $SCHEMA_PROXY_PID 2>/dev/null
        rm -f $DUMP_FILE
        exit 1
    fi
    
    log_info "Pushing schema changes to Cloud SQL..."
    cd "$(dirname "$0")/../db"
    DATABASE_URL="postgresql://$CLOUD_DB_USER:$CLOUD_DB_PASS@127.0.0.1:5433/$CLOUD_DB_NAME" npm run db:push
    
    if [ $? -ne 0 ]; then
        log_error "Failed to push schema changes"
        kill $SCHEMA_PROXY_PID 2>/dev/null
        rm -f $DUMP_FILE
        exit 1
    fi
    
    log_info "✓ Schema changes pushed successfully"
    kill $SCHEMA_PROXY_PID 2>/dev/null
    cd - > /dev/null
    echo ""
fi

# Check if Cloud SQL proxy is running
log_info "Checking for Cloud SQL proxy..."
PROXY_PID=""
if lsof -i:5433 > /dev/null 2>&1; then
    log_warn "Port 5433 is already in use (proxy may be running)"
    PROXY_PORT=5433
else
    PROXY_PORT=5433
    log_info "Starting Cloud SQL proxy on port $PROXY_PORT..."
    
    # Start Cloud SQL proxy in background
    # Try local binary first, then gcloud SDK version
    PROXY_LOG="/tmp/cloud-sql-proxy-content.log"
    if [ -f "./cloud-sql-proxy" ]; then
        ./cloud-sql-proxy $CONNECTION_NAME --port=$PROXY_PORT > "$PROXY_LOG" 2>&1 &
    else
        cloud-sql-proxy $CONNECTION_NAME --port=$PROXY_PORT > "$PROXY_LOG" 2>&1 &
    fi
    PROXY_PID=$!
    
    # Wait for proxy to be ready
    log_info "Waiting for proxy to be ready..."
    sleep 5
    
    if ! kill -0 $PROXY_PID 2>/dev/null; then
        log_error "Cloud SQL proxy failed to start"
        log_error "Proxy log:"
        cat "$PROXY_LOG"
        rm -f $DUMP_FILE
        exit 1
    fi
    
    # Check if port is actually listening
    if ! lsof -i:$PROXY_PORT > /dev/null 2>&1; then
        log_error "Proxy started but not listening on port $PROXY_PORT"
        log_error "Proxy log:"
        cat "$PROXY_LOG"
        kill $PROXY_PID 2>/dev/null
        rm -f $DUMP_FILE
        exit 1
    fi
    
    log_info "✓ Cloud SQL proxy started (PID: $PROXY_PID)"
fi

# Restore to Cloud SQL
log_info "Restoring content tables to Cloud SQL..."
echo ""
log_warn "This will DROP and RECREATE the following tables:"
for table in "${CONTENT_TABLES[@]}"; do
    echo "  - $table"
done
echo ""
log_info "User data tables will NOT be affected:"
for table in "${USER_TABLES[@]}"; do
    echo "  - $table (preserved)"
done
echo ""

PGPASSWORD=$CLOUD_DB_PASS psql \
    -h 127.0.0.1 \
    -p $PROXY_PORT \
    -U $CLOUD_DB_USER \
    -d $CLOUD_DB_NAME \
    -f $DUMP_FILE

if [ $? -ne 0 ]; then
    log_error "Failed to restore database to Cloud SQL"
    if [ ! -z "$PROXY_PID" ]; then
        kill $PROXY_PID 2>/dev/null
    fi
    rm -f $DUMP_FILE
    exit 1
fi
log_info "✓ Content tables restored successfully"

# Cleanup
if [ ! -z "$PROXY_PID" ]; then
    log_info "Stopping Cloud SQL proxy..."
    kill $PROXY_PID 2>/dev/null
fi

log_info "Cleaning up dump file..."
rm -f $DUMP_FILE

echo ""
log_section "✅ Content sync completed successfully!"
echo ""
log_info "Synced tables: ${#CONTENT_TABLES[@]} content tables"
log_info "Preserved: ${#USER_TABLES[@]} user data tables"
log_info "Cloud SQL database: $CLOUD_DB_NAME"
echo ""
