# Anonymous ID Security

## Overview

Anonymous IDs are cryptographically signed tokens issued by the server to identify anonymous users. This prevents client impersonation and ensures data integrity.

## Problem Statement

**Previous Implementation:**
- Client-generated IDs: `anon_{timestamp}_{fingerprint}_{random}`
- No server-side validation
- Risk: Malicious clients could impersonate any anonymous user by setting any `x-anonymous-id` header

**Security Risk:**
- Client A could access Client B's rentals, watch progress, and analytics
- No way to verify ID authenticity
- Data leakage between anonymous users

## Solution: Signed Anonymous IDs

### Architecture

```
┌─────────┐        POST /api/anonymous-id        ┌─────────┐
│ Client  │ ────────────────────────────────────> │   API   │
│         │                                        │         │
│         │ <──────────────────────────────────── │         │
│         │    {anonymousId: "signed_token"}      │         │
└─────────┘                                        └─────────┘
     │                                                   │
     │ Store in localStorage                            │
     │                                                   │
     │ Include in X-Anonymous-Id header                 │
     │                                                   │
     │ Future API requests                              │
     │ ─────────────────────────────────────────────>  │
     │                                                   │
     │                                          Validate HMAC signature
     │                                          Extract UUID for DB queries
     │                                                   │
```

### Token Format

**Signed Token:**
```
{payload_base64url}.{hmac_signature_base64url}
```

**Payload (before encoding):**
```json
{
  "id": "uuid-v4",
  "createdAt": 1704000000,
  "expiresAt": 1711776000
}
```

**Properties:**
- **ID**: Cryptographically random UUID (stored in database)
- **Created At**: Unix timestamp of generation
- **Expires At**: 90 days from creation
- **Signature**: HMAC-SHA256 of encoded payload

### Security Features

1. **Cryptographic Signing**: HMAC-SHA256 prevents tampering
2. **Server-Generated**: Client cannot forge valid IDs
3. **Time-Limited**: IDs expire after 90 days
4. **UUID-Based**: Database stores only the UUID portion
5. **Signature Verification**: Every request validates signature

## Implementation

### Backend (API)

**Generation** (`api/src/lib/anonymous-id.ts`):
```typescript
export function generateAnonymousId(): string {
  const id = crypto.randomUUID();
  const createdAt = Math.floor(Date.now() / 1000);
  const expiresAt = createdAt + (90 * 24 * 60 * 60);
  
  const payload = { id, createdAt, expiresAt };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', ANONYMOUS_SECRET);
  hmac.update(encodedPayload);
  const signature = hmac.digest('base64url');
  
  return `${encodedPayload}.${signature}`;
}
```

**Validation** (`api/src/lib/auth-middleware.ts`):
```typescript
const signedAnonymousId = request.headers['x-anonymous-id'];
if (signedAnonymousId && isValidAnonymousId(signedAnonymousId)) {
  // Extract UUID for database operations
  request.anonymousId = extractAnonymousId(signedAnonymousId);
}
```

**Endpoint** (`api/src/routes/anonymous-id.ts`):
```typescript
POST /api/anonymous-id
Response: {
  "anonymousId": "eyJpZCI6IjEyM...xyz.abc123def456",
  "expiresInDays": 90
}
```

### Frontend (Web)

**Request ID** (`web/lib/anonymous-id.ts`):
```typescript
export async function getAnonymousId(): Promise<string> {
  // Check localStorage cache
  const existing = localStorage.getItem('lao_cinema_anonymous_id');
  if (existing) return existing;
  
  // Request from server
  const response = await fetch(`${API_BASE_URL}/anonymous-id`, {
    method: 'POST',
    credentials: 'include',
  });
  
  const { anonymousId } = await response.json();
  localStorage.setItem('lao_cinema_anonymous_id', anonymousId);
  
  return anonymousId;
}
```

**Usage** (`web/lib/auth/auth-context.tsx`):
```typescript
// Initialize on app load
const anonId = await getAnonymousId();
setAnonymousId(anonId);

// Include in API requests
headers['X-Anonymous-Id'] = anonymousId;
```

## Migration Strategy

### Database Impact

**Before:** Database stored client-generated strings like `anon_1234567890_abc123_random12`

**After:** Database stores only UUID portion: `550e8400-e29b-41d4-a716-446655440000`

**Migration Required:** Yes - existing anonymous data will be orphaned

### Migration Options

**Option 1: Clean Slate (Recommended)**
- Clear all anonymous data (rentals, watch progress)
- Fresh start with secure IDs
- Simple, no data migration needed

**Option 2: Best-Effort Migration**
- Generate signed IDs for existing anonymous users
- Store mapping in migration table
- Complex, may not capture all users

**Recommendation:** Option 1 for MVP. Anonymous data is temporary by nature.

## Environment Variables

**API Server** (`api/.env`):
```bash
# Secret for signing anonymous IDs (change in production!)
ANONYMOUS_ID_SECRET=your-secret-key-here-change-in-production

# Generate secure secret:
# openssl rand -hex 32
```

**Production:** Use a strong random secret (32+ bytes)

## Security Considerations

### ✅ Protections

- **No impersonation**: Client cannot forge valid IDs
- **Tamper-proof**: Signature verification prevents modification
- **Time-limited**: IDs expire after 90 days
- **Server-controlled**: Only server can generate valid IDs
- **Audit trail**: Generation logged for security monitoring

### ⚠️ Limitations

- **Storage**: IDs cached in localStorage (clearable by user)
- **Sharing**: User could share their ID (limited by expiration)
- **Privacy**: UUID is persistent across sessions (by design)

### 🔒 Best Practices

1. **Rotate secret**: Change `ANONYMOUS_ID_SECRET` periodically
2. **Monitor generation**: Track unusual ID request patterns
3. **Enforce expiration**: Server rejects expired IDs
4. **Rate limit**: Endpoint has no auth, add rate limiting if abused
5. **HTTPS only**: Use HTTPS in production for ID transmission

## Testing

### Unit Tests

**Backend** (`api/src/lib/__tests__/anonymous-id.test.ts`):
- ✅ Token generation and validation
- ✅ Signature verification
- ✅ Expiration handling
- ✅ UUID extraction
- ✅ Security (tampering detection)

**Coverage:** 17 tests, all passing

### Integration Tests

**API Route** (`api/src/routes/anonymous-id.test.ts`):
- ✅ POST /api/anonymous-id generates valid IDs
- ✅ IDs are unique per request
- ✅ No authentication required

**Coverage:** 4 tests, all passing

### Manual Testing

1. **Generate ID:**
   ```bash
   curl -X POST http://localhost:3001/api/anonymous-id
   ```

2. **Use in request:**
   ```bash
   curl -H "X-Anonymous-Id: {signed_id}" http://localhost:3001/api/rentals
   ```

3. **Test tampered ID:**
   ```bash
   # Modify payload or signature - should get rejected
   curl -H "X-Anonymous-Id: invalid.signature" http://localhost:3001/api/rentals
   ```

## Monitoring

### Logs to Watch

**API Server:**
```
INFO: Anonymous ID generated: {uuid}
WARN: Invalid anonymous ID provided: {signedId}
WARN: Anonymous ID failed validation: {signedId}
```

### Metrics to Track

- **Generation rate**: IDs/minute
- **Validation failures**: Failed verifications/minute
- **Expired IDs**: How many expired IDs are presented
- **Unique anonymous users**: Count of distinct UUIDs

## Related Files

**Backend:**
- `api/src/lib/anonymous-id.ts` - Generation/validation utilities
- `api/src/routes/anonymous-id.ts` - HTTP endpoint
- `api/src/lib/auth-middleware.ts` - Request validation
- `api/src/lib/__tests__/anonymous-id.test.ts` - Unit tests

**Frontend:**
- `web/lib/anonymous-id.ts` - Client-side ID management
- `web/lib/auth/auth-context.tsx` - ID initialization
- `web/lib/api/auth-headers.ts` - Header inclusion
- `web/lib/api/video-tokens-client.ts` - Usage example

## Troubleshooting

**"Invalid anonymous ID signature"**
- `ANONYMOUS_ID_SECRET` mismatch or not set
- Ensure API has the secret configured

**"Anonymous ID expired"**
- ID older than 90 days
- Frontend should request new ID automatically

**"Failed to generate anonymous ID"**
- API server down or unreachable
- Check network connectivity

**Frontend shows no anonymous ID:**
- Check browser localStorage for `lao_cinema_anonymous_id`
- Check browser console for errors
- Verify API endpoint is accessible
