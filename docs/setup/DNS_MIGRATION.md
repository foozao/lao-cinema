# Domain Migration: Prefix to Subdomain Structure

## Overview

Migrating from prefix-based domains to subdomain-based domains for better organization and SSL certificate management.

## Domain Structure Changes

### Old Structure (Prefix-based)
```
preview.laocinema.com          # Web app
api-preview.laocinema.com      # API
stream-preview.laocinema.com   # Video streaming
```

### New Structure (Subdomain-based)
```
preview.laocinema.com          # Web app (unchanged)
api.preview.laocinema.com      # API
stream.preview.laocinema.com   # Video streaming
```

### Future Environments

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

## Benefits

1. **Cleaner hierarchy**: Environment is the primary organizational unit
2. **Simpler SSL**: Wildcard certs per environment (`*.preview.laocinema.com`, `*.staging.laocinema.com`, `*.laocinema.com`)
3. **Easier CORS**: Consistent origin patterns across environments
4. **Better DNS management**: Subdomain delegation is cleaner
5. **Industry standard**: Follows common best practices

## Migration Steps

### Phase 1: DNS Setup (No Downtime)

1. **Add new DNS records** (keep old ones active):

```bash
# Preview environment
api.preview.laocinema.com     → CNAME → ghs.googlehosted.com
stream.preview.laocinema.com  → CNAME → ghs.googlehosted.com
```

2. **Verify DNS propagation**:
```bash
dig api.preview.laocinema.com
dig stream.preview.laocinema.com
```

### Phase 2: SSL Certificates

1. **Request new SSL certificates** in Google Cloud Console:
   - Navigate to: Cloud Run → Domain Mappings
   - Add domain mappings for new subdomains
   - Wait for SSL provisioning (can take 15-30 minutes)

2. **Verify SSL**:
```bash
curl -I https://api.preview.laocinema.com/health
curl -I https://stream.preview.laocinema.com/health
```

### Phase 3: Deploy with New URLs

1. **Update deployment script** (already done):
   - `scripts/deploy.sh` now uses new subdomain structure
   - Old URLs documented as legacy for reference

2. **Deploy services**:
```bash
./scripts/deploy.sh --all
```

3. **Verify services**:
   - Web: https://preview.laocinema.com
   - API: https://api.preview.laocinema.com/health
   - Video: https://stream.preview.laocinema.com/health

### Phase 4: Testing

1. **Test all functionality**:
   - [ ] Browse movies
   - [ ] Watch videos
   - [ ] Admin panel
   - [ ] TMDB imports
   - [ ] Video playback
   - [ ] Cross-origin requests

2. **Monitor logs**:
```bash
gcloud run services logs read lao-cinema-api --region=asia-southeast1 --limit=50
gcloud run services logs read lao-cinema-web --region=asia-southeast1 --limit=50
gcloud run services logs read lao-cinema-video --region=asia-southeast1 --limit=50
```

### Phase 5: Cutover (After Verification)

1. **Update external references**:
   - [ ] Update any bookmarks
   - [ ] Update any documentation
   - [ ] Update any external links

2. **Remove old domain mappings** (optional, after grace period):
   - Keep old URLs active for 30 days for backward compatibility
   - Then remove `api-preview` and `stream-preview` DNS records

## DNS Records Reference

### Current DNS Setup (Google Cloud DNS)

**Zone**: `laocinema`  
**Domain**: `laocinema.com`

**Required Records:**

```
# Preview environment
preview.laocinema.com          A/AAAA  → Cloud Run IP (or CNAME → ghs.googlehosted.com)
api.preview.laocinema.com      CNAME   → ghs.googlehosted.com
stream.preview.laocinema.com   CNAME   → ghs.googlehosted.com

# Legacy (keep for 30 days during migration)
api-preview.laocinema.com      CNAME   → ghs.googlehosted.com
stream-preview.laocinema.com   CNAME   → ghs.googlehosted.com
```

### Adding DNS Records via gcloud

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

## Rollback Plan

If issues arise, rollback is simple:

1. **Revert deployment script**:
```bash
# In scripts/deploy.sh, uncomment legacy domains:
export CUSTOM_API_DOMAIN="https://api-preview.laocinema.com"
export CUSTOM_VIDEO_DOMAIN="https://stream-preview.laocinema.com"
```

2. **Redeploy**:
```bash
./scripts/deploy.sh --all
```

3. **Old URLs will work immediately** (DNS records still active)

## Files Modified

- `scripts/deploy.sh` - Updated domain configuration
- `scripts/update-cors.sh` - Added clarifying comment
- `web/lib/config.ts` - Added preview environment example
- `docs/setup/DNS_MIGRATION.md` - This file (migration guide)

## Verification Checklist

- [ ] DNS records created for new subdomains
- [ ] DNS propagation verified
- [ ] SSL certificates provisioned
- [ ] Services deployed with new URLs
- [ ] All functionality tested
- [ ] Logs monitored for errors
- [ ] Old URLs still functional (backward compatibility)
- [ ] Documentation updated

## Timeline

- **Day 0**: Add DNS records, provision SSL (this phase)
- **Day 1-2**: Deploy and test new URLs
- **Day 3-30**: Monitor and verify stability
- **Day 30+**: Remove old DNS records (optional)

## Support

If issues occur:
1. Check Cloud Run logs
2. Verify DNS with `dig` or `nslookup`
3. Test SSL with `curl -I https://...`
4. Rollback if needed (see Rollback Plan above)
