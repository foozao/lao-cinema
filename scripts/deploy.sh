#!/bin/bash
# Lao Cinema - GCP Cloud Run Deployment Script
# Make sure to configure the variables below before running

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
# CONFIGURATION - UPDATE THESE VALUES
# ========================================
export PROJECT_ID="lao-cinema"
export REGION="asia-southeast1"  # Singapore - closest to Laos
export DB_INSTANCE_NAME="lao-cinema-db"
export CONNECTION_NAME=""  # Will be fetched automatically if empty

# Custom domain configuration (leave empty to use Cloud Run URLs)
export CUSTOM_WEB_DOMAIN="https://preview.laocinema.com"
export CUSTOM_API_DOMAIN="https://api-preview.laocinema.com"
export CUSTOM_VIDEO_DOMAIN="https://stream-preview.laocinema.com"

# GCS bucket for video files
export VIDEO_BUCKET="lao-cinema-videos"

# Parse command line arguments
DEPLOY_API=false
DEPLOY_WEB=false
DEPLOY_VIDEO=false
DB_UPDATE=false     # Push schema changes to Cloud SQL
DB_WIPE=false       # Replace Cloud SQL with local database
SYNC_CONTENT=false  # Sync content (movies, awards, etc.) to Cloud SQL

# Show help if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Deployment options:"
    echo "  --api           Deploy only API service"
    echo "  --web           Deploy only Web service"
    echo "  --video         Deploy only Video server"
    echo "  --all           Deploy all services (API + Web + Video)"
    echo ""
    echo "Database options:"
    echo "  --db-update       Push schema changes to Cloud SQL (drizzle-kit push)"
    echo "  --sync-content    Sync content data (movies, awards, etc.) to Cloud SQL"
    echo "  --db-wipe         Replace Cloud SQL with local database (DESTRUCTIVE)"
    echo ""
    echo "Examples:"
    echo "  $0 --all                      # Deploy all services"
    echo "  $0 --api --web                # Deploy API + Web only"
    echo "  $0 --all --db-update          # Deploy all + update schema"
    echo "  $0 --all --sync-content       # Deploy all + sync content data"
    echo "  $0 --all --db-update --sync-content  # Full deploy with schema + content"
    echo "  $0 --api --db-update          # Deploy API only + update schema"
    echo "  $0 --all --db-wipe            # Deploy all + replace Cloud DB with local"
    exit 0
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        --api)
            DEPLOY_WEB=false
            DEPLOY_VIDEO=false
            shift
            ;;
        --web)
            DEPLOY_API=false
            DEPLOY_VIDEO=false
            shift
            ;;
        --video)
            DEPLOY_API=false
            DEPLOY_WEB=false
            DEPLOY_VIDEO=true
            shift
            ;;
        --all)
            DEPLOY_API=true
            DEPLOY_WEB=true
            DEPLOY_VIDEO=true
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
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Deployment options:"
            echo "  --api           Deploy only API service"
            echo "  --web           Deploy only Web service"
            echo "  --video         Deploy only Video server"
            echo "  --all           Deploy all services (default: API + Web)"
            echo ""
            echo "Database options:"
            echo "  --db-update       Push schema changes to Cloud SQL (drizzle-kit push)"
            echo "  --sync-content    Sync content data (movies, awards, etc.) to Cloud SQL"
            echo "  --db-wipe         Replace Cloud SQL with local database (DESTRUCTIVE)"
            echo ""
            echo "Examples:"
            echo "  $0                      # Deploy API + Web"
            echo "  $0 --db-update          # Deploy + update schema"
            echo "  $0 --db-wipe            # Deploy + replace Cloud DB with local"
            echo "  $0 --api --db-update    # Deploy API only + update schema"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--api|--web|--video|--all] [--db-update|--db-wipe] [--help]"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# ========================================
# PRE-FLIGHT CHECKS
# ========================================
log_info "Starting deployment to GCP Cloud Run..."

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

# Check if docker is installed
if ! command -v docker &> /dev/null; then
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
EXISTING_API_URL=$(gcloud run services describe lao-cinema-api \
    --region=$REGION \
    --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$EXISTING_API_URL" ]; then
    # Construct expected URL for new deployment
    API_URL="https://lao-cinema-api-$PROJECT_NUMBER.$REGION.run.app"
    log_info "New deployment - using expected API URL: $API_URL"
else
    API_URL=$EXISTING_API_URL
    log_info "Using existing API URL: $API_URL"
fi

# Build API (build from root to include /db directory)
if [ "$DEPLOY_API" = true ]; then
    log_info "Building API image..."
    docker build --platform linux/amd64 -f api/Dockerfile -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest .
    if [ $? -ne 0 ]; then
        log_error "Failed to build API image"
        exit 1
    fi
fi

# Build Web (pass API URL as build arg, force clean build)
if [ "$DEPLOY_WEB" = true ]; then
    # Use custom API domain if configured, otherwise use Cloud Run URL
    WEB_API_URL="${CUSTOM_API_DOMAIN:-$API_URL}/api"
    log_info "Building Web image with API_URL=$WEB_API_URL..."
    cd web
    docker build --no-cache --platform linux/amd64 \
        --build-arg NEXT_PUBLIC_API_URL=$WEB_API_URL \
        -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest .
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
        -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/video-server:latest .
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
    if [ $? -ne 0 ]; then
        log_error "Failed to push API image"
        exit 1
    fi
fi

if [ "$DEPLOY_WEB" = true ]; then
    docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest
    if [ $? -ne 0 ]; then
        log_error "Failed to push Web image"
        exit 1
    fi
fi

if [ "$DEPLOY_VIDEO" = true ]; then
    docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/video-server:latest
    if [ $? -ne 0 ]; then
        log_error "Failed to push Video Server image"
        exit 1
    fi
fi

# ========================================
# DEPLOY TO CLOUD RUN
# ========================================
log_info "Deploying to Cloud Run..."

# Deploy API
if [ "$DEPLOY_API" = true ]; then
log_info "Deploying API service..."
if [ -z "$CONNECTION_NAME" ]; then
    log_warn "Deploying API without Cloud SQL connection. Set CONNECTION_NAME if you need database access."
    gcloud run deploy lao-cinema-api \
        --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --port=8080 \
        --clear-env-vars \
        --memory=512Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10
else
    # Deploy with Cloud SQL connection via unix socket
    # Set env vars individually to avoid delimiter issues
    gcloud run deploy lao-cinema-api \
        --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --port=8080 \
        --update-env-vars="INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
        --update-env-vars="DB_NAME=laocinema" \
        --update-env-vars="DB_USER=laocinema" \
        --update-env-vars="DB_PASS=${CLOUD_DB_PASS:?Error: CLOUD_DB_PASS not set}" \
        --update-env-vars="VIDEO_BASE_URL=https://storage.googleapis.com/lao-cinema-videos/hls" \
        --update-env-vars="VIDEO_SERVER_URL=${CUSTOM_VIDEO_DOMAIN:-https://stream-preview.laocinema.com}" \
        --update-env-vars="VIDEO_TOKEN_SECRET=${VIDEO_TOKEN_SECRET:?Error: VIDEO_TOKEN_SECRET not set}" \
        --update-env-vars="MAX_RENTALS_PER_MOVIE=20" \
        --update-env-vars="SENTRY_DSN=${SENTRY_API_DSN:-}" \
        --update-env-vars="NODE_ENV=production" \
        --add-cloudsql-instances=$CONNECTION_NAME \
        --memory=512Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10
fi
log_info "API deployed successfully"
else
    log_info "Skipping API deployment (--web flag)"
fi

# Get API URL (needed for web deployment)
API_URL=$(gcloud run services describe lao-cinema-api \
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
NEXT_PUBLIC_VIDEO_BASE_URL: "https://storage.googleapis.com/lao-cinema-videos/hls"
NEXT_PUBLIC_SENTRY_DSN: "${SENTRY_WEB_DSN:-}"
AUTH_USERS: "admin:uCQkoNT_DsUTo6:admin,test:LaoCinema5050:viewer"
NODE_ENV: "production"
EOF

gcloud run deploy lao-cinema-web \
    --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest \
    --region=$REGION \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --env-vars-file="scripts/.env.web.yaml.tmp" \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10

# Clean up temp file
rm -f scripts/.env.web.yaml.tmp

# Get Web URL
WEB_URL=$(gcloud run services describe lao-cinema-web \
    --region=$REGION \
    --format='value(status.url)')
log_info "Web deployed at: $WEB_URL"
else
    log_info "Skipping Web deployment (--api flag)"
    # Still need WEB_URL for summary
    WEB_URL=$(gcloud run services describe lao-cinema-web \
        --region=$REGION \
        --format='value(status.url)' 2>/dev/null || echo "not deployed")
fi

# Deploy Video Server
if [ "$DEPLOY_VIDEO" = true ]; then
    log_info "Deploying Video Server service..."
    
    # Get the API URL for token validation (use internal Cloud Run URL for low latency)
    VIDEO_API_URL="$API_URL"
    
    gcloud run deploy lao-cinema-video \
        --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/video-server:latest \
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
        --update-env-vars="VIDEO_TOKEN_SECRET=${VIDEO_TOKEN_SECRET:?Error: VIDEO_TOKEN_SECRET not set}" \
        --update-env-vars="CORS_ORIGINS=${CUSTOM_WEB_DOMAIN:-https://preview.laocinema.com}" \
        --memory=512Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10

    # Get Video Server URL
    VIDEO_URL=$(gcloud run services describe lao-cinema-video \
        --region=$REGION \
        --format='value(status.url)')
    log_info "Video Server deployed at: $VIDEO_URL"
else
    VIDEO_URL=$(gcloud run services describe lao-cinema-video \
        --region=$REGION \
        --format='value(status.url)' 2>/dev/null || echo "not deployed")
fi

# ========================================
# UPDATE API CORS
# ========================================
if [ "$DEPLOY_WEB" = true ]; then
    log_info "Updating API CORS configuration..."
    # Use custom domain if configured, otherwise use Cloud Run URL
    CORS_ORIGIN="${CUSTOM_WEB_DOMAIN:-$WEB_URL}"
    gcloud run services update lao-cinema-api \
        --region=$REGION \
        --update-env-vars="CORS_ORIGIN=$CORS_ORIGIN" \
        --quiet
fi

# ========================================
# DATABASE OPERATIONS
# ========================================

# Check for conflicting flags
if [ "$DB_WIPE" = true ] && [ "$DB_UPDATE" = true ]; then
    log_error "Cannot use --db-update and --db-wipe together"
    exit 1
fi

if [ "$DB_WIPE" = true ] && [ "$SYNC_CONTENT" = true ]; then
    log_error "Cannot use --sync-content and --db-wipe together (--db-wipe already syncs everything)"
    exit 1
fi

# Update database schema
if [ "$DB_UPDATE" = true ]; then
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

# Sync content to Cloud SQL
if [ "$SYNC_CONTENT" = true ]; then
    log_info "========================================="
    log_info "Syncing content to Cloud SQL..."
    log_info "========================================="
    
    # Run content sync script
    ./scripts/sync-content-to-cloud.sh
    
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
    log_warn "This will REPLACE Cloud SQL database with your local database"
    log_warn "All data in Cloud SQL will be LOST"
    echo ""
    read -p "Type 'yes' to continue: " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Database wipe cancelled"
    else
        log_info "Running database sync script..."
        ./scripts/sync-db-to-cloud.sh
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
log_info "Preview Site:   ${CUSTOM_WEB_DOMAIN:-$WEB_URL}"
log_info "Preview API:    ${CUSTOM_API_DOMAIN:-$API_URL}"
log_info "Video Server:   ${CUSTOM_VIDEO_DOMAIN:-$VIDEO_URL}"
echo ""
log_info "Cloud Run URLs (internal):"
log_info "  Web: $WEB_URL"
log_info "  API: $API_URL"
echo ""
log_info "Next steps:"
if [ "$DB_UPDATE" = false ] && [ "$DB_WIPE" = false ]; then
    log_info "1. If schema changed: ./scripts/deploy.sh --db-update"
fi
log_info "2. Test the application: ${CUSTOM_WEB_DOMAIN:-$WEB_URL}"
log_info "3. Check logs: gcloud run services logs read lao-cinema-api --region=$REGION"
echo ""
