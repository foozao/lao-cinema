#!/bin/bash
# Lao Cinema - Database Restore Script
# Restores the Cloud SQL database from a backup

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

# Check correct GCP project is active
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    log_error "Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID"
    log_error "Run: gcloud config configurations activate lao-cinema"
    exit 1
fi
log_info "✓ Correct GCP project active: $PROJECT_ID"

# List available backups
log_info "Available backups for $DB_INSTANCE_NAME:"
echo ""
gcloud sql backups list --instance=$DB_INSTANCE_NAME --limit=10

echo ""
log_warn "⚠️  WARNING: This will restore the database to a previous state."
log_warn "⚠️  All data created after the backup will be LOST."
echo ""

# Prompt for backup ID
read -p "Enter the BACKUP_ID to restore (or 'cancel' to abort): " BACKUP_ID

if [ "$BACKUP_ID" = "cancel" ] || [ -z "$BACKUP_ID" ]; then
    log_info "Restore cancelled."
    exit 0
fi

# Confirm the action
echo ""
log_warn "You are about to restore database '$DB_INSTANCE_NAME' from backup '$BACKUP_ID'"
read -p "Type 'RESTORE' to confirm: " CONFIRM

if [ "$CONFIRM" != "RESTORE" ]; then
    log_info "Restore cancelled."
    exit 0
fi

log_info "Starting database restore..."

# Perform the restore
gcloud sql backups restore $BACKUP_ID \
    --backup-instance=$DB_INSTANCE_NAME \
    --backup-project=$PROJECT_ID

if [ $? -eq 0 ]; then
    log_info "✅ Database restored successfully!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Verify data integrity"
    log_info "2. Check application functionality"
    log_info "3. Monitor logs for any issues"
else
    log_error "❌ Restore failed!"
    exit 1
fi
