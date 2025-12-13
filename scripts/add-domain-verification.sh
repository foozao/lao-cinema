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

echo "Adding verification TXT record to Cloud DNS..."
gcloud dns record-sets create "$DOMAIN" \
  --zone="$ZONE_NAME" \
  --type="TXT" \
  --ttl="300" \
  --rrdatas="\"$VERIFICATION_CODE\""

echo "✅ Verification record added!"
echo "Now go back to Google Search Console and click 'Verify'"
