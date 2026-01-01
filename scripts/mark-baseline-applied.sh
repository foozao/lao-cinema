#!/bin/bash

# Mark Baseline Migration as Applied
# 
# This script marks the initial baseline migration (0000_living_banshee) as already
# applied in the __drizzle_migrations table. Use this when:
# - You've squashed migrations into a baseline
# - The database already has the full schema
# - Running db:migrate fails with "already exists" errors
#
# Usage: ./scripts/mark-baseline-applied.sh --env staging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
DEPLOY_ENV=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            DEPLOY_ENV="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Usage: $0 --env <staging|production>"
            exit 1
            ;;
    esac
done

if [ -z "$DEPLOY_ENV" ]; then
    log_error "Environment required. Use --env staging or --env production"
    exit 1
fi

# Set connection name based on environment
case $DEPLOY_ENV in
    staging)
        CONNECTION_NAME="lao-cinema:asia-southeast1:laocinema-staging"
        CLOUD_DB_NAME="laocinema"
        ;;
    production)
        CONNECTION_NAME="lao-cinema:asia-southeast1:laocinema"
        CLOUD_DB_NAME="laocinema"
        ;;
    *)
        log_error "Invalid environment: $DEPLOY_ENV (use staging or production)"
        exit 1
        ;;
esac

CLOUD_DB_USER="${CLOUD_DB_USER:-laocinema}"
PROXY_PORT=5433

# Get database password from Secret Manager
log_info "Fetching database password from Secret Manager..."
if [ "$DEPLOY_ENV" = "production" ]; then
    SECRET_NAME="db-pass"
else
    SECRET_NAME="db-pass-staging"
fi

CLOUD_DB_PASS=$(gcloud secrets versions access latest --secret="$SECRET_NAME" 2>/dev/null)
if [ -z "$CLOUD_DB_PASS" ]; then
    log_error "Failed to fetch database password from Secret Manager"
    exit 1
fi
log_info "✓ Database password retrieved"

# Check if cloud-sql-proxy is available
if ! command -v cloud-sql-proxy &> /dev/null; then
    log_error "cloud-sql-proxy not found. Install it first:"
    log_error "  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64"
    log_error "  chmod +x cloud-sql-proxy"
    exit 1
fi

# Kill any existing process on the proxy port
if lsof -ti :$PROXY_PORT > /dev/null 2>&1; then
    log_warn "Port $PROXY_PORT in use, killing existing process..."
    lsof -ti :$PROXY_PORT | xargs kill -9 2>/dev/null
    sleep 1
fi

# Start Cloud SQL proxy
log_info "Starting Cloud SQL proxy..."
./cloud-sql-proxy $CONNECTION_NAME --port=$PROXY_PORT &
PROXY_PID=$!
sleep 3

if ! kill -0 $PROXY_PID 2>/dev/null; then
    log_error "Cloud SQL proxy failed to start"
    exit 1
fi
log_info "✓ Cloud SQL proxy started (PID: $PROXY_PID)"

# Get the baseline migration info from journal
BASELINE_TAG="0000_living_banshee"
BASELINE_TIMESTAMP=$(grep -o '"when": [0-9]*' db/migrations/meta/_journal.json | head -1 | grep -o '[0-9]*')

if [ -z "$BASELINE_TIMESTAMP" ]; then
    log_error "Could not find baseline migration in journal"
    kill $PROXY_PID 2>/dev/null
    exit 1
fi

log_info "Baseline migration: $BASELINE_TAG (timestamp: $BASELINE_TIMESTAMP)"

# Mark baseline as applied
log_info "Marking baseline migration as applied..."

# Use environment variables for psql to avoid password escaping issues
export PGPASSWORD="$CLOUD_DB_PASS"
export PGHOST="127.0.0.1"
export PGPORT="$PROXY_PORT"
export PGUSER="$CLOUD_DB_USER"
export PGDATABASE="$CLOUD_DB_NAME"

psql << EOF
-- Ensure the drizzle schema exists
CREATE SCHEMA IF NOT EXISTS drizzle;

-- Ensure the migrations table exists
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash TEXT NOT NULL,
    created_at BIGINT NOT NULL
);

-- Check if baseline is already marked as applied
DO \$\$
DECLARE
    baseline_hash TEXT := md5('$BASELINE_TAG');
    existing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO existing_count 
    FROM drizzle.__drizzle_migrations 
    WHERE hash = baseline_hash;
    
    IF existing_count > 0 THEN
        RAISE NOTICE 'Baseline migration already marked as applied';
    ELSE
        -- Clear any old migration records (from previous migration files)
        DELETE FROM drizzle.__drizzle_migrations;
        
        -- Insert baseline as applied
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (baseline_hash, $BASELINE_TIMESTAMP);
        
        RAISE NOTICE 'Baseline migration marked as applied successfully';
    END IF;
END \$\$;

-- Show current state
SELECT hash, created_at, to_timestamp(created_at/1000) as applied_at 
FROM drizzle.__drizzle_migrations;
EOF

if [ $? -eq 0 ]; then
    log_info "✓ Baseline migration marked as applied"
else
    log_error "Failed to mark baseline as applied"
    kill $PROXY_PID 2>/dev/null
    exit 1
fi

# Stop proxy
log_info "Stopping Cloud SQL proxy..."
kill $PROXY_PID 2>/dev/null

log_info "========================================="
log_info "Done! You can now run migrations normally:"
log_info "  ./scripts/deploy.sh --env $DEPLOY_ENV --db-migrate"
log_info "========================================="
