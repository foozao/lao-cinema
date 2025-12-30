# Content Security Policy Configuration

This document explains the Content Security Policy (CSP) configuration for the Lao Cinema API.

## Overview

The API uses a **strict deny-by-default** CSP policy because it's a pure JSON API that doesn't serve HTML pages, scripts, styles, or other web assets.

## Policy Directives

### Implemented CSP Headers

```http
Content-Security-Policy: 
  default-src 'none';
  connect-src 'self';
  script-src 'none';
  style-src 'none';
  img-src 'none';
  font-src 'none';
  object-src 'none';
  media-src 'none';
  frame-src 'none';
  frame-ancestors 'none';
  form-action 'none';
  base-uri 'self';
  upgrade-insecure-requests;
```

### Directive Explanations

| Directive | Value | Rationale |
|-----------|-------|-----------|
| `default-src` | `'none'` | Block everything by default (deny-first approach) |
| `connect-src` | `'self'` | Allow API to connect to itself for internal requests |
| `script-src` | `'none'` | No JavaScript execution (JSON API doesn't need scripts) |
| `style-src` | `'none'` | No stylesheets (JSON API doesn't serve HTML) |
| `img-src` | `'none'` | No images (JSON API doesn't serve images) |
| `font-src` | `'none'` | No fonts (JSON API doesn't serve fonts) |
| `object-src` | `'none'` | No plugins (Flash, Java, etc.) |
| `media-src` | `'none'` | No audio/video via HTML tags |
| `frame-src` | `'none'` | No iframes allowed |
| `frame-ancestors` | `'none'` | Prevent API from being embedded in frames |
| `form-action` | `'none'` | No form submissions (API doesn't serve forms) |
| `base-uri` | `'self'` | Restrict `<base>` tag to same origin |
| `upgrade-insecure-requests` | enabled | Force HTTP→HTTPS upgrades in production |

## Why This Policy Works for an API

### JSON API Characteristics

1. **No HTML rendering** - Only returns JSON responses
2. **No inline scripts** - No JavaScript execution
3. **No assets** - Doesn't serve images, CSS, fonts, etc.
4. **CORS-enabled** - Frontend makes API calls via `fetch()`

### Security Benefits

1. **XSS Protection** - Even if attacker injects HTML, no scripts can execute
2. **Data Exfiltration Prevention** - Limits where data can be sent
3. **Clickjacking Defense** - `frame-ancestors 'none'` prevents embedding
4. **Defense in Depth** - Works alongside other security headers

### CORS vs CSP

**CORS** controls which origins can *call* the API  
**CSP** controls what the API response can *do* in the browser

They work together:
- CORS: "Only `http://localhost:3000` can call this API"
- CSP: "Even if attacker loads API response in browser, no scripts run"

## Production vs Development

### Production (NODE_ENV=production)
- All CSP directives enabled
- `upgrade-insecure-requests` forces HTTPS
- HSTS enabled for 1 year

### Development (NODE_ENV=development)
- All CSP directives enabled
- `upgrade-insecure-requests` disabled (allow localhost HTTP)
- HSTS disabled (allow localhost HTTP)

## Testing

### Verify CSP Headers

```bash
# Check CSP header in response
curl -I http://localhost:3001/api/health

# Look for:
# Content-Security-Policy: default-src 'none'; connect-src 'self'; ...
```

### Test Suite

All 451 API tests pass with CSP enabled, confirming:
- ✅ No interference with JSON API functionality
- ✅ Proper headers on all responses
- ✅ No CSP violations in normal operation

## Monitoring

### Browser Console

If API responses are ever loaded directly in browser:
1. Open Developer Tools → Console
2. Look for CSP violation warnings
3. Errors indicate blocked resources (expected for JSON API)

### CSP Reports (Future Enhancement)

Can add `report-uri` or `report-to` directive to log violations:

```javascript
contentSecurityPolicy: {
  directives: {
    // ... existing directives
    reportUri: '/api/csp-report',
  },
}
```

## Related Security Headers

CSP works alongside other security headers configured in `@fastify/helmet`:

- **X-Frame-Options: DENY** - Redundant with `frame-ancestors 'none'`
- **X-Content-Type-Options: nosniff** - Prevent MIME sniffing
- **Referrer-Policy: strict-origin-when-cross-origin** - Control referrer info
- **HSTS** (production only) - Force HTTPS for 1 year

## References

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP: CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [@fastify/helmet Documentation](https://github.com/fastify/fastify-helmet)
