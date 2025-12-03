# Lao Cinema - GCP Cloud Run Deployment Guide

This guide covers deploying Lao Cinema to Google Cloud Platform using:
- **Cloud Run** for containerized Next.js web app and Fastify API
- **Cloud SQL** for PostgreSQL database
- **Artifact Registry** for Docker images

---

## Prerequisites

1. **Google Cloud CLI** installed and authenticated
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Docker** installed locally

3. **GCP Project** with billing enabled

4. **Required APIs** enabled:
   ```bash
   gcloud services enable \
     cloudbuild.googleapis.com \
     run.googleapis.com \
     sqladmin.googleapis.com \
     artifactregistry.googleapis.com
   ```

---

## Step 1: Create Cloud SQL PostgreSQL Instance

```bash
# Set variables
export PROJECT_ID=YOUR_PROJECT_ID
export REGION=us-central1  # Choose your region
export DB_INSTANCE_NAME=lao-cinema-db
export DB_NAME=laocinema
export DB_USER=laocinema
export DB_PASSWORD=YOUR_SECURE_PASSWORD  # Change this!

# Create Cloud SQL instance (PostgreSQL 16)
gcloud sql instances create $DB_INSTANCE_NAME \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=$DB_PASSWORD

# Create database
gcloud sql databases create $DB_NAME \
  --instance=$DB_INSTANCE_NAME

# Create user
gcloud sql users create $DB_USER \
  --instance=$DB_INSTANCE_NAME \
  --password=$DB_PASSWORD
```

**Note**: For production, use a larger tier (e.g., `db-g1-small` or higher).

---

## Step 2: Set Up Artifact Registry

```bash
# Create Docker repository
gcloud artifacts repositories create lao-cinema \
  --repository-format=docker \
  --location=$REGION \
  --description="Lao Cinema Docker images"

# Configure Docker to use Artifact Registry
gcloud auth configure-docker $REGION-docker.pkg.dev
```

---

## Step 3: Build and Push Docker Images

### Build and Push API Image

```bash
cd api

# Build the image
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest .

# Push to Artifact Registry
docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest

cd ..
```

### Build and Push Web Image

```bash
cd web

# Build the image
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest .

# Push to Artifact Registry
docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest

cd ..
```

---

## Step 4: Deploy API to Cloud Run

```bash
# Get Cloud SQL connection name
export CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME \
  --format='value(connectionName)')

# Deploy API service
gcloud run deploy lao-cinema-api \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=3001 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost/$DB_NAME?host=/cloudsql/$CONNECTION_NAME" \
  --add-cloudsql-instances=$CONNECTION_NAME \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10

# Get API URL
export API_URL=$(gcloud run services describe lao-cinema-api \
  --region=$REGION \
  --format='value(status.url)')

echo "API deployed at: $API_URL"
```

---

## Step 5: Run Database Migrations

You need to run Drizzle migrations. Options:

### Option A: Cloud Run Job (Recommended)

```bash
# Create a migration job
gcloud run jobs create lao-cinema-migrate \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest \
  --region=$REGION \
  --set-env-vars="DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost/$DB_NAME?host=/cloudsql/$CONNECTION_NAME" \
  --add-cloudsql-instances=$CONNECTION_NAME \
  --command="npm" \
  --args="run,db:push"

# Execute the migration
gcloud run jobs execute lao-cinema-migrate --region=$REGION
```

### Option B: Cloud SQL Proxy Locally

```bash
# Download Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Start proxy in background
./cloud-sql-proxy $CONNECTION_NAME &

# Run migrations from api directory
cd api
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME"
npm run db:push
cd ..

# Kill proxy
killall cloud-sql-proxy
```

---

## Step 6: Deploy Web App to Cloud Run

```bash
# Deploy web service
gcloud run deploy lao-cinema-web \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --set-env-vars="NEXT_PUBLIC_API_URL=$API_URL" \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10

# Get Web URL
export WEB_URL=$(gcloud run services describe lao-cinema-web \
  --region=$REGION \
  --format='value(status.url)')

echo "Web app deployed at: $WEB_URL"
```

---

## Step 7: Update CORS in API

Update the API service to allow the web app's domain:

```bash
# Get the web app domain (without https://)
export WEB_DOMAIN=$(echo $WEB_URL | sed 's/https\?:\/\///')

# Update API with CORS origin
gcloud run services update lao-cinema-api \
  --region=$REGION \
  --set-env-vars="CORS_ORIGIN=$WEB_URL"
```

---

## Quick Deploy Script

Create `deploy.sh` in the project root:

```bash
#!/bin/bash
set -e

# Configuration
export PROJECT_ID=YOUR_PROJECT_ID
export REGION=us-central1
export CONNECTION_NAME=YOUR_CONNECTION_NAME

# Build and push images
echo "Building API..."
cd api
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest
cd ..

echo "Building Web..."
cd web
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest
cd ..

echo "Deploying API..."
gcloud run deploy lao-cinema-api \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest \
  --region=$REGION

echo "Deploying Web..."
gcloud run deploy lao-cinema-web \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest \
  --region=$REGION

echo "Deployment complete!"
gcloud run services describe lao-cinema-web --region=$REGION --format='value(status.url)'
```

---

## Environment Variables Reference

### API Service
- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL connection string with Cloud SQL socket
- `CORS_ORIGIN` - Web app URL for CORS
- `PORT=3001`
- `HOST=0.0.0.0`
- `LOG_LEVEL=info`

### Web Service
- `NEXT_PUBLIC_API_URL` - API service URL
- `NODE_ENV=production`

---

## Monitoring and Logs

```bash
# View API logs
gcloud run services logs read lao-cinema-api --region=$REGION --limit=50

# View Web logs
gcloud run services logs read lao-cinema-web --region=$REGION --limit=50

# View Cloud SQL logs
gcloud sql operations list --instance=$DB_INSTANCE_NAME
```

---

## Cost Optimization

For a demo/limited use:

1. **Cloud Run**: Scales to zero (free when not in use)
   - First 2 million requests/month free
   - ~$0.00002400/request after

2. **Cloud SQL**: 
   - Use `db-f1-micro` ($7-10/month)
   - Stop instance when not in use: `gcloud sql instances patch $DB_INSTANCE_NAME --activation-policy=NEVER`
   - Restart: `gcloud sql instances patch $DB_INSTANCE_NAME --activation-policy=ALWAYS`

3. **Artifact Registry**: First 0.5 GB free

**Total estimated cost**: $10-20/month for limited demo

---

## Cleanup

To remove all resources:

```bash
# Delete Cloud Run services
gcloud run services delete lao-cinema-api --region=$REGION
gcloud run services delete lao-cinema-web --region=$REGION

# Delete Cloud SQL instance
gcloud sql instances delete $DB_INSTANCE_NAME

# Delete Artifact Registry repository
gcloud artifacts repositories delete lao-cinema --location=$REGION

# Delete Docker images locally
docker rmi $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/api:latest
docker rmi $REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest
```

---

## Troubleshooting

### API can't connect to database
- Check Cloud SQL instance is running
- Verify Cloud Run service has `--add-cloudsql-instances` flag
- Check DATABASE_URL format includes `/cloudsql/$CONNECTION_NAME`

### CORS errors
- Update API `CORS_ORIGIN` environment variable with exact web app URL
- Ensure web URL matches (including https://)

### Build failures
- Check that `next.config.ts` has `output: 'standalone'`
- Verify all dependencies are in package.json
- Check Docker build logs: `docker build --progress=plain`

### Migrations not applying
- Run migrations via Cloud Run Job or Cloud SQL Proxy
- Check database user has proper permissions
- Verify DATABASE_URL is correct

---

## Security: Password Protection

The web app includes **role-based HTTP Basic Auth** middleware. See `PASSWORD_PROTECTION.md` for full details.

**Two user roles**:
- `admin` - Full access including admin pages
- `viewer` - Public pages only (no admin access)

To enable, set the `AUTH_USERS` environment variable:
```bash
--set-env-vars="AUTH_USERS=admin:AdminPass:admin,test:TestPass:viewer"
```

Format: `username:password:role` separated by commas

---

## Next Steps

- Set up **Cloud Build** for CI/CD from GitHub
- Configure **custom domain** with Cloud DNS
- Add **Cloud CDN** for static assets
- Set up **Cloud Monitoring** alerts
- Configure **Cloud Armor** for DDoS protection
