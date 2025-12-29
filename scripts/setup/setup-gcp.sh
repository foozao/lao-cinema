#!/bin/bash
# Lao Cinema - Initial GCP Setup Script
# Run this once to set up Cloud SQL, Artifact Registry, etc.

set -e  # Exit on error

# ========================================
# CONFIGURATION - UPDATE THESE VALUES
# ========================================
export PROJECT_ID="lao-cinema"
export REGION="asia-southeast1"  # Singapore - closest to Laos
export DB_INSTANCE_NAME="laocinema-preview"  # Or laocinema-staging, laocinema-production
export DB_NAME="laocinema"
export DB_USER="laocinema"
export DB_PASSWORD=""  # Will prompt if empty

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
log_info "Starting GCP setup for Lao Cinema..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if project ID is set
if [ "$PROJECT_ID" = "your-gcp-project-id" ]; then
    log_error "Please set PROJECT_ID in the script"
    exit 1
fi

# Prompt for DB password if not set
if [ -z "$DB_PASSWORD" ]; then
    read -sp "Enter database password: " DB_PASSWORD
    echo ""
    if [ -z "$DB_PASSWORD" ]; then
        log_error "Database password cannot be empty"
        exit 1
    fi
fi

# Set project
gcloud config set project $PROJECT_ID

# ========================================
# ENABLE REQUIRED APIS
# ========================================
log_info "Enabling required GCP APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    artifactregistry.googleapis.com \
    compute.googleapis.com

log_info "APIs enabled successfully"

# ========================================
# CREATE ARTIFACT REGISTRY
# ========================================
log_info "Creating Artifact Registry repository..."

# Check if repository already exists
if gcloud artifacts repositories describe lao-cinema --location=$REGION &> /dev/null; then
    log_warn "Artifact Registry repository already exists, skipping..."
else
    gcloud artifacts repositories create lao-cinema \
        --repository-format=docker \
        --location=$REGION \
        --description="Lao Cinema Docker images"
    log_info "Artifact Registry created successfully"
fi

# Configure Docker
log_info "Configuring Docker authentication..."
gcloud auth configure-docker $REGION-docker.pkg.dev

# ========================================
# CREATE CLOUD SQL INSTANCE
# ========================================
log_info "Creating Cloud SQL PostgreSQL instance..."
log_warn "This may take several minutes..."

# Check if instance already exists
if gcloud sql instances describe $DB_INSTANCE_NAME &> /dev/null; then
    log_warn "Cloud SQL instance already exists, skipping..."
else
    gcloud sql instances create $DB_INSTANCE_NAME \
        --database-version=POSTGRES_16 \
        --tier=db-f1-micro \
        --region=$REGION \
        --root-password=$DB_PASSWORD \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --no-deletion-protection
    
    log_info "Cloud SQL instance created successfully"
fi

# ========================================
# CREATE DATABASE AND USER
# ========================================
log_info "Creating database and user..."

# Create database
if gcloud sql databases describe $DB_NAME --instance=$DB_INSTANCE_NAME &> /dev/null; then
    log_warn "Database already exists, skipping..."
else
    gcloud sql databases create $DB_NAME \
        --instance=$DB_INSTANCE_NAME
    log_info "Database created successfully"
fi

# Create user
if gcloud sql users describe $DB_USER --instance=$DB_INSTANCE_NAME &> /dev/null; then
    log_warn "Database user already exists, skipping..."
else
    gcloud sql users create $DB_USER \
        --instance=$DB_INSTANCE_NAME \
        --password=$DB_PASSWORD
    log_info "Database user created successfully"
fi

# ========================================
# GET CONNECTION INFO
# ========================================
CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME \
    --format='value(connectionName)')

# ========================================
# SETUP COMPLETE
# ========================================
echo ""
log_info "========================================="
log_info "GCP setup completed successfully! 🎉"
log_info "========================================="
echo ""
log_info "Connection Details:"
log_info "-------------------"
log_info "Project ID:       $PROJECT_ID"
log_info "Region:           $REGION"
log_info "DB Instance:      $DB_INSTANCE_NAME"
log_info "Connection Name:  $CONNECTION_NAME"
log_info "Database:         $DB_NAME"
log_info "User:             $DB_USER"
echo ""
log_info "Next steps:"
log_info "1. Update deploy.sh with your PROJECT_ID and CONNECTION_NAME"
log_info "2. Run database migrations (see DEPLOYMENT.md)"
log_info "3. Run ./deploy.sh to deploy the application"
echo ""
log_warn "IMPORTANT: Save the database password securely!"
echo ""
