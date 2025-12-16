#!/bin/bash
# Lao Cinema - GCP Cloud Run Deployment Script
# Make sure to configure the variables below before running

set -e  # Exit on error

# Load environment variables from .env if it exists
[[ -f "$(dirname "$0")/../.env" ]] && source "$(dirname "$0")/../.env"

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
log_info "Building API image..."
docker build --platform linux/amd64 -f api/Dockerfile -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest .
if [ $? -ne 0 ]; then
    log_error "Failed to build API image"
    exit 1
fi

# Build Web (pass API URL as build arg, force clean build)
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

# ========================================
# PUSH IMAGES TO ARTIFACT REGISTRY
# ========================================
log_info "Pushing images to Artifact Registry..."

docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest
if [ $? -ne 0 ]; then
    log_error "Failed to push API image"
    exit 1
fi

docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest
if [ $? -ne 0 ]; then
    log_error "Failed to push Web image"
    exit 1
fi

# ========================================
# DEPLOY TO CLOUD RUN
# ========================================
log_info "Deploying to Cloud Run..."

# Deploy API
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
        --update-env-vars="MAX_RENTALS_PER_MOVIE=20" \
        --add-cloudsql-instances=$CONNECTION_NAME \
        --memory=512Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10
fi

# Get API URL
API_URL=$(gcloud run services describe lao-cinema-api \
    --region=$REGION \
    --format='value(status.url)')
log_info "API deployed at: $API_URL"

# Deploy Web
log_info "Deploying Web service..."
# AUTH_USERS format: "username:password:role,username2:password2:role2"
# Roles: admin (full access) or viewer (no admin pages)
# Create temporary env file with API URL and video base URL
cat > scripts/.env.web.yaml.tmp <<EOF
NEXT_PUBLIC_API_URL: "$API_URL"
NEXT_PUBLIC_VIDEO_BASE_URL: "https://storage.googleapis.com/lao-cinema-videos/hls"
AUTH_USERS: "admin:uCQkoNT_DsUTo6:admin,test:LaoCinema5050:viewer"
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

# ========================================
# UPDATE API CORS
# ========================================
log_info "Updating API CORS configuration..."
# Use custom domain if configured, otherwise use Cloud Run URL
CORS_ORIGIN="${CUSTOM_WEB_DOMAIN:-$WEB_URL}"
gcloud run services update lao-cinema-api \
    --region=$REGION \
    --update-env-vars="CORS_ORIGIN=$CORS_ORIGIN" \
    --quiet

# ========================================
# DEPLOYMENT COMPLETE
# ========================================
echo ""
log_info "========================================="
log_info "Deployment completed successfully! 🚀"
log_info "========================================="
echo ""
log_info "Preview Site:  ${CUSTOM_WEB_DOMAIN:-$WEB_URL}"
log_info "Preview API:   ${CUSTOM_API_DOMAIN:-$API_URL}"
echo ""
log_info "Cloud Run URLs (internal):"
log_info "  Web: $WEB_URL"
log_info "  API: $API_URL"
echo ""
log_info "Next steps:"
log_info "1. If schema changed: cd db && npm run db:push (see DEPLOYMENT.md)"
log_info "2. Test the application: ${CUSTOM_WEB_DOMAIN:-$WEB_URL}"
log_info "3. Check logs: gcloud run services logs read lao-cinema-api --region=$REGION"
echo ""
