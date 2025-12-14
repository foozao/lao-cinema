#!/bin/bash

# Sync local database to Cloud SQL
# This script dumps your local database and restores it to Cloud SQL

set -e

# Load environment variables from .env if it exists
[[ -f "$(dirname "$0")/../.env" ]] && source "$(dirname "$0")/../.env"

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
REGION="asia-southeast1"
INSTANCE_NAME="lao-cinema-db"
CLOUD_DB_NAME="laocinema"
CLOUD_DB_USER="laocinema"
CLOUD_DB_PASS="${CLOUD_DB_PASS:?Error: CLOUD_DB_PASS environment variable is not set}"

LOCAL_DB_NAME="lao_cinema"
LOCAL_DB_USER="laocinema"
LOCAL_DB_PASS="laocinema_dev"
LOCAL_DB_HOST="localhost"
LOCAL_DB_PORT="5432"

DUMP_FILE="/tmp/lao_cinema_dump_$(date +%Y%m%d_%H%M%S).sql"

echo ""
log_info "========================================="
log_info "Database Sync: Local → Cloud SQL"
log_info "========================================="
echo ""

# Check if local database exists
log_info "Checking local database connection..."
if ! PGPASSWORD=$LOCAL_DB_PASS psql -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -c '\q' 2>/dev/null; then
    log_error "Cannot connect to local database"
    log_error "Make sure PostgreSQL is running and credentials are correct"
    exit 1
fi
log_info "✓ Local database connection successful"

# Dump local database
log_info "Dumping local database to $DUMP_FILE..."
PGPASSWORD=$LOCAL_DB_PASS pg_dump \
    -h $LOCAL_DB_HOST \
    -p $LOCAL_DB_PORT \
    -U $LOCAL_DB_USER \
    -d $LOCAL_DB_NAME \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    -f $DUMP_FILE

if [ $? -ne 0 ]; then
    log_error "Failed to dump local database"
    exit 1
fi
log_info "✓ Database dumped successfully"

# Get Cloud SQL connection info
log_info "Getting Cloud SQL connection info..."
CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --format='value(connectionName)')

if [ -z "$CONNECTION_NAME" ]; then
    log_error "Could not get Cloud SQL connection name"
    exit 1
fi
log_info "✓ Connection name: $CONNECTION_NAME"

# Check if Cloud SQL proxy is running
log_info "Checking for Cloud SQL proxy..."
if lsof -i:5433 > /dev/null 2>&1; then
    log_warn "Port 5433 is already in use (proxy may be running)"
    PROXY_PORT=5433
else
    PROXY_PORT=5433
    log_info "Starting Cloud SQL proxy on port $PROXY_PORT..."
    
    # Start Cloud SQL proxy in background
    cloud-sql-proxy $CONNECTION_NAME --port=$PROXY_PORT &
    PROXY_PID=$!
    
    # Wait for proxy to be ready
    sleep 3
    
    if ! kill -0 $PROXY_PID 2>/dev/null; then
        log_error "Cloud SQL proxy failed to start"
        log_error "Install it with: gcloud components install cloud-sql-proxy"
        rm -f $DUMP_FILE
        exit 1
    fi
    log_info "✓ Cloud SQL proxy started (PID: $PROXY_PID)"
fi

# Restore to Cloud SQL
log_info "Restoring database to Cloud SQL..."
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
log_info "✓ Database restored successfully"

# Cleanup
if [ ! -z "$PROXY_PID" ]; then
    log_info "Stopping Cloud SQL proxy..."
    kill $PROXY_PID 2>/dev/null
fi

log_info "Cleaning up dump file..."
rm -f $DUMP_FILE

echo ""
log_info "========================================="
log_info "Database sync completed successfully! 🎉"
log_info "========================================="
echo ""
log_info "Your local database has been synced to Cloud SQL"
log_info "Cloud SQL database: $CLOUD_DB_NAME"
echo ""
