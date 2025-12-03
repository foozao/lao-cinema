# Self-Hosted Video Infrastructure Guide

Comprehensive analysis of self-hosting video delivery for Lao Cinema when you have data center access.

## Executive Summary

### When Self-Hosting Makes Sense ✅

**You have access to a data center** - This changes everything. With existing infrastructure, self-hosting can be **significantly cheaper** than CDN services at scale.

### Key Decision

| Factor | Self-Hosted + CDN | Pure Managed CDN |
|--------|------------------|------------------|
| **Setup Time** | 2-3 months | 1-2 weeks |
| **Monthly Cost (50TB)** | $1,200 | $6,400 |
| **Break-even** | 5TB/month | N/A |
| **Control** | Full | Limited |
| **Scaling** | Manual | Automatic |

**Recommendation: Hybrid approach** - Self-host origin in data center + use BunnyCDN for edge delivery.

---

## Architecture Comparison

### Option A: Pure CDN (Cloudflare/Bunny)
```
User → CDN Edge → CDN Storage
```
**Cost:** $6,400/month at 50TB  
**Pro:** Simple, managed  
**Con:** Expensive at scale

### Option B: Self-Hosted Origin + CDN (Recommended)
```
User → CDN Edge (BunnyCDN) → Your Origin Server → Your Storage
```
**Cost:** $1,200/month at 50TB  
**Pro:** 80% cost savings, full control  
**Con:** Requires setup and maintenance

### Option C: Pure Self-Hosted (Not Recommended)
```
User → Your Server
```
**Cost:** Bandwidth costs only  
**Pro:** Maximum savings  
**Con:** No global CDN, poor performance outside Laos

---

## Recommended Architecture

### Components

**1. Storage Layer (Your Data Center)**
- **MinIO** - S3-compatible object storage
- 10-50TB storage (RAID 10)
- Regular backups

**2. Origin Server (Your Data Center)**
- **NGINX** - Optimized for static files
- 4 cores, 8GB RAM, 1Gbps network
- Serves only to CDN (not end users)

**3. CDN Layer (BunnyCDN)**
- Edge caching for global delivery
- $0.01-0.03/GB ($10-30/TB)
- Origin pull from your data center

**4. Transcoding Pipeline**
- FFmpeg with job queue (BullMQ + Redis)
- Use existing conversion script
- Optional: GPU acceleration

---

## Infrastructure Requirements

### Minimum Hardware

**Storage Server:**
- 2x 10TB HDD (RAID 1) = 10TB usable
- 16GB RAM
- Dual gigabit NIC
- Cost: ~$2,000 (or use existing)

**Origin Server (can be same machine):**
- 4 vCPU
- 8GB RAM
- 100GB SSD
- 1Gbps uplink

### Software Stack

```yaml
Storage: MinIO (S3-compatible)
Web Server: NGINX with SSL
Queue: Redis + BullMQ
Monitoring: Prometheus + Grafana
CDN: BunnyCDN
```

### Network

**Bandwidth Requirements:**
- With 90% CDN cache hit rate
- Your origin: Only 10% of total traffic
- 50TB/month user traffic = 5TB from your data center
- 1Gbps connection is sufficient

---

## Cost Analysis

### Scenario: 100 Movies, 50TB/month

**Self-Hosted Origin + BunnyCDN:**
- Hardware: $2,000 (one-time, or use existing)
- Storage drives: $1,500 (one-time)
- Power: $75/month
- Internet: $500/month (if dedicated)
- Labor: 20 hours/month × $50 = $1,000
- BunnyCDN: $500/month
- **Total: ~$2,075/month**

**Pure Cloudflare Stream:**
- Storage: $45/month
- Delivery: $6,400/month
- **Total: $6,445/month**

**Savings: $4,370/month or $52,440/year**

### Break-Even Analysis

With data center access, break-even is **~5TB/month**:
- Below 5TB: Pure CDN is cheaper (less setup cost)
- Above 5TB: Self-hosted + CDN becomes cheaper
- At 50TB: Save 68% ($4,370/month)

---

## Implementation Steps

### Phase 1: Quick Start with BunnyCDN (Weeks 1-2)

**Skip self-hosting initially** - Launch fast with managed CDN:

1. Sign up for BunnyCDN
2. Create Pull Zone (origin: `https://storage.bunnycdn.com`)
3. Upload videos via Bunny Storage API
4. Update your app to use Bunny URLs
5. **Cost: ~$100-500/month initially**

This gives you time to build self-hosted infrastructure while live.

### Phase 2: Build Data Center Origin (Months 2-3)

1. **Install MinIO**
```bash
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio && sudo mv minio /usr/local/bin/
minio server /mnt/video-storage --console-address ":9001"
```

2. **Configure NGINX**
```nginx
server {
    listen 443 ssl http2;
    server_name video-origin.laocinema.com;
    
    location /videos/ {
        proxy_pass http://localhost:9000;  # MinIO
        expires 30d;
    }
}
```

3. **Get SSL Certificate**
```bash
sudo certbot --nginx -d video-origin.laocinema.com
```

4. **Update BunnyCDN**
   - Change origin from Bunny Storage to your server
   - Origin URL: `https://video-origin.laocinema.com`

### Phase 3: Migrate Content (Month 4)

1. Upload originals to your MinIO
2. Run transcoding on your server
3. Gradually switch CDN to pull from your origin
4. **Cost drops to ~$1,200-2,000/month**

### Phase 4: Automate (Months 5-6)

1. Set up transcoding queue (BullMQ + Redis)
2. Add monitoring (Prometheus + Grafana)
3. Configure backups
4. Document runbooks

**Total timeline: 4-6 months to full self-hosted**

---

## Key Configuration Examples

### MinIO S3 Configuration

```typescript
// lib/storage/minio.ts
import { S3Client } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT, // http://your-datacenter.com:9000
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

// Same API as AWS S3 - works with existing code
```

### NGINX Rate Limiting

```nginx
# Prevent abuse
limit_req_zone $binary_remote_addr zone=video_limit:10m rate=10r/s;

location /videos/ {
    limit_req zone=video_limit burst=20 nodelay;
    # ... rest of config
}
```

### Transcoding Queue

```typescript
// Use existing convert-to-hls.sh script
import { Queue, Worker } from 'bullmq';

const queue = new Queue('transcoding');

// Add job
await queue.add('transcode', {
  videoId: '123',
  inputPath: '/uploads/movie.mkv',
});

// Worker processes queue
const worker = new Worker('transcoding', async (job) => {
  const { videoId, inputPath } = job.data;
  await exec(`./scripts/convert-to-hls.sh "${inputPath}" "${videoId}"`);
});
```

---

## Monitoring & Operations

### Key Metrics

1. **CDN Cache Hit Rate** - Should be >90%
2. **Origin Bandwidth** - Should be <10% of total
3. **Storage Capacity** - Alert at 80%
4. **Transcoding Queue** - Track backlog
5. **Server Health** - CPU, RAM, disk I/O

### Backup Strategy

**Critical: Original video files**
- Backup to second data center location
- Or: AWS Glacier ($4/TB/month)
- Automated daily incremental

**Transcoded files**
- Can skip backup (regenerate if needed)
- Or: Weekly backup to cloud

### Security

1. **CDN-only access**: Firewall blocks non-CDN IPs
2. **Signed URLs**: Time-limited video access
3. **SSL everywhere**: Let's Encrypt certificates
4. **Monitoring**: Alert on unusual patterns

---

## Cost Projection

### Year 1 (Gradual Migration)

| Quarter | Approach | Monthly Cost | Total |
|---------|----------|--------------|-------|
| Q1      | BunnyCDN only | $100 | $300 |
| Q2      | BunnyCDN only | $500 | $1,500 |
| Q3      | Build infrastructure | $2,000 | $6,000 |
| Q4      | Hybrid (self + CDN) | $1,500 | $4,500 |
| **Year 1** | | | **$12,300** |

### Year 2+ (At Scale - 50TB/month)

- **Self-hosted + CDN**: $2,000/month = $24,000/year
- **Pure CDN**: $6,400/month = $76,800/year
- **Annual Savings: $52,800**

**ROI: Infrastructure pays for itself in Year 2**

---

## Decision Framework

### Choose Pure CDN (Bunny/Cloudflare) If:

✅ Need to launch in <2 weeks  
✅ Traffic <5TB/month  
✅ No DevOps team  
✅ Want hands-off management

### Choose Self-Hosted + CDN If:

✅ Have data center access  
✅ Traffic >5TB/month (or will be)  
✅ Have 1-2 technical staff  
✅ Can invest 2-3 months setup  
✅ Want 70% cost savings long-term

---

## Next Steps

### Recommended Path

1. **Week 1**: Launch with BunnyCDN only (fastest)
2. **Month 2-3**: Build self-hosted origin in parallel
3. **Month 4**: Migrate to hybrid approach
4. **Month 6**: Fully automated and optimized

### Immediate Actions

1. Review data center capabilities
2. Estimate bandwidth costs
3. Calculate staff time available
4. Decide: Pure CDN now → Self-hosted later (recommended)

---

## Additional Documentation

See also:
- `VIDEO_ARCHITECTURE.md` - Full technical architecture
- `VIDEO_STREAMING.md` - Current development setup
- `NEXT_STEPS.md` - Overall roadmap

---

**Recommendation:** Start with BunnyCDN for quick launch, migrate to self-hosted origin after 3-6 months when you have steady traffic and can justify the setup investment.

**Break-even:** ~$52,000/year savings at scale justifies 2-3 months of setup work.
