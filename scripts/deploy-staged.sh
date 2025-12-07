#!/bin/bash
# Lao Cinema - GCP Cloud Run Deployment Script with Versioning Support
# Supports: test deployments, canary releases, traffic splitting, rollbacks

set -e  # Exit on error

# ========================================
# CONFIGURATION - UPDATE THESE VALUES
# ========================================
export PROJECT_ID="lao-cinema"
export REGION="asia-southeast1"  # Singapore - closest to Laos
export DB_INSTANCE_NAME="lao-cinema-db"
export CONNECTION_NAME=""  # Will be fetched automatically if empty

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
DEPLOY_MODE="full"  # full, test, canary, rollback
CANARY_PERCENT=10
DEPLOY_TAG="test"

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

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy Lao Cinema to GCP Cloud Run with versioning support.

OPTIONS:
    --no-traffic          Deploy without traffic (for testing)
    --canary PERCENT      Deploy with canary traffic split (e.g., --canary 10)
    --tag TAG             Deployment tag (default: test)
    --rollback           Rollback to previous revision
    --help               Show this help message

EXAMPLES:
    # Standard deployment (100% traffic immediately)
    $0

    # Deploy without traffic (test deployment)
    $0 --no-traffic

    # Deploy with 10% canary traffic
    $0 --canary 10

    # Rollback to previous revision
    $0 --rollback

WORKFLOWS:
    Test-Then-Release:
        1. $0 --no-traffic              # Deploy for testing
        2. Test at https://test---lao-cinema-api-xxx.run.app
        3. gcloud run services update-traffic ... --to-latest

    Canary Deployment:
        1. $0 --canary 10               # Start with 10%
        2. Monitor logs and metrics
        3. $0 --canary 50               # Increase to 50%
        4. $0                           # Full release (100%)

    Blue-Green Deployment:
        1. $0 --no-traffic --tag green  # Deploy green
        2. Test green environment
        3. gcloud run services update-traffic ... --to-tags=green=100

EOF
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
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
        --help)
            show_usage
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            ;;
    esac
done

# ========================================
# PRE-FLIGHT CHECKS
# ========================================
log_info "Starting deployment to GCP Cloud Run..."
log_info "Deploy mode: $DEPLOY_MODE"

if [ "$DEPLOY_MODE" = "canary" ]; then
    log_info "Canary traffic: ${CANARY_PERCENT}%"
fi

if [ "$DEPLOY_MODE" = "test" ]; then
    log_info "Deploy tag: $DEPLOY_TAG"
fi

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
# ROLLBACK MODE
# ========================================
if [ "$DEPLOY_MODE" = "rollback" ]; then
    log_step "Rolling back to previous revision..."
    
    # Get previous API revision
    PREV_API_REVISION=$(gcloud run revisions list \
        --service=lao-cinema-api \
        --region=$REGION \
        --limit=2 \
        --format='value(metadata.name)' | tail -n 1)
    
    # Get previous Web revision
    PREV_WEB_REVISION=$(gcloud run revisions list \
        --service=lao-cinema-web \
        --region=$REGION \
        --limit=2 \
        --format='value(metadata.name)' | tail -n 1)
    
    if [ -z "$PREV_API_REVISION" ] || [ -z "$PREV_WEB_REVISION" ]; then
        log_error "Could not find previous revisions for rollback"
        exit 1
    fi
    
    log_info "Rolling back API to: $PREV_API_REVISION"
    gcloud run services update-traffic lao-cinema-api \
        --region=$REGION \
        --to-revisions=$PREV_API_REVISION=100 \
        --quiet
    
    log_info "Rolling back Web to: $PREV_WEB_REVISION"
    gcloud run services update-traffic lao-cinema-web \
        --region=$REGION \
        --to-revisions=$PREV_WEB_REVISION=100 \
        --quiet
    
    log_info "Rollback completed successfully! ✅"
    exit 0
fi

# ========================================
# GET CLOUD SQL CONNECTION
# ========================================
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
log_step "Building Docker images..."

# Determine API URL (use existing service URL or construct expected URL)
EXISTING_API_URL=$(gcloud run services describe lao-cinema-api \
    --region=$REGION \
    --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$EXISTING_API_URL" ]; then
    # Construct expected URL for new deployment
    API_URL="https://lao-cinema-api-xxx.$REGION.run.app"
    log_warn "New deployment - using placeholder API URL: $API_URL"
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

# Build Web (pass API URL as build arg)
log_info "Building Web image with API_URL=$API_URL/api..."
cd web
docker build --no-cache --platform linux/amd64 \
    --build-arg NEXT_PUBLIC_API_URL=$API_URL/api \
    -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest .
if [ $? -ne 0 ]; then
    log_error "Failed to build Web image"
    exit 1
fi
cd ..

# ========================================
# PUSH IMAGES TO ARTIFACT REGISTRY
# ========================================
log_step "Pushing images to Artifact Registry..."

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
log_step "Deploying to Cloud Run..."

# Prepare traffic and tag flags
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
log_info "Deploying API service..."
if [ -z "$CONNECTION_NAME" ]; then
    log_warn "Deploying API without Cloud SQL connection."
    gcloud run deploy lao-cinema-api \
        --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --port=8080 \
        --memory=512Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10 \
        $TRAFFIC_FLAGS \
        $TAG_FLAGS
else
    gcloud run deploy lao-cinema-api \
        --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --port=8080 \
        --update-env-vars="INSTANCE_CONNECTION_NAME=$CONNECTION_NAME" \
        --update-env-vars="DB_NAME=laocinema" \
        --update-env-vars="DB_USER=laocinema" \
        --update-env-vars="DB_PASS=LaoC1nema_Dev_2024!" \
        --update-env-vars="VIDEO_BASE_URL=https://storage.googleapis.com/lao-cinema-videos/hls" \
        --add-cloudsql-instances=$CONNECTION_NAME \
        --memory=512Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10 \
        $TRAFFIC_FLAGS \
        $TAG_FLAGS
fi

# Get API URL
API_URL=$(gcloud run services describe lao-cinema-api \
    --region=$REGION \
    --format='value(status.url)')
log_info "API deployed at: $API_URL"

# Get test URL if using tag
if [ "$DEPLOY_MODE" = "test" ]; then
    API_TEST_URL="https://$DEPLOY_TAG---lao-cinema-api-$(echo $API_URL | sed 's/https:\/\/lao-cinema-api-//')"
    log_info "API test URL: $API_TEST_URL"
fi

# Deploy Web
log_info "Deploying Web service..."
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
    --max-instances=10 \
    $TRAFFIC_FLAGS \
    $TAG_FLAGS

rm -f scripts/.env.web.yaml.tmp

# Get Web URL
WEB_URL=$(gcloud run services describe lao-cinema-web \
    --region=$REGION \
    --format='value(status.url)')

# Get test URL if using tag
if [ "$DEPLOY_MODE" = "test" ]; then
    WEB_TEST_URL="https://$DEPLOY_TAG---lao-cinema-web-$(echo $WEB_URL | sed 's/https:\/\/lao-cinema-web-//')"
    log_info "Web test URL: $WEB_TEST_URL"
fi

# ========================================
# CANARY TRAFFIC MANAGEMENT
# ========================================
if [ "$DEPLOY_MODE" = "canary" ]; then
    log_step "Setting up canary traffic split..."
    
    # Get latest revision
    API_REVISION=$(gcloud run revisions list \
        --service=lao-cinema-api \
        --region=$REGION \
        --limit=1 \
        --format='value(metadata.name)')
    
    WEB_REVISION=$(gcloud run revisions list \
        --service=lao-cinema-web \
        --region=$REGION \
        --limit=1 \
        --format='value(metadata.name)')
    
    log_info "Setting ${CANARY_PERCENT}% traffic to new API revision: $API_REVISION"
    gcloud run services update-traffic lao-cinema-api \
        --region=$REGION \
        --to-revisions=$API_REVISION=$CANARY_PERCENT \
        --quiet
    
    log_info "Setting ${CANARY_PERCENT}% traffic to new Web revision: $WEB_REVISION"
    gcloud run services update-traffic lao-cinema-web \
        --region=$REGION \
        --to-revisions=$WEB_REVISION=$CANARY_PERCENT \
        --quiet
    
    log_info "Canary deployment active (${CANARY_PERCENT}% traffic)"
fi

# ========================================
# UPDATE API CORS
# ========================================
if [ "$DEPLOY_MODE" = "full" ]; then
    log_step "Updating API CORS configuration..."
    gcloud run services update lao-cinema-api \
        --region=$REGION \
        --update-env-vars="CORS_ORIGIN=$WEB_URL" \
        --quiet
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
    echo ""
    log_info "Production URLs (unchanged):"
    log_info "  Web: $WEB_URL"
    log_info "  API: $API_URL"
    echo ""
    log_info "Test URLs (new revision):"
    log_info "  Web: $WEB_TEST_URL"
    log_info "  API: $API_TEST_URL"
    echo ""
    log_info "Next steps:"
    log_info "1. Test the new revision at the test URLs"
    log_info "2. Release to production:"
    log_info "   gcloud run services update-traffic lao-cinema-api --region=$REGION --to-latest"
    log_info "   gcloud run services update-traffic lao-cinema-web --region=$REGION --to-latest"
    
elif [ "$DEPLOY_MODE" = "canary" ]; then
    log_info "Canary Deployment (${CANARY_PERCENT}% traffic)"
    echo ""
    log_info "URLs:"
    log_info "  Web: $WEB_URL"
    log_info "  API: $API_URL"
    echo ""
    log_info "Traffic split: ${CANARY_PERCENT}% new revision, $((100-CANARY_PERCENT))% previous revision"
    echo ""
    log_info "Next steps:"
    log_info "1. Monitor logs: gcloud run services logs read lao-cinema-web --region=$REGION"
    log_info "2. Increase traffic: $0 --canary 50"
    log_info "3. Full release: $0"
    log_info "4. Or rollback: $0 --rollback"
    
else
    log_info "Full Deployment (100% traffic)"
    echo ""
    log_info "URLs:"
    log_info "  Web: $WEB_URL"
    log_info "  API: $API_URL"
    echo ""
    log_info "Next steps:"
    log_info "1. Test the application: $WEB_URL"
    log_info "2. Monitor logs: gcloud run services logs read lao-cinema-web --region=$REGION"
    log_info "3. If issues, rollback: $0 --rollback"
fi

echo ""
log_info "View revisions:"
log_info "  gcloud run revisions list --service=lao-cinema-api --region=$REGION"
log_info "  gcloud run revisions list --service=lao-cinema-web --region=$REGION"
echo ""
