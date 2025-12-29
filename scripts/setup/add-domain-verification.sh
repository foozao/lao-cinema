#!/bin/bash
# Add Google domain verification TXT record to Cloud DNS
# Usage: ./add-domain-verification.sh "google-site-verification=YOUR_CODE_HERE"

set -e

if [ -z "$1" ]; then
    echo "Usage: ./add-domain-verification.sh \"google-site-verification=YOUR_CODE_HERE\""
    exit 1
fi

VERIFICATION_CODE="$1"
ZONE_NAME="laocinema"
DOMAIN="laocinema.com."
PROJECT_ID="lao-cinema"

# Check GCP project configuration
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "❌ Error: Wrong GCP project! Current: $CURRENT_PROJECT, Required: $PROJECT_ID"
    echo "Run: gcloud config configurations activate lao-cinema"
    exit 1
fi
echo "✓ GCP project: $PROJECT_ID"
echo ""

echo "Adding verification TXT record to Cloud DNS..."
gcloud dns record-sets create "$DOMAIN" \
  --zone="$ZONE_NAME" \
  --type="TXT" \
  --ttl="300" \
  --rrdatas="\"$VERIFICATION_CODE\""

echo "✅ Verification record added!"
echo "Now go back to Google Search Console and click 'Verify'"
