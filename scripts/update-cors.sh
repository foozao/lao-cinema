#!/bin/bash
# Update API CORS configuration without full redeployment
# Usage: ./update-cors.sh [CORS_ORIGIN]

set -e

# Configuration
PROJECT_ID="lao-cinema"
REGION="asia-southeast1"
DEFAULT_CORS_ORIGIN="https://preview.laocinema.com"  # Web domain (unchanged)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Use provided CORS origin or default
CORS_ORIGIN="${1:-$DEFAULT_CORS_ORIGIN}"

echo -e "${GREEN}Updating API CORS configuration...${NC}"
echo "CORS Origin: $CORS_ORIGIN"

# Check correct GCP project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${RED}Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID${NC}"
    echo -e "${RED}Run: gcloud config configurations activate lao-cinema${NC}"
    exit 1
fi

# Update CORS
gcloud run services update lao-cinema-api \
    --region=$REGION \
    --update-env-vars="CORS_ORIGIN=$CORS_ORIGIN" \
    --quiet

echo -e "${GREEN}✅ CORS configuration updated!${NC}"
echo "API now accepts requests from: $CORS_ORIGIN"
