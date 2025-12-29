#!/bin/bash
# Lao Cinema - Export Database Dump Script
# Creates a local pg_dump file for offline backup

set -e  # Exit on error

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
DB_INSTANCE_NAME="${1:-laocinema-preview}"  # Default to preview, or use first argument
CONNECTION_NAME="$PROJECT_ID:asia-southeast1:$DB_INSTANCE_NAME"
DB_NAME="laocinema"
DB_USER="laocinema"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$(dirname "$0")/../backups"
BACKUP_FILE="$BACKUP_DIR/laocinema_backup_$TIMESTAMP.sql"

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
    log_error "Cloud SQL Proxy not found!"
    log_error "Download it with:"
    log_error "  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64"
    log_error "  chmod +x cloud-sql-proxy"
    exit 1
fi

# Check if CLOUD_DB_PASS is set
if [ -z "$CLOUD_DB_PASS" ]; then
    log_error "CLOUD_DB_PASS not set!"
    log_error "Add it to .env file in project root"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log_info "Starting Cloud SQL Proxy..."
./cloud-sql-proxy $CONNECTION_NAME &
PROXY_PID=$!

# Wait for proxy to be ready
sleep 3

log_info "Creating database dump: $BACKUP_FILE"

# Create the dump
PGPASSWORD="$CLOUD_DB_PASS" pg_dump \
    -h 127.0.0.1 \
    -p 5432 \
    -U $DB_USER \
    -d $DB_NAME \
    --no-owner \
    --no-acl \
    -f "$BACKUP_FILE"

# Stop the proxy
kill $PROXY_PID 2>/dev/null || true

if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "✅ Database dump created successfully!"
    log_info "   File: $BACKUP_FILE"
    log_info "   Size: $BACKUP_SIZE"
    log_info ""
    log_info "To restore from this dump:"
    log_info "  ./scripts/import-db-dump.sh $BACKUP_FILE"
else
    log_error "❌ Database dump failed!"
    exit 1
fi
