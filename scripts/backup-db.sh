#!/bin/bash
# Lao Cinema - Manual Database Backup Script
# Creates an on-demand backup of the Cloud SQL database

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
DB_INSTANCE_NAME="${1:-laocinema-preview}"  # Default to preview, or use first argument
BACKUP_DESCRIPTION="${2:-Manual backup $(date +%Y-%m-%d_%H-%M-%S)}"

# Check correct GCP project is active
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    log_error "Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID"
    log_error "Run: gcloud config configurations activate lao-cinema"
    exit 1
fi
log_info "✓ Correct GCP project active: $PROJECT_ID"

log_info "Creating manual backup of database: $DB_INSTANCE_NAME"
log_info "Description: $BACKUP_DESCRIPTION"

# Create the backup
gcloud sql backups create \
    --instance=$DB_INSTANCE_NAME \
    --description="$BACKUP_DESCRIPTION"

if [ $? -eq 0 ]; then
    log_info "✅ Backup created successfully!"
    log_info ""
    log_info "To view all backups:"
    log_info "  gcloud sql backups list --instance=$DB_INSTANCE_NAME"
    log_info ""
    log_info "To restore from this backup, use: ./scripts/restore-db.sh"
else
    log_error "❌ Backup failed!"
    exit 1
fi
