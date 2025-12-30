# Video Security - Signed URLs

## Overview

The video streaming system uses **signed URLs with time-limited tokens** to prevent unauthorized access to video files. Users cannot directly access video URLs without a valid rental.

## Architecture

### Flow

1. **Frontend Request**: Watch page requests signed URL from API
2. **Rental Validation**: API validates active rental for the movie
3. **Token Generation**: API generates HMAC-signed token (15min expiry)
4. **Video Access**: Video server validates token before serving files
5. **Token Expiry**: Tokens expire after 15 minutes, requiring refresh

### Security Features

- ✅ **Rental validation** - Tokens only issued for active rentals
- ✅ **Time-limited** - Tokens expire after 15 minutes
- ✅ **Path-specific** - Token grants access to specific video only
- ✅ **HMAC signature** - Cryptographically signed, cannot be forged
- ✅ **User-bound** - Tokens tied to userId or anonymousId
- ✅ **No direct access** - Video server rejects requests without valid token
- ✅ **Rate limiting** - 30 requests per minute per user/anonymous ID

## Implementation

### Backend API

**Endpoint**: `POST /api/video-tokens`

**Request**:
```json
{
  "movieId": "uuid",
  "videoSourceId": "uuid"
}
```

**Response**:
```json
{
  "url": "http://localhost:3002/videos/hls/movie/master.m3u8?token=...",
  "expiresIn": 900
}
```

**Error Codes**:
- `RENTAL_REQUIRED` - No valid rental found
- `VIDEO_NOT_FOUND` - Video source doesn't exist
- `429 Too Many Requests` - Rate limit exceeded (30 requests/minute)

### Video Server

**Token Validation Hook**: Validates all `/videos/*` requests

**Token Format**: `base64url(payload).hmac_signature`

**Payload**:
```json
{
  "movieId": "uuid",
  "userId": "uuid",
  "anonymousId": "uuid",
  "videoPath": "hls/movie/master.m3u8",
  "exp": 1234567890
}
```

### Frontend

**Client**: `/web/lib/api/video-tokens-client.ts`

**Usage**:
```typescript
import { getSignedVideoUrl } from '@/lib/api/video-tokens-client';

const { url, expiresIn } = await getSignedVideoUrl(movieId, videoSourceId);
// Use signed URL in video player
```

## Configuration

### Environment Variables

**API Server** (`/api/.env`):
```bash
# Video token secret (must match video server)
VIDEO_TOKEN_SECRET=your-secret-key-here

# Video server URL for generating signed URLs
VIDEO_SERVER_URL=http://localhost:3002
```

**Video Server** (`/video-server/.env`):
```bash
# Video token secret (must match API server)
VIDEO_TOKEN_SECRET=your-secret-key-here
```

**Production**: Use a strong random secret (32+ bytes):
```bash
openssl rand -hex 32
```

### CORS Configuration

Video server allows requests from web app origin with `Authorization` header:

```javascript
origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
allowedHeaders: ['Content-Type', 'Range', 'Authorization'],
```

## Token Lifecycle

### Generation
1. User navigates to `/movies/:id/watch`
2. Frontend validates rental via `canWatch()`
3. Frontend requests signed URL from API
4. API validates rental in database
5. API generates token with 15min expiry
6. API returns signed URL

### Validation
1. Video player requests video file with `?token=...`
2. Video server extracts token from query string
3. Video server verifies HMAC signature
4. Video server checks expiration timestamp
5. Video server validates requested path matches token
6. Video server serves file if valid, 401 if invalid

### Expiration
- Tokens expire after **15 minutes**
- HLS players automatically refresh segments
- Each segment request uses the same token
- Frontend should handle token expiry gracefully

## Security Considerations

### ✅ Protections

- **No URL sharing**: Tokens expire quickly and are user-bound
- **No direct access**: Video server requires valid token
- **Rental enforcement**: Tokens only issued for active rentals
- **Path validation**: Token grants access to specific video only
- **Signature verification**: Tokens cannot be forged without secret

### ⚠️ Limitations

- **Token reuse**: Same token works for 15min window
- **Download tools**: Users can download during rental period
- **Screen recording**: Cannot prevent screen capture
- **Grace period**: Users in grace period can still watch

### 🔒 Best Practices

1. **Rotate secrets**: Change `VIDEO_TOKEN_SECRET` periodically
2. **Monitor usage**: Track token generation in analytics
3. **Rate limiting**: 30 requests/minute enforced per user/anonymous ID
4. **Audit logs**: Log token generation for suspicious activity
5. **HTTPS only**: Use HTTPS in production for token transmission

## Testing

### Manual Testing

1. Start API server: `cd api && npm run dev`
2. Start video server: `cd video-server && npm start`
3. Navigate to watch page with valid rental
4. Verify video plays with signed URL
5. Copy video URL and try in new tab (should fail)
6. Wait 15min and try URL again (should fail - expired)

### Error Scenarios

**No rental**:
- Frontend redirects to movie page with `?rental=expired`
- API returns 403 with `RENTAL_REQUIRED` code

**Expired token**:
- Video server returns 401 with `INVALID_TOKEN`
- Player shows error state

**Wrong video path**:
- Video server returns 403 with `INVALID_PATH`

## Migration from Direct URLs

**Before** (insecure):
```typescript
<VideoPlayer src={videoSource.url} />
```

**After** (secure):
```typescript
const { url } = await getSignedVideoUrl(movieId, videoSourceId);
<VideoPlayer src={url} />
```

## Future Enhancements

- [ ] Token refresh endpoint for long viewing sessions
- [x] Rate limiting on token generation (30 requests/minute implemented)
- [ ] Analytics tracking for token usage
- [ ] Watermarking for piracy prevention
- [ ] DRM integration for additional protection
- [ ] IP-based token binding
- [ ] Device fingerprinting

## Related Files

**Backend**:
- `/api/src/lib/video-token.ts` - Token generation/verification
- `/api/src/routes/video-tokens.ts` - Token API endpoint

**Video Server**:
- `/video-server/server.js` - Token validation middleware

**Frontend**:
- `/web/lib/api/video-tokens-client.ts` - API client
- `/web/app/[locale]/movies/[id]/watch/page.tsx` - Usage example

## Troubleshooting

**"Missing video access token"**:
- Token not included in URL query string
- Check frontend is using signed URL from API

**"Invalid video token signature"**:
- `VIDEO_TOKEN_SECRET` mismatch between API and video server
- Ensure both use same secret value

**"Token expired"**:
- Token older than 15 minutes
- Frontend should request new signed URL

**"Token does not grant access to this video"**:
- Requested path doesn't match token payload
- Possible URL manipulation attempt

**CORS errors**:
- Video server CORS not configured for web app origin
- Check `origin` setting in video server
