#!/bin/bash
# Verify secrets and environment variables for Lao Cinema deployment
# Usage: ./scripts/verify-secrets.sh <preview|staging|production>

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if environment parameter is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Environment parameter required${NC}"
    echo ""
    echo "Usage: ./scripts/verify-secrets.sh <environment>"
    echo ""
    echo "Available environments:"
    echo "  preview     - Preview environment (preview.laocinema.com)"
    echo "  staging     - Staging environment (staging.laocinema.com)"
    echo "  production  - Production environment (laocinema.com)"
    echo ""
    exit 1
fi

# Environment
ENV="$1"
REGION="asia-southeast1"

# Validate environment
if [[ "$ENV" != "preview" && "$ENV" != "staging" && "$ENV" != "production" ]]; then
    echo -e "${RED}Error: Invalid environment '$ENV'${NC}"
    echo ""
    echo "Valid environments: preview, staging, production"
    echo ""
    exit 1
fi

# Service names based on environment
if [ "$ENV" = "production" ]; then
    SERVICE_API="lao-cinema-api"
    SERVICE_WEB="lao-cinema-web"
    SERVICE_VIDEO="lao-cinema-video"
elif [ "$ENV" = "staging" ]; then
    SERVICE_API="lao-cinema-api-staging"
    SERVICE_WEB="lao-cinema-web-staging"
    SERVICE_VIDEO="lao-cinema-video-staging"
else
    SERVICE_API="lao-cinema-api-preview"
    SERVICE_WEB="lao-cinema-web-preview"
    SERVICE_VIDEO="lao-cinema-video-preview"
fi

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Secret & Env Var Verification${NC}"
echo -e "${BLUE}Environment: $ENV${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Track failures
FAILURES=()
FAILURE_COUNT=0

# Function to check if a value is from Secret Manager
is_secret() {
    local value="$1"
    [[ "$value" == *"secretKeyRef"* ]]
}

# Function to print check result
print_check() {
    local status="$1"
    local message="$2"
    local service="${3:-}"
    
    if [ "$status" = "✓" ]; then
        echo -e "${GREEN}✓${NC} $message"
    elif [ "$status" = "✗" ]; then
        echo -e "${RED}✗${NC} $message"
        FAILURES+=("${service}: $message")
        ((FAILURE_COUNT++))
    else
        echo -e "${YELLOW}⚠${NC} $message"
    fi
}

# ================================
# API SERVICE
# ================================
echo -e "${BLUE}Checking API Service: $SERVICE_API${NC}"
echo ""

API_ENV=$(gcloud run services describe $SERVICE_API \
    --region=$REGION \
    --format="value(spec.template.spec.containers[0].env)" 2>/dev/null || echo "")

if [ -z "$API_ENV" ]; then
    print_check "✗" "Service not found or not deployed"
    echo ""
else
    # Check secrets (should use Secret Manager)
    DB_PASS=$(echo "$API_ENV" | grep -o "DB_PASS[^;]*" || echo "")
    BREVO_KEY=$(echo "$API_ENV" | grep -o "BREVO_API_KEY[^;]*" || echo "")
    VIDEO_TOKEN=$(echo "$API_ENV" | grep -o "VIDEO_TOKEN_SECRET[^;]*" || echo "")
    CDN_KEY=$(echo "$API_ENV" | grep -o "CDN_PRIVATE_KEY[^;]*" || echo "")
    
    echo "Secrets:"
    if is_secret "$DB_PASS"; then
        print_check "✓" "DB_PASS using Secret Manager" "API"
    else
        print_check "✗" "DB_PASS NOT using Secret Manager (security risk)" "API"
    fi
    
    if is_secret "$BREVO_KEY"; then
        print_check "✓" "BREVO_API_KEY using Secret Manager" "API"
    else
        print_check "✗" "BREVO_API_KEY NOT using Secret Manager (security risk)" "API"
    fi
    
    if is_secret "$VIDEO_TOKEN"; then
        print_check "✓" "VIDEO_TOKEN_SECRET using Secret Manager" "API"
    else
        print_check "✗" "VIDEO_TOKEN_SECRET NOT using Secret Manager (security risk)" "API"
    fi
    
    # CDN only for production
    if [ "$ENV" = "production" ]; then
        if is_secret "$CDN_KEY"; then
            print_check "✓" "CDN_PRIVATE_KEY using Secret Manager" "API"
        else
            print_check "✗" "CDN_PRIVATE_KEY NOT using Secret Manager (security risk)" "API"
        fi
    fi
    
    echo ""
    echo "Environment Variables:"
    
    # Check required env vars
    [[ "$API_ENV" == *"INSTANCE_CONNECTION_NAME"* ]] && print_check "✓" "INSTANCE_CONNECTION_NAME" "API" || print_check "✗" "INSTANCE_CONNECTION_NAME missing" "API"
    [[ "$API_ENV" == *"DB_NAME"* ]] && print_check "✓" "DB_NAME" "API" || print_check "✗" "DB_NAME missing" "API"
    [[ "$API_ENV" == *"DB_USER"* ]] && print_check "✓" "DB_USER" "API" || print_check "✗" "DB_USER missing" "API"
    [[ "$API_ENV" == *"VIDEO_BASE_URL"* ]] && print_check "✓" "VIDEO_BASE_URL" "API" || print_check "✗" "VIDEO_BASE_URL missing" "API"
    [[ "$API_ENV" == *"VIDEO_SERVER_URL"* ]] && print_check "✓" "VIDEO_SERVER_URL" "API" || print_check "✗" "VIDEO_SERVER_URL missing" "API"
    [[ "$API_ENV" == *"CORS_ORIGIN"* ]] && print_check "✓" "CORS_ORIGIN" "API" || print_check "✗" "CORS_ORIGIN missing" "API"
    [[ "$API_ENV" == *"BREVO_SENDER_EMAIL"* ]] && print_check "✓" "BREVO_SENDER_EMAIL" "API" || print_check "✗" "BREVO_SENDER_EMAIL missing" "API"
    [[ "$API_ENV" == *"BREVO_SENDER_NAME"* ]] && print_check "✓" "BREVO_SENDER_NAME" "API" || print_check "✗" "BREVO_SENDER_NAME missing" "API"
    [[ "$API_ENV" == *"FRONTEND_URL"* ]] && print_check "✓" "FRONTEND_URL" "API" || print_check "✗" "FRONTEND_URL missing" "API"
    [[ "$API_ENV" == *"MAX_RENTALS_PER_MOVIE"* ]] && print_check "✓" "MAX_RENTALS_PER_MOVIE" "API" || print_check "✗" "MAX_RENTALS_PER_MOVIE missing" "API"
    [[ "$API_ENV" == *"NODE_ENV"* ]] && print_check "✓" "NODE_ENV" "API" || print_check "✗" "NODE_ENV missing" "API"
    
    # Sentry (required for preview/production, optional for staging)
    if [ "$ENV" = "staging" ]; then
        [[ "$API_ENV" == *"SENTRY_DSN"* ]] && print_check "✓" "SENTRY_DSN (optional for staging)" "API" || print_check "⚠" "SENTRY_DSN not set (optional for staging)" "API"
    else
        [[ "$API_ENV" == *"SENTRY_DSN"* ]] && print_check "✓" "SENTRY_DSN" "API" || print_check "✗" "SENTRY_DSN missing (required for error monitoring)" "API"
    fi
    
    # CDN vars only for production
    if [ "$ENV" = "production" ]; then
        [[ "$API_ENV" == *"CDN_DOMAIN"* ]] && print_check "✓" "CDN_DOMAIN" "API" || print_check "✗" "CDN_DOMAIN missing" "API"
        [[ "$API_ENV" == *"CDN_KEY_NAME"* ]] && print_check "✓" "CDN_KEY_NAME" "API" || print_check "✗" "CDN_KEY_NAME missing" "API"
    fi
    
    echo ""
fi

# ================================
# WEB SERVICE
# ================================
echo -e "${BLUE}Checking Web Service: $SERVICE_WEB${NC}"
echo ""

WEB_ENV=$(gcloud run services describe $SERVICE_WEB \
    --region=$REGION \
    --format="value(spec.template.spec.containers[0].env)" 2>/dev/null || echo "")

if [ -z "$WEB_ENV" ]; then
    print_check "✗" "Service not found or not deployed"
    echo ""
else
    echo "Environment Variables:"
    [[ "$WEB_ENV" == *"NEXT_PUBLIC_API_URL"* ]] && print_check "✓" "NEXT_PUBLIC_API_URL" "WEB" || print_check "✗" "NEXT_PUBLIC_API_URL missing" "WEB"
    [[ "$WEB_ENV" == *"NEXT_PUBLIC_VIDEO_BASE_URL"* ]] && print_check "✓" "NEXT_PUBLIC_VIDEO_BASE_URL" "WEB" || print_check "✗" "NEXT_PUBLIC_VIDEO_BASE_URL missing" "WEB"
    [[ "$WEB_ENV" == *"AUTH_USERS"* ]] && print_check "✓" "AUTH_USERS" "WEB" || print_check "✗" "AUTH_USERS missing" "WEB"
    [[ "$WEB_ENV" == *"NODE_ENV"* ]] && print_check "✓" "NODE_ENV" "WEB" || print_check "✗" "NODE_ENV missing" "WEB"
    
    # Sentry (required for preview/production, optional for staging)
    if [ "$ENV" = "staging" ]; then
        [[ "$WEB_ENV" == *"NEXT_PUBLIC_SENTRY_DSN"* ]] && print_check "✓" "NEXT_PUBLIC_SENTRY_DSN (optional for staging)" "WEB" || print_check "⚠" "NEXT_PUBLIC_SENTRY_DSN not set (optional for staging)" "WEB"
    else
        [[ "$WEB_ENV" == *"NEXT_PUBLIC_SENTRY_DSN"* ]] && print_check "✓" "NEXT_PUBLIC_SENTRY_DSN" "WEB" || print_check "✗" "NEXT_PUBLIC_SENTRY_DSN missing (required for error monitoring)" "WEB"
    fi
    
    echo ""
fi

# ================================
# VIDEO SERVICE
# ================================
echo -e "${BLUE}Checking Video Service: $SERVICE_VIDEO${NC}"
echo ""

VIDEO_ENV=$(gcloud run services describe $SERVICE_VIDEO \
    --region=$REGION \
    --format="value(spec.template.spec.containers[0].env)" 2>/dev/null || echo "")

if [ -z "$VIDEO_ENV" ]; then
    print_check "✗" "Service not found or not deployed"
    echo ""
else
    # Check secrets
    VIDEO_TOKEN=$(echo "$VIDEO_ENV" | grep -o "VIDEO_TOKEN_SECRET[^;]*" || echo "")
    
    echo "Secrets:"
    if is_secret "$VIDEO_TOKEN"; then
        print_check "✓" "VIDEO_TOKEN_SECRET using Secret Manager" "VIDEO"
    else
        print_check "✗" "VIDEO_TOKEN_SECRET NOT using Secret Manager (security risk)" "VIDEO"
    fi
    
    echo ""
    echo "Environment Variables:"
    [[ "$VIDEO_ENV" == *"VIDEOS_PATH"* ]] && print_check "✓" "VIDEOS_PATH" "VIDEO" || print_check "✗" "VIDEOS_PATH missing" "VIDEO"
    [[ "$VIDEO_ENV" == *"PUBLIC_PATH"* ]] && print_check "✓" "PUBLIC_PATH" "VIDEO" || print_check "✗" "PUBLIC_PATH missing" "VIDEO"
    [[ "$VIDEO_ENV" == *"API_URL"* ]] && print_check "✓" "API_URL" "VIDEO" || print_check "✗" "API_URL missing" "VIDEO"
    [[ "$VIDEO_ENV" == *"CORS_ORIGINS"* ]] && print_check "✓" "CORS_ORIGINS" "VIDEO" || print_check "✗" "CORS_ORIGINS missing" "VIDEO"
    
    echo ""
fi

# ================================
# SECRET MANAGER CHECK
# ================================
echo -e "${BLUE}Checking Secret Manager${NC}"
echo ""

# Expected secrets based on environment
if [ "$ENV" = "preview" ]; then
    EXPECTED_SECRETS=("brevo-api-key" "video-token-secret" "db-pass-preview")
elif [ "$ENV" = "staging" ]; then
    EXPECTED_SECRETS=("brevo-api-key" "video-token-secret" "db-pass-staging")
else
    EXPECTED_SECRETS=("brevo-api-key" "video-token-secret" "db-pass-production" "cdn-private-key-production")
fi

SECRETS_LIST=$(gcloud secrets list --format="value(name)" 2>/dev/null || echo "")

for secret in "${EXPECTED_SECRETS[@]}"; do
    if echo "$SECRETS_LIST" | grep -q "^$secret$"; then
        print_check "✓" "$secret exists in Secret Manager" "SECRET_MANAGER"
    else
        print_check "✗" "$secret missing from Secret Manager" "SECRET_MANAGER"
    fi
done

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Verification Complete${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Summary
if [ $FAILURE_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo -e "${GREEN}Environment '$ENV' is properly configured.${NC}"
else
    echo -e "${RED}✗ Found $FAILURE_COUNT issue(s):${NC}"
    echo ""
    for failure in "${FAILURES[@]}"; do
        echo -e "${RED}  •${NC} $failure"
    done
    echo ""
    echo -e "${YELLOW}Fix these issues before deploying to $ENV.${NC}"
    exit 1
fi
