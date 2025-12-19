# Platform Portability Analysis

This document analyzes how portable the Lao Cinema codebase is and what would be required to migrate to different cloud providers or hosting platforms.

## Executive Summary

**Overall Portability Score: 9/10** - Highly portable with minimal vendor lock-in.

The codebase is **very portable** with only 2 minor GCP-specific dependencies:
1. Cloud SQL unix socket connection (API database connection)
2. Google Cloud Storage SDK (image uploads in production)

Both can be replaced with 10-20 lines of code changes. Everything else uses standard, platform-agnostic technologies.

---

## Architecture Overview

### Current Stack (GCP)

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Next.js 16)                                       │
│ - Cloud Run container                                       │
│ - No GCP dependencies                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend API (Fastify)                                       │
│ - Cloud Run container                                       │
│ - Cloud SQL connector (GCP-specific) ⚠️                    │
│ - Google Cloud Storage SDK (GCP-specific) ⚠️               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Database (PostgreSQL 16)                                    │
│ - Cloud SQL (managed PostgreSQL)                            │
│ - Standard SQL, fully portable ✅                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Storage (Google Cloud Storage)                              │
│ - Video files (HLS streams)                                 │
│ - Images (posters, backdrops)                               │
│ - S3-compatible alternatives available ✅                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component-by-Component Analysis

### 1. Frontend (Next.js Web App)

**Portability: 10/10** - Zero vendor lock-in

**Current Setup:**
- Next.js 16 with React 19
- Standard Docker container deployment
- Environment variable for API URL
- No cloud-specific code

**Dependencies:**
- No cloud provider SDKs
- No GCP-specific features
- Standard Node.js runtime

**Migration Effort:** ⚡ **Zero effort**
- Deploy Docker container anywhere
- Change `NEXT_PUBLIC_API_URL` environment variable
- Works with: Vercel, Netlify, AWS (ECS/Fargate/App Runner), Azure App Service, DigitalOcean App Platform, Fly.io, Railway, Render, self-hosted

**Code Changes Required:** None

---

### 2. Backend API (Fastify)

**Portability: 8/10** - Minor GCP dependencies

**Current Setup:**
- Fastify with TypeScript
- Standard Docker container
- PostgreSQL via Drizzle ORM
- Cloud SQL unix socket connection (GCP-specific)
- Google Cloud Storage for uploads (GCP-specific)

**GCP-Specific Code:**

#### a) Database Connection (`api/src/db/index.ts`)
```typescript
// GCP-specific: Unix socket connection for Cloud SQL
if (INSTANCE_CONNECTION_NAME) {
  client = postgres({
    host: `/cloudsql/${INSTANCE_CONNECTION_NAME}`,
    database: process.env.DB_NAME || 'laocinema',
    username: process.env.DB_USER || 'laocinema',
    password: process.env.DB_PASS,
  });
} else {
  // Standard connection (works everywhere)
  client = postgres(DATABASE_URL);
}
```

**Fix:** Remove GCP block, use only `DATABASE_URL` (standard PostgreSQL connection string)

#### b) Image Uploads (`api/src/routes/upload.ts`)
```typescript
// GCP-specific: Google Cloud Storage
if (IS_PRODUCTION) {
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage();
  const bucket = storage.bucket(GCS_BUCKET_NAME);
  // ... upload logic
}
```

**Fix:** Replace with S3-compatible SDK (AWS S3, MinIO, DigitalOcean Spaces, Backblaze B2, etc.)

**Migration Effort:** ⚡ **30-60 minutes**
- Remove Cloud SQL unix socket code (5 lines)
- Replace Google Cloud Storage with S3 SDK (10-15 lines)
- Update environment variables
- Test uploads

**Code Changes Required:** ~20 lines across 2 files

---

### 3. Database (PostgreSQL)

**Portability: 10/10** - Zero vendor lock-in

**Current Setup:**
- PostgreSQL 16
- Drizzle ORM (database-agnostic)
- Standard SQL schema
- No GCP-specific features

**Migration Effort:** ⚡ **Near-zero effort**
- Any PostgreSQL 14+ database works
- Works with: AWS RDS, Azure Database for PostgreSQL, DigitalOcean Managed Databases, self-hosted, Supabase, Neon, PlanetScale (with adapter), Heroku Postgres

**Code Changes Required:** None (just connection string)

**Data Migration:**
- Export via `pg_dump` (standard PostgreSQL tool)
- Import via `psql` (standard PostgreSQL tool)
- Drizzle migrations work everywhere

---

### 4. Video Storage & Delivery

**Portability: 9/10** - Environment variable based

**Current Setup:**
- Google Cloud Storage for video files
- Environment variable: `NEXT_PUBLIC_VIDEO_BASE_URL`
- No cloud-specific code in frontend

**Code Reference (`web/lib/video-url.ts`):**
```typescript
const VIDEO_BASE_URL = process.env.NEXT_PUBLIC_VIDEO_BASE_URL || '/videos/hls';

export function getVideoUrl(movieSlug: string): string {
  return `${VIDEO_BASE_URL}/${movieSlug}/master.m3u8`;
}
```

**Migration Effort:** ⚡ **5-10 minutes**
- Upload videos to new storage
- Change environment variable
- No code changes needed

**Works with:**
- AWS S3 + CloudFront
- Cloudflare R2 + CDN
- Bunny CDN
- DigitalOcean Spaces
- Backblaze B2
- MinIO (self-hosted)
- Any HTTP server serving static files

---

### 5. Container Deployment

**Portability: 10/10** - Standard Docker

**Current Setup:**
- Standard Dockerfiles (Node 20 Alpine)
- No GCP-specific layers
- Multi-stage builds for efficiency

**Migration Effort:** ⚡ **Zero effort**
- Docker images work everywhere
- Push to any container registry
- Deploy to any container platform

**Works with:**
- AWS: ECS, Fargate, App Runner, EKS
- Azure: Container Apps, App Service, AKS
- DigitalOcean: App Platform, Kubernetes
- Fly.io, Railway, Render
- Self-hosted: Docker, Kubernetes, Docker Swarm

---

### 6. CI/CD (Deployment Scripts)

**Portability: 7/10** - GCP-specific but easily replaced

**Current Setup:**
- Bash deployment scripts using `gcloud` CLI
- Cloud Build (optional)
- Cloud Run deployment

**Migration Effort:** 🔧 **1-2 hours**
- Rewrite deployment scripts for new platform
- Set up CI/CD with GitHub Actions, GitLab CI, or platform-native tools
- Configure new container registry

**Code Changes Required:** New deployment scripts (not core application code)

---

## Migration Scenarios

### Scenario 1: AWS Migration

**Difficulty: Easy** | **Time: 2-4 hours**

| Component | GCP | AWS Equivalent | Changes |
|-----------|-----|----------------|---------|
| Frontend | Cloud Run | App Runner / ECS Fargate | Update deployment script |
| Backend | Cloud Run | App Runner / ECS Fargate | Update deployment script, remove Cloud SQL socket |
| Database | Cloud SQL | RDS PostgreSQL | Change connection string |
| Storage | GCS | S3 | Replace `@google-cloud/storage` with `@aws-sdk/client-s3` |
| CDN | Cloud CDN | CloudFront | Update video URL env var |
| Registry | Artifact Registry | ECR | Update deployment script |

**Estimated Cost:** Similar to GCP (~$30-100/month for low traffic)

---

### Scenario 2: DigitalOcean Migration

**Difficulty: Very Easy** | **Time: 1-3 hours**

| Component | GCP | DigitalOcean Equivalent | Changes |
|-----------|-----|-------------------------|---------|
| Frontend | Cloud Run | App Platform | Update deployment (git-based auto-deploy) |
| Backend | Cloud Run | App Platform | Update deployment, remove Cloud SQL socket |
| Database | Cloud SQL | Managed PostgreSQL | Change connection string |
| Storage | GCS | Spaces (S3-compatible) | Replace storage SDK |
| CDN | Cloud CDN | Spaces CDN | Update video URL env var |

**Estimated Cost:** $25-80/month (cheaper than GCP at low scale)

---

### Scenario 3: Self-Hosted (VPS)

**Difficulty: Moderate** | **Time: 4-8 hours**

| Component | GCP | Self-Hosted Solution | Changes |
|-----------|-----|---------------------|---------|
| Frontend | Cloud Run | Docker + Nginx/Caddy | Deploy container |
| Backend | Cloud Run | Docker + Nginx/Caddy | Deploy container, remove Cloud SQL socket |
| Database | Cloud SQL | PostgreSQL container/service | Change connection string |
| Storage | GCS | MinIO (S3-compatible) | Replace storage SDK |
| CDN | Cloud CDN | Cloudflare (free) | Proxy through Cloudflare |

**Estimated Cost:** $20-50/month (VPS + storage)

---

### Scenario 4: Vercel + Supabase + Cloudflare R2

**Difficulty: Easy** | **Time: 2-4 hours**

| Component | GCP | Modern Stack | Changes |
|-----------|-----|--------------|---------|
| Frontend | Cloud Run | Vercel | Deploy via git |
| Backend | Cloud Run | Vercel Serverless Functions OR separate VPS | Adapt routes or keep as separate service |
| Database | Cloud SQL | Supabase PostgreSQL | Change connection string |
| Storage | GCS | Cloudflare R2 (S3-compatible) | Replace storage SDK |
| CDN | Cloud CDN | Cloudflare CDN | Included with R2 |

**Estimated Cost:** $0-30/month (generous free tiers)

---

## Detailed Migration Steps

### Step 1: Database Migration

**Time: 30-60 minutes**

1. **Export from Cloud SQL:**
   ```bash
   # Via Cloud SQL Proxy
   pg_dump -h 127.0.0.1 -p 5432 -U laocinema -d laocinema \
     --no-owner --no-acl -f backup.sql
   ```

2. **Create new database:**
   ```bash
   # AWS RDS, DigitalOcean, or self-hosted
   createdb laocinema
   ```

3. **Import to new database:**
   ```bash
   psql -h new-host -U new-user -d laocinema -f backup.sql
   ```

4. **Update connection string:**
   ```bash
   # Old (GCP)
   export DATABASE_URL="postgresql://user:pass@/laocinema?host=/cloudsql/project:region:instance"
   
   # New (anywhere)
   export DATABASE_URL="postgresql://user:pass@host:5432/laocinema"
   ```

**No code changes needed** - just environment variable

---

### Step 2: Update Backend Code

**Time: 30-60 minutes**

#### Remove Cloud SQL Socket Connection

**File:** `api/src/db/index.ts`

```typescript
// BEFORE (GCP-specific)
const INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME;
let client;

if (INSTANCE_CONNECTION_NAME) {
  client = postgres({
    host: `/cloudsql/${INSTANCE_CONNECTION_NAME}`,
    database: process.env.DB_NAME || 'laocinema',
    username: process.env.DB_USER || 'laocinema',
    password: process.env.DB_PASS,
  });
} else {
  client = postgres(DATABASE_URL);
}

// AFTER (portable)
const DATABASE_URL = process.env.NODE_ENV === 'test' 
  ? process.env.TEST_DATABASE_URL 
  : process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(DATABASE_URL);
```

#### Replace Google Cloud Storage

**File:** `api/src/routes/upload.ts`

```typescript
// BEFORE (GCP)
if (IS_PRODUCTION) {
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage();
  const bucket = storage.bucket(GCS_BUCKET_NAME);
  const file = bucket.file(`${imageType}s/${filename}`);
  await file.save(buffer, { contentType: data.mimetype });
  await file.makePublic();
  publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${imageType}s/${filename}`;
}

// AFTER (AWS S3 / S3-compatible)
if (IS_PRODUCTION) {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT, // Optional for S3-compatible services
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
  });
  
  const key = `${imageType}s/${filename}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: data.mimetype,
    ACL: 'public-read',
  }));
  
  publicUrl = `${process.env.S3_PUBLIC_URL}/${key}`;
}
```

**Package changes:**
```bash
# Remove
npm uninstall @google-cloud/storage

# Add (for AWS S3)
npm install @aws-sdk/client-s3

# OR for generic S3-compatible (MinIO, DigitalOcean, Backblaze)
npm install aws-sdk  # OR @aws-sdk/client-s3 with custom endpoint
```

---

### Step 3: Migrate Storage Files

**Time: 1-3 hours (depends on file size)**

```bash
# Option 1: Using gsutil and s3cmd/aws cli
gsutil -m cp -r gs://your-gcs-bucket/* ./local-temp/
aws s3 sync ./local-temp/ s3://your-s3-bucket/

# Option 2: Using rclone (supports 40+ cloud storage providers)
rclone sync gcs:your-gcs-bucket s3:your-s3-bucket

# Option 3: Direct copy with rclone
rclone copy gcs:your-gcs-bucket digitalocean:your-spaces-bucket
```

---

### Step 4: Update Environment Variables

**Frontend:**
```bash
# Change API URL
NEXT_PUBLIC_API_URL=https://api.new-platform.com

# Change video storage URL
NEXT_PUBLIC_VIDEO_BASE_URL=https://cdn.new-platform.com/videos/hls
```

**Backend:**
```bash
# Database connection (standard PostgreSQL URL)
DATABASE_URL=postgresql://user:pass@host:5432/laocinema

# Storage credentials (S3-compatible)
S3_REGION=us-east-1
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com  # Optional
S3_BUCKET_NAME=lao-cinema-images
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_PUBLIC_URL=https://lao-cinema-images.nyc3.digitaloceanspaces.com
```

---

### Step 5: Deploy to New Platform

**AWS Example:**
```bash
# Build and push Docker images
docker build -t lao-cinema-web ./web
docker build -t lao-cinema-api ./api

docker tag lao-cinema-web:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/lao-cinema-web:latest
docker tag lao-cinema-api:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/lao-cinema-api:latest

docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/lao-cinema-web:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/lao-cinema-api:latest

# Deploy via AWS App Runner, ECS, or Fargate
aws apprunner create-service ...
```

**DigitalOcean Example:**
```bash
# Push to DigitalOcean Container Registry
doctl registry login
docker tag lao-cinema-web:latest registry.digitalocean.com/your-registry/lao-cinema-web
docker push registry.digitalocean.com/your-registry/lao-cinema-web

# Or use App Platform with git-based deployment (even simpler)
# Just connect your GitHub repo and configure build/run commands
```

---

## Vendor Lock-in Risk Assessment

### High Risk (Avoid)
- ❌ **None** - We don't use any high lock-in GCP services

### Medium Risk (Replaceable with effort)
- ⚠️ **Cloud SQL unix socket** - Used but easy to replace (5 min)
- ⚠️ **Google Cloud Storage SDK** - Used but S3 alternatives exist (30 min)

### Low Risk (Standard technologies)
- ✅ **PostgreSQL** - Standard SQL database, works everywhere
- ✅ **Docker containers** - Universal deployment format
- ✅ **Node.js runtime** - Available on all platforms
- ✅ **HTTP/REST API** - Standard protocol
- ✅ **HLS video streaming** - Standard format

### Zero Risk (No vendor code)
- ✅ **React/Next.js frontend** - Pure JavaScript
- ✅ **Fastify backend** - Framework-agnostic
- ✅ **Drizzle ORM** - Database-agnostic ORM
- ✅ **TypeScript** - Platform-independent

---

## Cost Comparison: GCP vs Alternatives

### Current GCP Costs (100 streams/month)
- **Total:** ~$29/month
- **Breakdown:** SQL $28, Storage $0.50, Other $0.50

### Alternative Platform Costs (100 streams/month)

| Platform | Monthly Cost | Notes |
|----------|--------------|-------|
| **AWS (App Runner + RDS)** | ~$35-45 | Slightly more expensive, better global performance |
| **DigitalOcean (App Platform)** | ~$25-30 | Cheaper, simpler, great for small-medium scale |
| **Fly.io** | ~$15-25 | Very cheap, excellent global edge deployment |
| **Railway** | ~$20-30 | Developer-friendly, good free tier |
| **Vercel + Supabase** | ~$0-20 | Generous free tiers, scales well |
| **Self-hosted (VPS)** | ~$20-40 | Most flexible, requires more DevOps work |

---

## Recommended Migration Strategy

### Immediate (No Urgency)
- ✅ **Stay on GCP** - Current costs are reasonable (~$28/month)
- ✅ **Remove Cloud SQL unix socket** - Use standard `DATABASE_URL` for portability
- ✅ **Keep Google Cloud Storage** - Works fine, but be ready to migrate

### When to Consider Migration

**Migrate to AWS if:**
- Need better Asia-Pacific performance
- Want tighter integration with AWS services
- Enterprise compliance requirements

**Migrate to DigitalOcean if:**
- Want simpler platform with better UX
- Need lower costs at low-medium scale
- Prefer predictable pricing

**Migrate to Vercel/Netlify + Supabase if:**
- Want serverless/edge deployment
- Prefer generous free tiers
- Frontend-heavy workload

**Self-host if:**
- Have DevOps expertise
- Want maximum control
- Need lowest possible cost at scale

---

## Portability Best Practices (Already Followed)

✅ **Use standard Docker containers** - Universal deployment format  
✅ **Environment variables for configuration** - No hardcoded URLs  
✅ **Database-agnostic ORM (Drizzle)** - Not tied to specific database features  
✅ **Standard PostgreSQL** - No proprietary extensions  
✅ **Framework-agnostic backend (Fastify)** - Pure Node.js, no platform SDKs  
✅ **Static typing (TypeScript)** - Catch issues early, refactor safely  
✅ **Separation of concerns** - Frontend/backend/database are independent  

### Areas for Improvement

🔧 **Abstract storage layer** - Create `StorageService` interface  
🔧 **Remove Cloud SQL socket code** - Use only standard PostgreSQL connection  
🔧 **Document deployment process** - Platform-agnostic deployment guide  

---

## Conclusion

**The Lao Cinema codebase is highly portable (9/10)** with only 2 minor GCP dependencies that can be replaced in under an hour. The use of standard technologies (PostgreSQL, Docker, Node.js, TypeScript) and avoidance of proprietary cloud services means you can migrate to any major cloud provider or self-host with minimal effort.

**Migration time estimate:**
- **Simple migration** (AWS, DigitalOcean): 2-4 hours
- **Complex migration** (self-hosted with custom setup): 4-8 hours
- **Code changes**: 20-30 lines across 2 files

**Key takeaway:** You're not locked into GCP. If costs increase or you want to move platforms, you can do so quickly without rewriting the application.
