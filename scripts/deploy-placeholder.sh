#!/bin/bash
# Deploy placeholder page to Cloud Run
# This will be mapped to laocinema.com (root domain)

set -e

# Configuration
export PROJECT_ID="lao-cinema"
export REGION="asia-southeast1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Deploying placeholder page...${NC}"

# Check correct GCP project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${RED}Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID${NC}"
    echo -e "${RED}Run: gcloud config configurations activate lao-cinema${NC}"
    exit 1
fi

# Build and push image
cd placeholder
docker build --platform linux/amd64 -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/placeholder:latest .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/placeholder:latest
cd ..

# Deploy to Cloud Run
gcloud run deploy lao-cinema-placeholder \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/placeholder:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=80 \
  --memory=128Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3

echo -e "${GREEN}✅ Placeholder deployed!${NC}"
echo ""
echo "To map to root domain, run:"
echo "gcloud beta run domain-mappings create --service=lao-cinema-placeholder --domain=laocinema.com --region=$REGION"
