# Security Headers

## Overview

The API server implements security headers via `@fastify/helmet` to protect against common web vulnerabilities.

## Implementation

**Location:** `/api/src/index.ts`

**Package:** `@fastify/helmet@11.1.1` (compatible with Fastify v4)

## Headers Enabled

### 1. HSTS (Strict-Transport-Security)

**Production Only** - Disabled in development for localhost compatibility.

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Configuration:**
- **max-age:** 31536000 seconds (1 year)
- **includeSubDomains:** Apply to all subdomains
- **preload:** Eligible for browser preload lists

**Behavior:**
- Forces browsers to use HTTPS for 1 year after first visit
- Prevents HTTP downgrade attacks
- Only sent in production (`NODE_ENV=production`)

**Development:** Header not sent when `NODE_ENV !== 'production'`, allowing `http://localhost:3001` access.

### 2. X-Frame-Options

```
X-Frame-Options: DENY
```

**Purpose:** Prevents clickjacking attacks by blocking iframe embedding.

**Enabled:** All environments (development and production)

### 3. X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

**Purpose:** Prevents MIME type sniffing, forcing browsers to respect declared Content-Type.

**Enabled:** All environments

### 4. Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

**Purpose:** Controls referrer information sent with requests.

**Behavior:**
- Same origin: Full URL sent
- Cross-origin HTTPS→HTTPS: Origin only
- Cross-origin HTTPS→HTTP: No referrer

**Enabled:** All environments

### 5. X-Permitted-Cross-Domain-Policies

```
X-Permitted-Cross-Domain-Policies: none
```

**Purpose:** Blocks Adobe Flash and PDF cross-domain requests.

**Enabled:** All environments

## Headers NOT Enabled

### Content-Security-Policy (CSP)

**Status:** Disabled

**Reason:** Requires careful configuration per application needs. Can break functionality if misconfigured.

**Future:** Should be enabled with proper directives:
```typescript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
}
```

## Environment Detection

**Development Mode:**
```bash
NODE_ENV=development  # or undefined
```
- HSTS disabled (allows localhost)
- Other headers still active

**Production Mode:**
```bash
NODE_ENV=production
```
- All headers enabled including HSTS
- Forces HTTPS after first visit

## Testing

### Development Test

Start API server locally:
```bash
cd api
npm run dev
```

Check headers (HSTS should NOT be present):
```bash
curl -I http://localhost:3001/health

# Expected response (no HSTS):
HTTP/1.1 200 OK
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
x-permitted-cross-domain-policies: none
content-type: application/json; charset=utf-8
```

### Production Test

Deploy to Cloud Run or set `NODE_ENV=production` locally:
```bash
NODE_ENV=production npm start
```

Check headers (HSTS SHOULD be present):
```bash
curl -I https://api.laocinema.com/health

# Expected response (with HSTS):
HTTP/2 200
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
x-permitted-cross-domain-policies: none
content-type: application/json; charset=utf-8
```

### Browser Test

1. Open Chrome DevTools → Network tab
2. Visit `https://api.laocinema.com/health` (production)
3. Check Response Headers
4. Verify `strict-transport-security` header present
5. Try accessing `http://api.laocinema.com` - should auto-redirect to HTTPS

## HSTS Preload

To add your domain to Chrome's HSTS preload list:

1. **Requirements:**
   - Valid HTTPS certificate
   - All subdomains must support HTTPS
   - Header: `max-age >= 31536000`, `includeSubDomains`, `preload`
   - Redirect HTTP → HTTPS (GCP Load Balancer handles this)

2. **Submit:**
   - Visit https://hstspreload.org/
   - Enter `laocinema.com`
   - Verify requirements
   - Submit domain

3. **Removal:**
   - Takes months to propagate
   - Plan carefully before submitting
   - Removal also takes months

**Recommendation:** Wait until fully confident before preload submission.

## Troubleshooting

### "HSTS not working in development"

**Expected behavior** - HSTS is disabled in development to allow `http://localhost`.

**Verify:**
```bash
echo $NODE_ENV
# Should be empty or "development"
```

### "Can't access localhost after testing production mode"

**Cause:** Browser cached HSTS header from `NODE_ENV=production` test.

**Solution:**
```
Chrome: chrome://net-internals/#hsts
1. Query domain: localhost
2. Delete domain security policies
3. Restart browser
```

### "Getting HSTS errors in production"

**Cause:** HTTPS certificate issue or mixed content.

**Check:**
1. Valid SSL certificate installed
2. No HTTP resources loaded on HTTPS pages
3. All API endpoints accessible via HTTPS
4. Check browser console for mixed content warnings

## Related Documentation

- `/docs/features/AUTH_SECURITY.md` - Authentication security
- `/docs/setup/SECURITY_AUDITS.md` - Dependency security

## Configuration Reference

Full helmet configuration in `/api/src/index.ts`:

```typescript
await fastify.register(helmet, {
  // HSTS - only enable in production
  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } : false,
  
  // Disabled for now
  contentSecurityPolicy: false,
  
  // Enabled in all environments
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
});
```

## Best Practices

1. **Always set NODE_ENV in production deployments**
2. **Test HTTPS locally before deploying** (use ngrok or similar)
3. **Monitor for mixed content warnings** after enabling HSTS
4. **Don't preload until fully tested** (removal is slow)
5. **Keep helmet package updated** for latest security patches

## Update History

- **2024-12-28:** Initial implementation with environment-aware HSTS
- HSTS enabled in production only
- Other security headers enabled in all environments
