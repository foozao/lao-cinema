#!/bin/bash
# Setup Staging Infrastructure for Lao Cinema
# Creates separate Cloud SQL instance and GCS bucket for staging environment

set -e

PROJECT_ID="lao-cinema"
REGION="asia-southeast1"

echo "========================================="
echo "Setting up Staging Infrastructure"
echo "========================================="
echo ""

# Verify correct GCP project
echo "[1/5] Verifying GCP project..."
gcloud config set project $PROJECT_ID

# Generate secure passwords
DB_ROOT_PASSWORD=$(openssl rand -base64 32)
DB_USER_PASSWORD=$(openssl rand -base64 32)

echo ""
echo "[2/5] Creating Cloud SQL instance: laocinema-staging"
echo "This will take 5-10 minutes..."
gcloud sql instances create laocinema-staging \
  --database-version=POSTGRES_16 \
  --tier=db-g1-small \
  --region=$REGION \
  --root-password="$DB_ROOT_PASSWORD" \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4 \
  --availability-type=zonal \
  --edition=ENTERPRISE

echo ""
echo "[3/5] Creating database: laocinema"
gcloud sql databases create laocinema \
  --instance=laocinema-staging

echo ""
echo "[4/5] Creating database user: laocinema"
gcloud sql users create laocinema \
  --instance=laocinema-staging \
  --password="$DB_USER_PASSWORD"

echo ""
echo "[5/5] Creating GCS bucket: lao-cinema-videos-staging"
gcloud storage buckets create gs://lao-cinema-videos-staging \
  --location=$REGION \
  --uniform-bucket-level-access

# Set CORS policy (reuse existing config)
if [ -f "scripts/cors-config.json" ]; then
  gcloud storage buckets update gs://lao-cinema-videos-staging \
    --cors-file=scripts/cors-config.json
fi

# Make publicly readable
gcloud storage buckets add-iam-policy-binding gs://lao-cinema-videos-staging \
  --member=allUsers \
  --role=roles/storage.objectViewer

echo ""
echo "========================================="
echo "✅ Staging Infrastructure Created!"
echo "========================================="
echo ""
echo "IMPORTANT: Save these credentials securely!"
echo ""
echo "Database Root Password:"
echo "$DB_ROOT_PASSWORD"
echo ""
echo "Database User Password (laocinema):"
echo "$DB_USER_PASSWORD"
echo ""
echo "Add to your environment:"
echo "export CLOUD_DB_PASS_STAGING='$DB_USER_PASSWORD'"
echo ""
echo "Connection Details:"
CONNECTION_NAME=$(gcloud sql instances describe laocinema-staging --format='value(connectionName)')
echo "  Instance: laocinema-staging"
echo "  Connection: $CONNECTION_NAME"
echo "  Database: laocinema"
echo "  User: laocinema"
echo ""
echo "GCS Bucket:"
echo "  gs://lao-cinema-videos-staging"
echo "  https://storage.googleapis.com/lao-cinema-videos-staging/"
echo ""
echo "Next Steps:"
echo "1. Export CLOUD_DB_PASS_STAGING environment variable"
echo "2. Deploy to staging: ./scripts/deploy.sh --all --env staging --db-wipe"
echo ""
