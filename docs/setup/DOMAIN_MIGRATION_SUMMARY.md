# Domain Migration Summary

## Changes Made

Migration from prefix-based to subdomain-based domain structure completed while maintaining backward compatibility.

### Domain Structure

**Old (Prefix-based):**
- `preview.laocinema.com` → Web app
- `api-preview.laocinema.com` → API
- `stream-preview.laocinema.com` → Video streaming

**New (Subdomain-based):**
- `preview.laocinema.com` → Web app (unchanged)
- `api.preview.laocinema.com` → API
- `stream.preview.laocinema.com` → Video streaming

### Files Modified

1. **`scripts/deploy.sh`**
   - Updated domain configuration to use new subdomain structure
   - Added comments documenting legacy URLs for reference
   - Updated fallback URLs in deployment commands

2. **`scripts/update-cors.sh`**
   - Added clarifying comment about web domain (unchanged)

3. **`web/lib/config.ts`**
   - Added preview environment example to API URL documentation

4. **`docs/setup/ENV_REFERENCE.md`**
   - Updated production examples with both production and preview URLs
   - Added VIDEO_SERVER_URL examples

5. **`docs/setup/BACKEND_SETUP.md`**
   - Added preview environment API URL example

6. **`api/README.md`**
   - Added environment-specific examples for CORS_ORIGIN
   - Added VIDEO_SERVER_URL to required production variables

7. **`docs/setup/DNS_MIGRATION.md`** (NEW)
   - Comprehensive migration guide
   - DNS setup instructions
   - SSL certificate provisioning steps
   - Testing checklist
   - Rollback plan

8. **`docs/setup/DOMAIN_MIGRATION_SUMMARY.md`** (NEW - this file)
   - Summary of all changes

## Next Steps

### 1. DNS Configuration (Required)

Add new DNS records in Google Cloud DNS:

```bash
# Activate correct GCP project
gcloud config configurations activate lao-cinema

# Add new subdomain records
gcloud dns record-sets create api.preview.laocinema.com. \
  --zone=laocinema \
  --type=CNAME \
  --ttl=300 \
  --rrdatas=ghs.googlehosted.com.

gcloud dns record-sets create stream.preview.laocinema.com. \
  --zone=laocinema \
  --type=CNAME \
  --ttl=300 \
  --rrdatas=ghs.googlehosted.com.
```

### 2. SSL Certificates (Required)

In Google Cloud Console:
1. Navigate to: Cloud Run → Domain Mappings
2. Add domain mapping for `api.preview.laocinema.com` → `lao-cinema-api` service
3. Add domain mapping for `stream.preview.laocinema.com` → `lao-cinema-video` service
4. Wait 15-30 minutes for SSL provisioning

### 3. Deploy Services

```bash
# Deploy all services with new URLs
./scripts/deploy.sh --all

# Or deploy individually
./scripts/deploy.sh --api
./scripts/deploy.sh --web
./scripts/deploy.sh --video
```

### 4. Verify Deployment

```bash
# Check DNS propagation
dig api.preview.laocinema.com
dig stream.preview.laocinema.com

# Test SSL and endpoints
curl -I https://api.preview.laocinema.com/health
curl -I https://stream.preview.laocinema.com/health
curl -I https://preview.laocinema.com

# Check Cloud Run logs
gcloud run services logs read lao-cinema-api --region=asia-southeast1 --limit=20
gcloud run services logs read lao-cinema-video --region=asia-southeast1 --limit=20
```

### 5. Test Functionality

- [ ] Browse movies at https://preview.laocinema.com
- [ ] Play videos (check video streaming works)
- [ ] Access admin panel
- [ ] Import from TMDB
- [ ] Check browser console for CORS errors
- [ ] Test on mobile device

### 6. Monitor (30 days)

Keep old DNS records active for 30 days to ensure backward compatibility. After verification period, optionally remove:
- `api-preview.laocinema.com`
- `stream-preview.laocinema.com`

## Rollback Instructions

If issues occur, revert is simple:

1. Edit `scripts/deploy.sh`:
   ```bash
   # Comment out new URLs
   # export CUSTOM_API_DOMAIN="https://api.preview.laocinema.com"
   # export CUSTOM_VIDEO_DOMAIN="https://stream.preview.laocinema.com"
   
   # Uncomment legacy URLs
   export CUSTOM_API_DOMAIN="https://api-preview.laocinema.com"
   export CUSTOM_VIDEO_DOMAIN="https://stream-preview.laocinema.com"
   ```

2. Redeploy:
   ```bash
   ./scripts/deploy.sh --all
   ```

3. Old URLs work immediately (DNS records still active)

## Future Environments

This structure scales cleanly to staging and production:

**Staging:**
```
staging.laocinema.com
api.staging.laocinema.com
stream.staging.laocinema.com
```

**Production:**
```
laocinema.com
api.laocinema.com
stream.laocinema.com
```

Each environment can use a wildcard SSL certificate:
- `*.preview.laocinema.com`
- `*.staging.laocinema.com`
- `*.laocinema.com`

## Benefits Achieved

1. **Cleaner hierarchy** - Environment is primary organizational unit
2. **Simpler SSL** - One wildcard cert per environment
3. **Easier CORS** - Consistent origin patterns
4. **Better DNS** - Cleaner subdomain delegation
5. **Industry standard** - Follows common best practices
6. **Scalable** - Easy to add staging/production environments

## Documentation

Full migration guide: `docs/setup/DNS_MIGRATION.md`
