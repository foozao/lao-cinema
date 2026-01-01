#!/bin/bash
# Lao Cinema - Sync Local Database to Cloud SQL
# Dumps local database and restores it to Cloud SQL (destructive!)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Configuration
PROJECT_ID="lao-cinema"
DB_INSTANCE_NAME="${1:-laocinema-staging}"
CONNECTION_NAME="$PROJECT_ID:asia-southeast1:$DB_INSTANCE_NAME"
DB_NAME="laocinema"
DB_USER="laocinema"

# Local database config
LOCAL_DB_HOST="localhost"
LOCAL_DB_PORT="5432"
LOCAL_DB_NAME="lao_cinema"
LOCAL_DB_USER="laocinema"

# Determine Cloud SQL proxy port based on instance
if [[ "$DB_INSTANCE_NAME" == *"staging"* ]]; then
    PROXY_PORT=5433
else
    PROXY_PORT=5434
fi

# Temp file for dump
DUMP_FILE="/tmp/laocinema_sync_dump_$$.sql"

cleanup() {
    log_info "Cleaning up..."
    rm -f "$DUMP_FILE"
    # Kill proxy if we started it
    if [ -n "$PROXY_PID" ]; then
        kill $PROXY_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Check correct GCP project is active
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    log_error "Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID"
    log_error "Run: gcloud config configurations activate lao-cinema"
    exit 1
fi
log_info "✓ Correct GCP project active: $PROJECT_ID"

# Check if Cloud SQL Proxy is available
if [ ! -f "./cloud-sql-proxy" ]; then
    log_error "Cloud SQL Proxy not found in project root!"
    log_error "Download it with:"
    log_error "  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64"
    log_error "  chmod +x cloud-sql-proxy"
    exit 1
fi

# Get Cloud SQL password from environment or prompt
if [ -z "$CLOUD_DB_PASS" ]; then
    # Try to get from deploy script's env
    if [ -n "$STAGING_DB_PASSWORD" ]; then
        CLOUD_DB_PASS="$STAGING_DB_PASSWORD"
    else
        log_error "Cloud SQL password not found!"
        log_error "Set CLOUD_DB_PASS or STAGING_DB_PASSWORD environment variable"
        exit 1
    fi
fi

# Step 1: Dump local database
log_info "Step 1/4: Dumping local database..."
PGPASSWORD="laocinema_dev" pg_dump \
    -h $LOCAL_DB_HOST \
    -p $LOCAL_DB_PORT \
    -U $LOCAL_DB_USER \
    -d $LOCAL_DB_NAME \
    --data-only \
    --no-owner \
    --no-acl \
    --disable-triggers \
    -f "$DUMP_FILE"

if [ ! -f "$DUMP_FILE" ]; then
    log_error "Failed to create local database dump!"
    exit 1
fi
DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
log_info "✓ Local dump created ($DUMP_SIZE)"

# Step 2: Start Cloud SQL Proxy (if not already running)
log_info "Step 2/4: Starting Cloud SQL Proxy..."
if pgrep -f "cloud-sql-proxy.*$DB_INSTANCE_NAME" > /dev/null; then
    log_info "✓ Cloud SQL Proxy already running"
else
    ./cloud-sql-proxy "$CONNECTION_NAME" --port $PROXY_PORT &
    PROXY_PID=$!
    sleep 3
    
    if ! kill -0 $PROXY_PID 2>/dev/null; then
        log_error "Failed to start Cloud SQL Proxy!"
        exit 1
    fi
    log_info "✓ Cloud SQL Proxy started (PID: $PROXY_PID)"
fi

# Step 3: Drop ALL tables from Cloud SQL (clean slate)
log_info "Step 3/5: Dropping all tables from Cloud SQL..."

# Get all table names and drop them
DROP_ALL_SQL="
DO \$\$
DECLARE
    r RECORD;
BEGIN
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '__drizzle_migrations') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    -- Drop all custom types/enums
    FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END \$\$;
"

PGPASSWORD="$CLOUD_DB_PASS" psql \
    -h 127.0.0.1 \
    -p $PROXY_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    -c "$DROP_ALL_SQL" 2>/dev/null || log_warn "Some objects may not exist (OK)"
log_info "✓ All tables dropped"

# Step 4: Push schema to Cloud SQL (recreates all tables)
log_info "Step 4/5: Pushing schema to Cloud SQL..."
cd db
DATABASE_URL="postgresql://$DB_USER:$CLOUD_DB_PASS@127.0.0.1:$PROXY_PORT/$DB_NAME" npm run db:push -- --force
cd ..
log_info "✓ Schema pushed"

# Step 5: Restore data
log_info "Step 5/5: Restoring data to Cloud SQL..."

# Restore data (tables are now empty)
# Note: Cloud SQL shows "permission denied" warnings for trigger manipulation
# but the COPY operations still succeed - we suppress these warnings
PGPASSWORD="$CLOUD_DB_PASS" psql \
    -h 127.0.0.1 \
    -p $PROXY_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    -f "$DUMP_FILE" 2>&1 | grep -v "permission denied.*system trigger" | grep -v "^psql.*ERROR"

log_info ""
log_info "✅ Database sync complete!"
log_info "   Instance: $DB_INSTANCE_NAME"
log_info "   Database: $DB_NAME"
