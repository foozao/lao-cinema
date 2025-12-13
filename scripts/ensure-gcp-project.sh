#!/bin/bash
# Ensure we're on the correct GCP project before running commands
# Usage: source scripts/ensure-gcp-project.sh

REQUIRED_PROJECT="lao-cinema"
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ "$CURRENT_PROJECT" != "$REQUIRED_PROJECT" ]; then
    echo "⚠️  Wrong GCP project detected!"
    echo "   Current: $CURRENT_PROJECT"
    echo "   Required: $REQUIRED_PROJECT"
    echo ""
    echo "Switching to correct project..."
    gcloud config configurations activate lao-cinema
    
    # Verify the switch worked
    NEW_PROJECT=$(gcloud config get-value project 2>/dev/null)
    if [ "$NEW_PROJECT" = "$REQUIRED_PROJECT" ]; then
        echo "✅ Successfully switched to project: $REQUIRED_PROJECT"
    else
        echo "❌ Failed to switch projects. Please run manually:"
        echo "   gcloud config configurations activate lao-cinema"
        return 1
    fi
else
    echo "✅ Correct GCP project active: $REQUIRED_PROJECT"
fi
