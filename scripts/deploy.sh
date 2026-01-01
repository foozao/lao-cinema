#!/bin/bash
# Lao Cinema - GCP Cloud Run Deployment Script
# Supports multiple environments and staged deployments

set -e  # Exit on error

# Load environment variables from .env files
[[ -f "$(dirname "$0")/../.env" ]] && source "$(dirname "$0")/../.env"

# Safely extract Sentry DSN from env files (avoid sourcing files with unquoted spaces)
if [[ -f "$(dirname "$0")/../web/.env.local" ]]; then
    SENTRY_WEB_DSN="${SENTRY_WEB_DSN:-$(grep -E '^NEXT_PUBLIC_SENTRY_DSN=' "$(dirname "$0")/../web/.env.local" | cut -d'=' -f2- | tr -d '"' | tr -d "'")}"
fi
if [[ -f "$(dirname "$0")/../api/.env" ]]; then
    SENTRY_API_DSN="${SENTRY_API_DSN:-$(grep -E '^SENTRY_DSN=' "$(dirname "$0")/../api/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")}"
fi

# ========================================
# CONFIGURATION
# ========================================
export PROJECT_ID="lao-cinema"
export REGION="asia-southeast1"  # Singapore - closest to Laos

# Environment-specific resources (set after --env flag is parsed)
export DB_INSTANCE_NAME=""
export CONNECTION_NAME=""
export VIDEO_BUCKET=""
export CLOUD_DB_USER="laocinema"
export CLOUD_DB_NAME="laocinema"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# FUNCTIONS
# ========================================
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# ========================================
# ENVIRONMENT CONFIGURATION
# ========================================
# Sets domains, service names, and infrastructure per environment
set_environment_domains() {
    if [ "$DEPLOY_ENV" = "production" ]; then
        CUSTOM_WEB_DOMAIN="https://laocinema.com"
        CUSTOM_API_DOMAIN="https://api.laocinema.com"
        CUSTOM_VIDEO_DOMAIN="https://stream.laocinema.com"
        DB_INSTANCE_NAME="laocinema-production"
        VIDEO_BUCKET="lao-cinema-videos-production"
        # Production uses base service names (no suffix)
        SERVICE_WEB="lao-cinema-web"
        SERVICE_API="lao-cinema-api"
        SERVICE_VIDEO="lao-cinema-video"
        # Use Cloud Run secret for DB password
        DB_SECRET_NAME="db-pass-production"
    elif [ "$DEPLOY_ENV" = "staging" ]; then
        CUSTOM_WEB_DOMAIN="https://staging.laocinema.com"
        CUSTOM_API_DOMAIN="https://api.staging.laocinema.com"
        CUSTOM_VIDEO_DOMAIN="https://stream.staging.laocinema.com"
        DB_INSTANCE_NAME="laocinema-staging"
        VIDEO_BUCKET="lao-cinema-videos-staging"
        # Staging uses -staging suffix
        SERVICE_WEB="lao-cinema-web-staging"
        SERVICE_API="lao-cinema-api-staging"
        SERVICE_VIDEO="lao-cinema-video-staging"
        # Use Cloud Run secret for DB password
        DB_SECRET_NAME="db-pass-staging"
    else
        # preview (default)
        CUSTOM_WEB_DOMAIN="https://preview.laocinema.com"
        CUSTOM_API_DOMAIN="https://api.preview.laocinema.com"
        CUSTOM_VIDEO_DOMAIN="https://stream.preview.laocinema.com"
        DB_INSTANCE_NAME="laocinema-preview"
        VIDEO_BUCKET="lao-cinema-videos"
        # Preview uses -preview suffix
        SERVICE_WEB="lao-cinema-web-preview"
        SERVICE_API="lao-cinema-api-preview"
        SERVICE_VIDEO="lao-cinema-video-preview"
        # Use Cloud Run secret for DB password
        DB_SECRET_NAME="db-pass-preview"
    fi
}

# ========================================
# DEFAULT OPTIONS
# ========================================
DEPLOY_API=false
DEPLOY_WEB=false
DEPLOY_VIDEO=false
DB_UPDATE=false         # Push schema changes to Cloud SQL (drizzle-kit push)
DB_MIGRATE=false        # Run migrations on Cloud SQL (recommended)
DB_GENERATE=false       # Generate migrations from schema.ts before running
DB_WIPE=false           # Replace Cloud SQL with local database
SYNC_CONTENT=false      # Sync content (movies, awards, etc.) to Cloud SQL
DEPLOY_ENV="preview"    # Environment: preview, staging, production
DEPLOY_MODE="full"      # Deployment mode: full, test, canary, rollback
CANARY_PERCENT=10       # Traffic percentage for canary deployments
DEPLOY_TAG="test"       # Tag for test deployments

# ========================================
# HELP TEXT
# ========================================
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy Lao Cinema to GCP Cloud Run.

SERVICE OPTIONS:
    --api             Deploy only API service
    --web             Deploy only Web service
    --video           Deploy only Video server
    --all             Deploy all services (API + Web + Video)

ENVIRONMENT OPTIONS:
    --env ENV         Target environment: preview (default), staging, production
                      - preview:    *.preview.laocinema.com
                      - staging:    *.staging.laocinema.com
                      - production: *.laocinema.com

STAGED DEPLOYMENT OPTIONS:
    --no-traffic      Deploy without shifting traffic (for testing)
    --canary PERCENT  Deploy with canary traffic split (e.g., --canary 10)
    --tag TAG         Tag for test deployments (default: test)
    --rollback        Rollback to previous revision

DATABASE OPTIONS:
    --db-generate     Generate migration from schema.ts, then run migrations (ONE-STEP WORKFLOW)
    --db-migrate      Run migrations on Cloud SQL (RECOMMENDED for all environments)
    --mark-baseline   Mark baseline migration as applied (use after squashing migrations)
    --db-update       Push schema changes to Cloud SQL (preview only, not recommended)
    --sync-content    Sync content data (movies, awards, etc.) to Cloud SQL
    --db-wipe         Replace Cloud SQL with local database (DESTRUCTIVE)

EXAMPLES:
    # Standard deployment to preview environment
    $0 --all

    # Deploy to staging environment
    $0 --all --env staging

    # Deploy without traffic (test new revision)
    $0 --all --no-traffic

    # Canary deployment (10% traffic to new revision)
    $0 --all --canary 10

    # Rollback to previous revision
    $0 --rollback

    # Deploy with database migrations
    $0 --all --db-migrate

    # Generate migration from schema changes and deploy (one-step workflow)
    $0 --all --db-generate --env staging

WORKFLOWS:
    Test-Then-Release:
        1. $0 --all --no-traffic           # Deploy for testing
        2. Test at tagged URL
        3. gcloud run services update-traffic <service> --region=asia-southeast1 --to-latest

    Canary Deployment:
        1. $0 --all --canary 10            # Start with 10%
        2. Monitor logs and metrics
        3. $0 --all --canary 50            # Increase to 50%
        4. $0 --all                        # Full release (100%)

EOF
    exit 0
}

# Show help if no arguments provided
if [ $# -eq 0 ]; then
    show_help
fi

# ========================================
# PARSE ARGUMENTS
# ========================================
while [[ $# -gt 0 ]]; do
    case $1 in
        --api)
            DEPLOY_API=true
            shift
            ;;
        --web)
            DEPLOY_WEB=true
            shift
            ;;
        --video)
            DEPLOY_VIDEO=true
            shift
            ;;
        --all)
            DEPLOY_API=true
            DEPLOY_WEB=true
            DEPLOY_VIDEO=true
            shift
            ;;
        --env)
            DEPLOY_ENV="$2"
            shift 2
            ;;
        --no-traffic)
            DEPLOY_MODE="test"
            shift
            ;;
        --canary)
            DEPLOY_MODE="canary"
            CANARY_PERCENT="$2"
            shift 2
            ;;
        --tag)
            DEPLOY_TAG="$2"
            shift 2
            ;;
        --rollback)
            DEPLOY_MODE="rollback"
            shift
            ;;
        --db-migrate)
            DB_MIGRATE=true
            shift
            ;;
        --db-generate)
            DB_GENERATE=true
            DB_MIGRATE=true  # Also run migrations after generating
            shift
            ;;
        --mark-baseline)
            MARK_BASELINE=true
            shift
            ;;
        --db-update)
            DB_UPDATE=true
            shift
            ;;
        --sync-content)
            SYNC_CONTENT=true
            shift
            ;;
        --db-wipe)
            DB_WIPE=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            echo "Unknown option: $1"
            echo "Run '$0 --help' for usage information."
            exit 1
            ;;
    esac
done

# Set domain configuration based on environment
set_environment_domains

# ========================================
# PRE-FLIGHT CHECKS
# ========================================
log_info "Starting deployment to GCP Cloud Run..."
log_info "Environment: $DEPLOY_ENV"
log_info "Mode: $DEPLOY_MODE"
if [ "$DEPLOY_MODE" = "canary" ]; then
    log_info "Canary traffic: ${CANARY_PERCENT}%"
fi
if [ "$DEPLOY_MODE" = "test" ]; then
    log_info "Deploy tag: $DEPLOY_TAG"
fi

# Check correct GCP project is active
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    log_error "Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID"
    log_error "Run: gcloud config configurations activate lao-cinema"
    exit 1
fi
log_info "✓ Correct GCP project active: $PROJECT_ID"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if docker is installed (skip for rollback)
if [ "$DEPLOY_MODE" != "rollback" ] && ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install it first."
    exit 1
fi

# Check if project ID is set
if [ "$PROJECT_ID" = "your-gcp-project-id" ]; then
    log_error "Please set PROJECT_ID in the script"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# ========================================
# VERIFY SECRETS AND ENV VARS
# ========================================
log_step "Verifying secrets and environment variables for $DEPLOY_ENV..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/verify-secrets.sh" ]; then
    if ! "$SCRIPT_DIR/verify-secrets.sh" "$DEPLOY_ENV"; then
        log_error "Secrets verification failed for $DEPLOY_ENV environment"
        log_error "Please fix the configuration issues above before deploying"
        exit 1
    fi
    log_info "✓ Secrets and environment variables verified"
else
    log_warn "verify-secrets.sh not found, skipping verification"
fi
echo ""

# ========================================
# ROLLBACK MODE
# ========================================
if [ "$DEPLOY_MODE" = "rollback" ]; then
    log_step "Rolling back to previous revision..."
    
    # Get previous API revision
    PREV_API_REVISION=$(gcloud run revisions list \
        --service=$SERVICE_API \
        --region=$REGION \
        --limit=2 \
        --format='value(metadata.name)' | tail -n 1)
    
    # Get previous Web revision
    PREV_WEB_REVISION=$(gcloud run revisions list \
        --service=$SERVICE_WEB \
        --region=$REGION \
        --limit=2 \
        --format='value(metadata.name)' | tail -n 1)
    
    # Get previous Video revision
    PREV_VIDEO_REVISION=$(gcloud run revisions list \
        --service=$SERVICE_VIDEO \
        --region=$REGION \
        --limit=2 \
        --format='value(metadata.name)' 2>/dev/null | tail -n 1 || echo "")
    
    if [ -z "$PREV_API_REVISION" ] || [ -z "$PREV_WEB_REVISION" ]; then
        log_error "Could not find previous revisions for rollback"
        exit 1
    fi
    
    log_info "Rolling back API to: $PREV_API_REVISION"
    gcloud run services update-traffic $SERVICE_API \
        --region=$REGION \
        --to-revisions=$PREV_API_REVISION=100 \
        --quiet
    
    log_info "Rolling back Web to: $PREV_WEB_REVISION"
    gcloud run services update-traffic $SERVICE_WEB \
        --region=$REGION \
        --to-revisions=$PREV_WEB_REVISION=100 \
        --quiet
    
    if [ -n "$PREV_VIDEO_REVISION" ]; then
        log_info "Rolling back Video to: $PREV_VIDEO_REVISION"
        gcloud run services update-traffic $SERVICE_VIDEO \
            --region=$REGION \
            --to-revisions=$PREV_VIDEO_REVISION=100 \
            --quiet
    fi
    
    log_info "========================================="
    log_info "Rollback completed successfully! ✅"
    log_info "========================================="
    log_info "Environment: $DEPLOY_ENV"
    log_info "Web:   ${CUSTOM_WEB_DOMAIN}"
    log_info "API:   ${CUSTOM_API_DOMAIN}"
    log_info "Video: ${CUSTOM_VIDEO_DOMAIN}"
    exit 0
fi

# Get Cloud SQL connection name if not set
if [ -z "$CONNECTION_NAME" ]; then
    log_info "Fetching Cloud SQL connection name..."
    CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME \
        --format='value(connectionName)' 2>/dev/null || echo "")
    
    if [ -z "$CONNECTION_NAME" ]; then
        log_warn "Could not fetch Cloud SQL connection name. Make sure the instance exists."
        log_warn "Or set CONNECTION_NAME manually in the script."
    else
        log_info "Found connection name: $CONNECTION_NAME"
    fi
fi

# ========================================
# BUILD DOCKER IMAGES
# ========================================
log_info "Building Docker images..."

# Determine API URL (use existing service URL or construct expected URL)
EXISTING_API_URL=$(gcloud run services describe $SERVICE_API \
    --region=$REGION \
    --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$EXISTING_API_URL" ]; then
    # Construct expected URL for new deployment
    API_URL="https://${SERVICE_API}-$PROJECT_NUMBER.$REGION.run.app"
    log_info "New deployment - using expected API URL: $API_URL"
else
    API_URL=$EXISTING_API_URL
    log_info "Using existing API URL: $API_URL"
fi

# Build API (build from root to include /db directory)
if [ "$DEPLOY_API" = true ]; then
    log_info "Building API image..."
    docker build --platform linux/amd64 -f api/Dockerfile \
        -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest \
        -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:$DEPLOY_ENV .
    if [ $? -ne 0 ]; then
        log_error "Failed to build API image"
        exit 1
    fi
fi

# Build Web (pass API URL as build arg, force clean build)
if [ "$DEPLOY_WEB" = true ]; then
    # Use custom API domain if configured, otherwise use Cloud Run URL
    WEB_API_URL="${CUSTOM_API_DOMAIN:-$API_URL}/api"
    log_info "Building Web image for $DEPLOY_ENV with API_URL=$WEB_API_URL..."
    cd web
    docker build --no-cache --platform linux/amd64 \
        --build-arg NEXT_PUBLIC_API_URL=$WEB_API_URL \
        -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:$DEPLOY_ENV .
    if [ $? -ne 0 ]; then
        log_error "Failed to build Web image"
        exit 1
    fi
    cd ..
fi

# Build Video Server
if [ "$DEPLOY_VIDEO" = true ]; then
    log_info "Building Video Server image..."
    cd video-server
    docker build --platform linux/amd64 \
        -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/video-server:latest \
        -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/video-server:$DEPLOY_ENV .
    if [ $? -ne 0 ]; then
        log_error "Failed to build Video Server image"
        exit 1
    fi
    cd ..
fi

# ========================================
# PUSH IMAGES TO ARTIFACT REGISTRY
# ========================================
log_info "Pushing images to Artifact Registry..."

if [ "$DEPLOY_API" = true ]; then
    docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest
    docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:$DEPLOY_ENV
    if [ $? -ne 0 ]; then
        log_error "Failed to push API image"
        exit 1
    fi
fi

if [ "$DEPLOY_WEB" = true ]; then
    docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:$DEPLOY_ENV
    if [ $? -ne 0 ]; then
        log_error "Failed to push Web image"
        exit 1
    fi
fi

if [ "$DEPLOY_VIDEO" = true ]; then
    docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/video-server:latest
    docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/video-server:$DEPLOY_ENV
    if [ $? -ne 0 ]; then
        log_error "Failed to push Video Server image"
        exit 1
    fi
fi

# ========================================
# DEPLOY TO CLOUD RUN
# ========================================
log_info "Deploying to Cloud Run..."

# Prepare traffic and tag flags for staged deployments
TRAFFIC_FLAGS=""
TAG_FLAGS=""

if [ "$DEPLOY_MODE" = "test" ]; then
    TRAFFIC_FLAGS="--no-traffic"
    TAG_FLAGS="--tag=$DEPLOY_TAG"
    log_info "Deploying without traffic (tag: $DEPLOY_TAG)"
elif [ "$DEPLOY_MODE" = "canary" ]; then
    # Will set traffic after deployment
    TRAFFIC_FLAGS="--no-traffic"
    log_info "Deploying for canary release (${CANARY_PERCENT}% traffic)"
else
    log_info "Deploying with full traffic (100%)"
fi

# Deploy API
if [ "$DEPLOY_API" = true ]; then
log_info "Deploying API service..."
if [ -z "$CONNECTION_NAME" ]; then
    log_warn "Deploying API without Cloud SQL connection. Set CONNECTION_NAME if you need database access."
    gcloud run deploy $SERVICE_API \
        --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:$DEPLOY_ENV \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --port=8080 \
        --clear-env-vars \
        --memory=512Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10 \
        $TRAFFIC_FLAGS $TAG_FLAGS
else
    # Deploy with Cloud SQL connection via unix socket
    # Set env vars individually to avoid delimiter issues
    
    # Use Secret Manager for VIDEO_TOKEN_SECRET in staging/production
    if [ "$DEPLOY_ENV" = "preview" ]; then
        VIDEO_TOKEN_FLAG="--update-env-vars=VIDEO_TOKEN_SECRET=${VIDEO_TOKEN_SECRET:?Error: VIDEO_TOKEN_SECRET not set}"
    else
        VIDEO_TOKEN_FLAG="--update-secrets=VIDEO_TOKEN_SECRET=video-token-secret:latest"
    fi
    
    gcloud run deploy $SERVICE_API \
        --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:$DEPLOY_ENV \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --port=8080 \
        --update-env-vars="INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
        --update-env-vars="DB_NAME=laocinema" \
        --update-env-vars="DB_USER=laocinema" \
        --update-secrets="DB_PASS=${DB_SECRET_NAME}:latest" \
        --update-env-vars="VIDEO_BASE_URL=https://storage.googleapis.com/$VIDEO_BUCKET/hls" \
        --update-env-vars="VIDEO_SERVER_URL=${CUSTOM_VIDEO_DOMAIN:-https://stream.preview.laocinema.com}" \
        $VIDEO_TOKEN_FLAG \
        --update-env-vars="MAX_RENTALS_PER_MOVIE=20" \
        --update-env-vars="SENTRY_DSN=${SENTRY_API_DSN:-}" \
        --update-env-vars="NODE_ENV=production" \
        --add-cloudsql-instances=$CONNECTION_NAME \
        --memory=512Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10 \
        $TRAFFIC_FLAGS $TAG_FLAGS
fi
log_info "API deployed successfully"
else
    log_info "Skipping API deployment (--web flag)"
fi

# Get API URL (needed for web deployment)
API_URL=$(gcloud run services describe $SERVICE_API \
    --region=$REGION \
    --format='value(status.url)')
if [ "$DEPLOY_API" = true ]; then
    log_info "API deployed at: $API_URL"
fi

# Deploy Web
if [ "$DEPLOY_WEB" = true ]; then
log_info "Deploying Web service..."
# AUTH_USERS format: "username:password:role,username2:password2:role2"
# Roles: admin (full access) or viewer (no admin pages)
# Create temporary env file with API URL and video base URL
cat > scripts/.env.web.yaml.tmp <<EOF
NEXT_PUBLIC_API_URL: "$API_URL"
NEXT_PUBLIC_VIDEO_BASE_URL: "https://storage.googleapis.com/$VIDEO_BUCKET/hls"
NEXT_PUBLIC_SENTRY_DSN: "${SENTRY_WEB_DSN:-}"
AUTH_USERS: "admin:uCQkoNT_DsUTo6:admin,test:LaoCinema5050:viewer"
NODE_ENV: "production"
EOF

gcloud run deploy $SERVICE_WEB \
    --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:$DEPLOY_ENV \
    --region=$REGION \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --env-vars-file="scripts/.env.web.yaml.tmp" \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    $TRAFFIC_FLAGS $TAG_FLAGS

# Clean up temp file
rm -f scripts/.env.web.yaml.tmp

# Get Web URL
WEB_URL=$(gcloud run services describe $SERVICE_WEB \
    --region=$REGION \
    --format='value(status.url)')
log_info "Web deployed at: $WEB_URL"
else
    log_info "Skipping Web deployment (--api flag)"
    # Still need WEB_URL for summary
    WEB_URL=$(gcloud run services describe $SERVICE_WEB \
        --region=$REGION \
        --format='value(status.url)' 2>/dev/null || echo "not deployed")
fi

# Deploy Video Server
if [ "$DEPLOY_VIDEO" = true ]; then
    log_info "Deploying Video Server service..."
    
    # Get the API URL for token validation (use internal Cloud Run URL for low latency)
    VIDEO_API_URL="$API_URL"
    
    # Use Secret Manager for VIDEO_TOKEN_SECRET in staging/production
    if [ "$DEPLOY_ENV" = "preview" ]; then
        VIDEO_TOKEN_FLAG="--update-env-vars=VIDEO_TOKEN_SECRET=${VIDEO_TOKEN_SECRET:?Error: VIDEO_TOKEN_SECRET not set}"
    else
        VIDEO_TOKEN_FLAG="--update-secrets=VIDEO_TOKEN_SECRET=video-token-secret:latest"
    fi
    
    gcloud run deploy $SERVICE_VIDEO \
        --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/video-server:$DEPLOY_ENV \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --port=8080 \
        --execution-environment=gen2 \
        --add-volume=name=video-bucket,type=cloud-storage,bucket=$VIDEO_BUCKET \
        --add-volume-mount=volume=video-bucket,mount-path=/mnt/gcs \
        --update-env-vars="VIDEOS_PATH=/mnt/gcs" \
        --update-env-vars="PUBLIC_PATH=/mnt/gcs" \
        --update-env-vars="API_URL=$VIDEO_API_URL" \
        $VIDEO_TOKEN_FLAG \
        --update-env-vars="CORS_ORIGINS=${CUSTOM_WEB_DOMAIN:-https://preview.laocinema.com}" \
        --memory=512Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10 \
        $TRAFFIC_FLAGS $TAG_FLAGS

    # Get Video Server URL
    VIDEO_URL=$(gcloud run services describe $SERVICE_VIDEO \
        --region=$REGION \
        --format='value(status.url)')
    log_info "Video Server deployed at: $VIDEO_URL"
else
    VIDEO_URL=$(gcloud run services describe $SERVICE_VIDEO \
        --region=$REGION \
        --format='value(status.url)' 2>/dev/null || echo "not deployed")
fi

# ========================================
# UPDATE API CORS
# ========================================
if [ "$DEPLOY_WEB" = true ] && [ "$DEPLOY_MODE" = "full" ]; then
    log_info "Updating API CORS configuration..."
    # Use custom domain if configured, otherwise use Cloud Run URL
    CORS_ORIGIN="${CUSTOM_WEB_DOMAIN:-$WEB_URL}"
    gcloud run services update $SERVICE_API \
        --region=$REGION \
        --update-env-vars="CORS_ORIGIN=$CORS_ORIGIN" \
        --quiet
fi

# ========================================
# CANARY TRAFFIC MANAGEMENT
# ========================================
if [ "$DEPLOY_MODE" = "canary" ]; then
    log_step "Setting up canary traffic split..."
    
    if [ "$DEPLOY_API" = true ]; then
        API_REVISION=$(gcloud run revisions list \
            --service=$SERVICE_API \
            --region=$REGION \
            --limit=1 \
            --format='value(metadata.name)')
        log_info "Setting ${CANARY_PERCENT}% traffic to new API revision: $API_REVISION"
        gcloud run services update-traffic $SERVICE_API \
            --region=$REGION \
            --to-revisions=$API_REVISION=$CANARY_PERCENT \
            --quiet
    fi
    
    if [ "$DEPLOY_WEB" = true ]; then
        WEB_REVISION=$(gcloud run revisions list \
            --service=$SERVICE_WEB \
            --region=$REGION \
            --limit=1 \
            --format='value(metadata.name)')
        log_info "Setting ${CANARY_PERCENT}% traffic to new Web revision: $WEB_REVISION"
        gcloud run services update-traffic $SERVICE_WEB \
            --region=$REGION \
            --to-revisions=$WEB_REVISION=$CANARY_PERCENT \
            --quiet
    fi
    
    if [ "$DEPLOY_VIDEO" = true ]; then
        VIDEO_REVISION=$(gcloud run revisions list \
            --service=$SERVICE_VIDEO \
            --region=$REGION \
            --limit=1 \
            --format='value(metadata.name)')
        log_info "Setting ${CANARY_PERCENT}% traffic to new Video revision: $VIDEO_REVISION"
        gcloud run services update-traffic $SERVICE_VIDEO \
            --region=$REGION \
            --to-revisions=$VIDEO_REVISION=$CANARY_PERCENT \
            --quiet
    fi
    
    log_info "Canary deployment active (${CANARY_PERCENT}% traffic)"
fi

# ========================================
# DATABASE OPERATIONS
# ========================================

# Check for conflicting flags
if [ "$DB_WIPE" = true ] && [ "$DB_UPDATE" = true ]; then
    log_error "Cannot use --db-update and --db-wipe together"
    exit 1
fi

if [ "$DB_WIPE" = true ] && [ "$DB_MIGRATE" = true ]; then
    log_error "Cannot use --db-migrate and --db-wipe together"
    exit 1
fi

if [ "$DB_UPDATE" = true ] && [ "$DB_MIGRATE" = true ]; then
    log_error "Cannot use --db-update and --db-migrate together"
    exit 1
fi

if [ "$DB_WIPE" = true ] && [ "$SYNC_CONTENT" = true ]; then
    log_error "Cannot use --sync-content and --db-wipe together (--db-wipe already syncs everything)"
    exit 1
fi

# Update database schema
if [ "$DB_UPDATE" = true ]; then
    # BLOCK db:update on production entirely
    if [ "$DEPLOY_ENV" = "production" ]; then
        log_error "========================================="
        log_error "🚫 BLOCKED: db:update is disabled for production"
        log_error "========================================="
        log_error "db:update (drizzle-kit push) is NEVER allowed in production."
        log_error ""
        log_error "Use --db-migrate instead:"
        log_error "  $0 --db-migrate --env production"
        log_error ""
        log_error "If you need to push schema changes without migrations,"
        log_error "you must do it manually via Cloud SQL proxy."
        exit 1
    fi
    
    # Warn against using db:update in staging
    if [ "$DEPLOY_ENV" = "staging" ]; then
        log_warn "========================================="
        log_warn "⚠️  WARNING: Using db:update in $DEPLOY_ENV"
        log_warn "========================================="
        log_warn "db:update (drizzle-kit push) is NOT recommended for $DEPLOY_ENV"
        log_warn "Use --db-migrate instead for safer migrations"
        log_warn ""
        log_warn "db:update can:"
        log_warn "  - Drop columns without warning (data loss)"
        log_warn "  - Skip migration history tracking"
        log_warn "  - Cause schema drift between environments"
        echo ""
        read -p "Type 'yes' to continue with db:update anyway: " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "db:update cancelled. Use --db-migrate instead."
            exit 0
        fi
    fi
    
    log_info "========================================="
    log_info "Updating Cloud SQL schema..."
    log_info "========================================="
    
    # Check if cloud-sql-proxy is available
    if ! command -v cloud-sql-proxy &> /dev/null; then
        log_error "cloud-sql-proxy not found. Install it first:"
        log_error "  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64"
        log_error "  chmod +x cloud-sql-proxy"
        exit 1
    fi
    
    # Kill any existing process on port 5433
    if lsof -ti :5433 > /dev/null 2>&1; then
        log_warn "Port 5433 in use, killing existing process..."
        lsof -ti :5433 | xargs kill -9 2>/dev/null
        sleep 1
    fi
    
    # Start Cloud SQL proxy
    log_info "Starting Cloud SQL proxy..."
    ./cloud-sql-proxy $CONNECTION_NAME --port=5433 &
    PROXY_PID=$!
    sleep 3
    
    if ! kill -0 $PROXY_PID 2>/dev/null; then
        log_error "Cloud SQL proxy failed to start"
        exit 1
    fi
    log_info "✓ Cloud SQL proxy started (PID: $PROXY_PID)"
    
    # Push schema changes (--force for non-interactive mode)
    log_info "Pushing schema changes to Cloud SQL..."
    cd db
    DATABASE_URL="postgresql://${CLOUD_DB_USER:-laocinema}:${CLOUD_DB_PASS}@127.0.0.1:5433/${CLOUD_DB_NAME:-laocinema}" npx drizzle-kit push --force
    cd ..
    
    # Stop proxy
    log_info "Stopping Cloud SQL proxy..."
    kill $PROXY_PID 2>/dev/null
    
    log_info "✓ Schema updated successfully"
fi

# Mark baseline migration as applied (for use after squashing migrations)
if [ "$MARK_BASELINE" = true ]; then
    log_info "========================================="
    log_info "Marking baseline migration as applied..."
    log_info "========================================="
    ./scripts/mark-baseline-applied.sh --env "$DEPLOY_ENV"
    if [ $? -ne 0 ]; then
        log_error "Failed to mark baseline as applied"
        exit 1
    fi
fi

# Generate migrations from schema.ts (if --db-generate flag is set)
if [ "$DB_GENERATE" = true ]; then
    log_info "========================================="
    log_info "Generating migration from schema.ts..."
    log_info "========================================="
    
    cd db
    
    # Check if there are schema changes to migrate
    log_info "Checking for schema changes..."
    GENERATE_OUTPUT=$(npm run db:generate 2>&1)
    GENERATE_EXIT=$?
    
    if [ $GENERATE_EXIT -ne 0 ]; then
        log_error "Migration generation failed:"
        echo "$GENERATE_OUTPUT"
        exit 1
    fi
    
    # Check if a new migration was created
    if echo "$GENERATE_OUTPUT" | grep -q "No schema changes"; then
        log_info "No schema changes detected - skipping migration generation"
    else
        log_info "✓ Migration generated successfully"
        echo "$GENERATE_OUTPUT" | grep -E "(migration|sql)" || true
        
        # Show the generated migration file
        LATEST_MIGRATION=$(ls -t migrations/*.sql 2>/dev/null | head -1)
        if [ -n "$LATEST_MIGRATION" ]; then
            log_info "Generated: $LATEST_MIGRATION"
            log_warn "⚠️  Remember to commit this migration file!"
        fi
    fi
    
    cd ..
fi

# Run database migrations
if [ "$DB_MIGRATE" = true ]; then
    log_info "========================================="
    log_info "Running migrations on Cloud SQL..."
    log_info "========================================="
    
    # Check if cloud-sql-proxy is available
    if ! command -v cloud-sql-proxy &> /dev/null; then
        log_error "cloud-sql-proxy not found. Install it first:"
        log_error "  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64"
        log_error "  chmod +x cloud-sql-proxy"
        exit 1
    fi
    
    # Kill any existing process on port 5433
    if lsof -ti :5433 > /dev/null 2>&1; then
        log_warn "Port 5433 in use, killing existing process..."
        lsof -ti :5433 | xargs kill -9 2>/dev/null
        sleep 1
    fi
    
    # Start Cloud SQL proxy
    log_info "Starting Cloud SQL proxy..."
    ./cloud-sql-proxy $CONNECTION_NAME --port=5433 &
    PROXY_PID=$!
    sleep 3
    
    if ! kill -0 $PROXY_PID 2>/dev/null; then
        log_error "Cloud SQL proxy failed to start"
        exit 1
    fi
    log_info "✓ Cloud SQL proxy started (PID: $PROXY_PID)"
    
    # Run migrations
    log_info "Running migrations..."
    cd db
    DATABASE_URL="postgresql://${CLOUD_DB_USER:-laocinema}:${CLOUD_DB_PASS}@127.0.0.1:5433/${CLOUD_DB_NAME:-laocinema}" npm run db:migrate
    cd ..
    
    # Stop proxy
    log_info "Stopping Cloud SQL proxy..."
    kill $PROXY_PID 2>/dev/null
    
    log_info "✓ Migrations completed successfully"
fi

# Sync content to Cloud SQL
if [ "$SYNC_CONTENT" = true ]; then
    log_info "========================================="
    log_info "Syncing content to Cloud SQL..."
    log_info "========================================="
    
    # Run content sync script
    ./scripts/db/sync-content-to-cloud.sh --env "$DEPLOY_ENV"
    
    if [ $? -ne 0 ]; then
        log_error "Content sync failed"
        exit 1
    fi
    
    log_info "✓ Content synced successfully"
fi

# Wipe and restore database
if [ "$DB_WIPE" = true ]; then
    log_warn "========================================="
    log_warn "⚠️  DATABASE WIPE - DESTRUCTIVE OPERATION"
    log_warn "========================================="
    log_warn "Environment: $DEPLOY_ENV"
    log_warn "Target Instance: $DB_INSTANCE_NAME"
    log_warn "Target Database: laocinema"
    log_warn ""
    log_warn "This will REPLACE Cloud SQL database with your local database"
    log_warn "All data in Cloud SQL will be LOST"
    echo ""
    read -p "Type 'yes' to continue: " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Database wipe cancelled"
    else
        log_info "Running database sync script..."
        ./scripts/sync-db-to-cloud.sh "$DB_INSTANCE_NAME"
        log_info "✓ Database wiped and restored from local"
    fi
fi

# ========================================
# DEPLOYMENT COMPLETE
# ========================================
echo ""
log_info "========================================="
log_info "Deployment completed successfully! 🚀"
log_info "========================================="
echo ""

if [ "$DEPLOY_MODE" = "test" ]; then
    log_info "Test Deployment (no production traffic)"
    log_info "Environment: $DEPLOY_ENV"
    echo ""
    log_info "Production URLs (unchanged):"
    log_info "  Web:   ${CUSTOM_WEB_DOMAIN}"
    log_info "  API:   ${CUSTOM_API_DOMAIN}"
    log_info "  Video: ${CUSTOM_VIDEO_DOMAIN}"
    echo ""
    log_info "Test URLs (tag: $DEPLOY_TAG):"
    log_info "  Web:   https://$DEPLOY_TAG---${SERVICE_WEB}-$(echo $WEB_URL | sed "s/https:\/\/${SERVICE_WEB}-//")"
    log_info "  API:   https://$DEPLOY_TAG---${SERVICE_API}-$(echo $API_URL | sed "s/https:\/\/${SERVICE_API}-//")"
    echo ""
    log_info "Next steps:"
    log_info "1. Test the new revision at the test URLs"
    log_info "2. Release to production:"
    log_info "   gcloud run services update-traffic $SERVICE_API --region=$REGION --to-latest"
    log_info "   gcloud run services update-traffic $SERVICE_WEB --region=$REGION --to-latest"
    log_info "   gcloud run services update-traffic $SERVICE_VIDEO --region=$REGION --to-latest"

elif [ "$DEPLOY_MODE" = "canary" ]; then
    log_info "Canary Deployment (${CANARY_PERCENT}% traffic)"
    log_info "Environment: $DEPLOY_ENV"
    echo ""
    log_info "URLs:"
    log_info "  Web:   ${CUSTOM_WEB_DOMAIN}"
    log_info "  API:   ${CUSTOM_API_DOMAIN}"
    log_info "  Video: ${CUSTOM_VIDEO_DOMAIN}"
    echo ""
    log_info "Traffic split: ${CANARY_PERCENT}% new revision, $((100-CANARY_PERCENT))% previous revision"
    echo ""
    log_info "Next steps:"
    log_info "1. Monitor logs: gcloud run services logs read $SERVICE_API --region=$REGION"
    log_info "2. Increase traffic: $0 --all --canary 50"
    log_info "3. Full release: $0 --all"
    log_info "4. Or rollback: $0 --rollback"

else
    log_info "Full Deployment (100% traffic)"
    log_info "Environment: $DEPLOY_ENV"
    echo ""
    log_info "URLs:"
    log_info "  Web:   ${CUSTOM_WEB_DOMAIN:-$WEB_URL}"
    log_info "  API:   ${CUSTOM_API_DOMAIN:-$API_URL}"
    log_info "  Video: ${CUSTOM_VIDEO_DOMAIN:-$VIDEO_URL}"
    echo ""
    log_info "Cloud Run URLs (internal):"
    log_info "  Web:   $WEB_URL"
    log_info "  API:   $API_URL"
    log_info "  Video: $VIDEO_URL"
    echo ""
    log_info "Next steps:"
    if [ "$DB_UPDATE" = false ] && [ "$DB_WIPE" = false ] && [ "$DB_MIGRATE" = false ]; then
        log_info "1. If schema changed: $0 --db-migrate --env $DEPLOY_ENV"
    fi
    log_info "2. Test the application: ${CUSTOM_WEB_DOMAIN:-$WEB_URL}"
    log_info "3. Check logs: gcloud run services logs read $SERVICE_API --region=$REGION"
    log_info "4. If issues, rollback: $0 --rollback"
fi

echo ""
log_info "View revisions:"
log_info "  gcloud run revisions list --service=$SERVICE_API --region=$REGION"
log_info "  gcloud run revisions list --service=$SERVICE_WEB --region=$REGION"
echo ""
