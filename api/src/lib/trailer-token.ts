import crypto from 'crypto';

const TOKEN_SECRET = process.env.VIDEO_TOKEN_SECRET || 'dev-secret-change-in-production';
const TRAILER_TOKEN_EXPIRY_SECONDS = 2 * 60 * 60; // 2 hours (longer than movie tokens)

export interface TrailerTokenPayload {
  trailerId: string;
  movieId: string;
  userId?: string;
  anonymousId?: string;
  trailerPath: string; // e.g., "trailers/hls/chanthaly/master.m3u8"
}

/**
 * Generate a signed token for trailer access
 * Note: No rental validation required for trailers (marketing content)
 */
export function generateTrailerToken(payload: TrailerTokenPayload): string {
  const exp = Math.floor(Date.now() / 1000) + TRAILER_TOKEN_EXPIRY_SECONDS;
  const dataToSign = JSON.stringify({ ...payload, exp });
  
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
  hmac.update(dataToSign);
  const signature = hmac.digest('base64url');
  
  // Format: base64url(payload).signature
  const encodedPayload = Buffer.from(dataToSign).toString('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a trailer token
 * Uses same verification as video tokens (compatible with video server)
 */
export function verifyTrailerToken(token: string): TrailerTokenPayload & { exp: number } {
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid trailer token format');
  }

  const [encodedPayload, signature] = parts;
  
  // Verify signature
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
  const payloadData = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
  hmac.update(payloadData);
  const expectedSignature = hmac.digest('base64url');
  
  if (signature !== expectedSignature) {
    throw new Error('Invalid trailer token signature');
  }
  
  // Parse and validate payload
  const payload = JSON.parse(payloadData) as TrailerTokenPayload & { exp: number };
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Trailer token expired');
  }
  
  return payload;
}
