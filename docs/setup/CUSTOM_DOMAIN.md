# Custom Domain Setup for Lao Cinema

This guide covers setting up custom domains for your Lao Cinema deployment on GCP Cloud Run.

## Domain Structure

### Recommended Setup (Testing Phase)
```
laocinema.com                → Placeholder "Coming Soon" page
www.laocinema.com            → Redirect to laocinema.com
preview.laocinema.com        → Full web app (for testing)
api.preview.laocinema.com    → API service (for testing)
stream.preview.laocinema.com → Video streaming (for testing)
```

### Production Setup (After Launch)
```
laocinema.com         → Full web app
www.laocinema.com     → Redirect to laocinema.com
api.laocinema.com     → API service
stream.laocinema.com  → Video streaming
```

---

## Prerequisites

1. **Domain registered** (laocinema.com) - via Google Domains, Namecheap, etc.
2. **GCP Project** with Cloud Run services deployed
3. **gcloud CLI** authenticated

---

## Step 1: Create Cloud DNS Zone

```bash
# Set variables
export PROJECT_ID="lao-cinema"
export DOMAIN="laocinema.com"

# Create DNS zone
gcloud dns managed-zones create laocinema-zone \
  --dns-name="$DOMAIN." \
  --description="Lao Cinema DNS zone"

# Get nameservers (you'll need these for your domain registrar)
gcloud dns managed-zones describe laocinema-zone \
  --format="value(nameServers)"
```

**Output will be something like:**
```
ns-cloud-a1.googledomains.com.
ns-cloud-a2.googledomains.com.
ns-cloud-a3.googledomains.com.
ns-cloud-a4.googledomains.com.
```

---

## Step 2: Update Domain Registrar Nameservers

Go to your domain registrar (e.g., Namecheap, Google Domains) and update the nameservers to the ones from Step 1.

**Note**: DNS propagation can take 24-48 hours, but usually completes in 1-2 hours.

---

## Step 3: Map Custom Domains to Cloud Run Services

### Option A: Using gcloud CLI (Recommended)

```bash
export REGION="asia-southeast1"

# Map preview subdomain to web service
gcloud run services update lao-cinema-web \
  --region=$REGION \
  --platform=managed

gcloud beta run domain-mappings create \
  --service=lao-cinema-web \
  --domain=preview.laocinema.com \
  --region=$REGION

# Map API subdomain to API service
gcloud beta run domain-mappings create \
  --service=lao-cinema-api \
  --domain=api.preview.laocinema.com \
  --region=$REGION

# Map video streaming subdomain to video service
gcloud beta run domain-mappings create \
  --service=lao-cinema-video \
  --domain=stream.preview.laocinema.com \
  --region=$REGION
```

### Option B: Using Cloud Console

1. Go to **Cloud Run** → Select your service
2. Click **"Manage Custom Domains"**
3. Click **"Add Mapping"**
4. Enter subdomain (e.g., `preview.laocinema.com`)
5. Select service (`lao-cinema-web`)
6. Click **"Continue"** and follow verification steps

---

## Step 4: Verify Domain Ownership

GCP will provide a TXT record for domain verification:

```bash
# Get verification record
gcloud beta run domain-mappings describe \
  --domain=preview.laocinema.com \
  --region=$REGION
```

Add the TXT record to Cloud DNS:

```bash
# Example TXT record (replace with actual values from GCP)
gcloud dns record-sets create preview.laocinema.com. \
  --zone="laocinema-zone" \
  --type="TXT" \
  --ttl="300" \
  --rrdatas="google-site-verification=ABC123..."
```

---

## Step 5: Add DNS Records

After domain mapping is verified, add the required DNS records:

```bash
# Get the Cloud Run service IPs
gcloud beta run domain-mappings describe \
  --domain=preview.laocinema.com \
  --region=$REGION \
  --format="value(status.resourceRecords)"
```

This will output records like:
```
TYPE: A, RRDATA: 216.239.32.21
TYPE: AAAA, RRDATA: 2001:4860:4802:32::15
```

Add them to Cloud DNS:

```bash
# Add A record for preview subdomain
gcloud dns record-sets create preview.laocinema.com. \
  --zone="laocinema-zone" \
  --type="A" \
  --ttl="300" \
  --rrdatas="216.239.32.21"

# Add AAAA record (IPv6)
gcloud dns record-sets create preview.laocinema.com. \
  --zone="laocinema-zone" \
  --type="AAAA" \
  --ttl="300" \
  --rrdatas="2001:4860:4802:32::15"

# Note: Modern Cloud Run uses CNAME records instead of A/AAAA
# DNS records are auto-created when you add domain mappings
# If you need to create them manually:
gcloud dns record-sets create api.preview.laocinema.com. \
  --zone="laocinema-zone" \
  --type="CNAME" \
  --ttl="300" \
  --rrdatas="ghs.googlehosted.com."

gcloud dns record-sets create stream.preview.laocinema.com. \
  --zone="laocinema-zone" \
  --type="CNAME" \
  --ttl="300" \
  --rrdatas="ghs.googlehosted.com."
```

---

## Step 6: Set Up Placeholder Page (Root Domain)

### Option A: Simple Static Page on Cloud Storage

```bash
# Create bucket for static site
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://laocinema-placeholder

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://laocinema-placeholder

# Enable website configuration
gsutil web set -m index.html -e 404.html gs://laocinema-placeholder

# Upload placeholder page (create this file first)
gsutil cp placeholder/index.html gs://laocinema-placeholder/
```

**Create `placeholder/index.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lao Cinema - Coming Soon</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
        }
        .container {
            max-width: 600px;
            padding: 2rem;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        p {
            font-size: 1.25rem;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 Lao Cinema</h1>
        <p>Coming Soon</p>
        <p style="font-size: 1rem; margin-top: 2rem;">
            A streaming platform for Lao films
        </p>
    </div>
</body>
</html>
```

**Add DNS record for root domain:**
```bash
# Point root domain to Cloud Storage
gcloud dns record-sets create laocinema.com. \
  --zone="laocinema-zone" \
  --type="CNAME" \
  --ttl="300" \
  --rrdatas="c.storage.googleapis.com."
```

### Option B: Deploy Separate Cloud Run Service

```bash
# Deploy minimal placeholder service
gcloud run deploy lao-cinema-placeholder \
  --image=gcr.io/cloudrun/placeholder \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated

# Map to root domain
gcloud beta run domain-mappings create \
  --service=lao-cinema-placeholder \
  --domain=laocinema.com \
  --region=$REGION
```

---

## Step 7: Update Environment Variables

After domain mapping, update your services with the new URLs:

```bash
# Update Web app with new API URL
gcloud run services update lao-cinema-web \
  --region=$REGION \
  --update-env-vars="NEXT_PUBLIC_API_URL=https://api.preview.laocinema.com/api"

# Update API with new CORS origin and video server URL
gcloud run services update lao-cinema-api \
  --region=$REGION \
  --update-env-vars="CORS_ORIGIN=https://preview.laocinema.com,VIDEO_SERVER_URL=https://stream.preview.laocinema.com"

# Update Video server with CORS origins
gcloud run services update lao-cinema-video \
  --region=$REGION \
  --update-env-vars="CORS_ORIGINS=https://preview.laocinema.com"
```

---

## Step 8: Set Up www Redirect

Add CNAME for www subdomain:

```bash
# Redirect www to root domain
gcloud dns record-sets create www.laocinema.com. \
  --zone="laocinema-zone" \
  --type="CNAME" \
  --ttl="300" \
  --rrdatas="laocinema.com."
```

---

## Verification

Test your domains:

```bash
# Check DNS propagation
dig preview.laocinema.com
dig api.preview.laocinema.com
dig stream.preview.laocinema.com
dig laocinema.com

# Test HTTPS (may take a few minutes for SSL cert provisioning)
curl -I https://preview.laocinema.com
curl -I https://api.preview.laocinema.com/health
curl -I https://stream.preview.laocinema.com/health
```

**Note**: Cloud Run automatically provisions SSL certificates for custom domains. This can take 15-30 minutes.

---

## Switching to Production Domains

When ready to go live, simply update the domain mappings:

```bash
# Remove preview mappings
gcloud beta run domain-mappings delete \
  --domain=preview.laocinema.com \
  --region=$REGION

# Add production mappings
gcloud beta run domain-mappings create \
  --service=lao-cinema-web \
  --domain=laocinema.com \
  --region=$REGION

gcloud beta run domain-mappings create \
  --service=lao-cinema-api \
  --domain=api.laocinema.com \
  --region=$REGION

gcloud beta run domain-mappings create \
  --service=lao-cinema-video \
  --domain=stream.laocinema.com \
  --region=$REGION
```

Update DNS records accordingly.

---

## Cost

- **Cloud DNS**: $0.20/zone/month + $0.40/million queries
- **SSL Certificates**: Free (auto-provisioned by Cloud Run)
- **Domain Registration**: Varies by registrar (~$10-15/year)

**Total**: ~$2-3/month for DNS

---

## Troubleshooting

### Domain mapping stuck in "Pending"
- Check domain ownership verification (TXT record)
- Ensure nameservers are updated at registrar
- Wait for DNS propagation (up to 48 hours)

### SSL certificate not provisioning
- Verify DNS records are correct (A/AAAA records)
- Check domain mapping status: `gcloud beta run domain-mappings describe`
- Can take up to 30 minutes for initial provisioning

### CORS errors after domain change
- Update API `CORS_ORIGIN` environment variable
- Redeploy API service if needed
- Clear browser cache

### 404 errors on custom domain
- Verify service is running: `gcloud run services list`
- Check domain mapping: `gcloud beta run domain-mappings list`
- Test with curl: `curl -v https://your-domain.com`

---

## Security Considerations

1. **HTTPS Only**: Cloud Run enforces HTTPS automatically
2. **HTTP Basic Auth**: Already configured in your web app (see `PASSWORD_PROTECTION.md`)
3. **CORS**: Restrict to your specific domains only
4. **Cloud Armor**: Consider adding for DDoS protection (optional)

---

## Domain Structure Benefits

The subdomain-based structure (`api.preview.laocinema.com`) provides several advantages:

1. **Cleaner hierarchy**: Environment is the primary organizational unit
2. **Simpler SSL**: One wildcard cert per environment (`*.preview.laocinema.com`, `*.laocinema.com`)
3. **Easier CORS**: Consistent origin patterns across environments
4. **Better DNS management**: Subdomain delegation is cleaner
5. **Scalable**: Easy to add staging environment (`api.staging.laocinema.com`)

### Alternative: Separate Testing Domain

If you want maximum obscurity, you could register a separate domain:

```
laocinema.com                → Placeholder
laocinema-preview.com        → Full testing site
api.laocinema-preview.com    → API for testing
stream.laocinema-preview.com → Video streaming for testing
```

This keeps testing completely separate from your production domain.

---

## Quick Reference Commands

```bash
# List all domain mappings
gcloud beta run domain-mappings list --region=$REGION

# Describe specific mapping
gcloud beta run domain-mappings describe \
  --domain=preview.laocinema.com \
  --region=$REGION

# Delete mapping
gcloud beta run domain-mappings delete \
  --domain=preview.laocinema.com \
  --region=$REGION

# List DNS records
gcloud dns record-sets list --zone="laocinema-zone"

# Update DNS record
gcloud dns record-sets update preview.laocinema.com. \
  --zone="laocinema-zone" \
  --type="A" \
  --ttl="300" \
  --rrdatas="NEW_IP"
```

---

## Next Steps

1. Register domain (if not already done)
2. Create Cloud DNS zone
3. Update nameservers at registrar
4. Map custom domains to Cloud Run services
5. Create placeholder page
6. Test thoroughly before switching to production domains
