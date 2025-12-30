import crypto from 'crypto';

const TOKEN_SECRET = process.env.VIDEO_TOKEN_SECRET || 'dev-secret-change-in-production';
const TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes

export interface VideoTokenPayload {
  movieId: string;
  userId?: string;
  anonymousId?: string;
  videoPath: string; // e.g., "hls/last-dance/master.m3u8"
}

/**
 * Generate a signed token for video access
 * Note: This uses a simple HMAC-based approach for compatibility with video server
 */
export function generateVideoToken(payload: VideoTokenPayload): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
  const dataToSign = JSON.stringify({ ...payload, exp });
  
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
  hmac.update(dataToSign);
  const signature = hmac.digest('base64url');
  
  // Format: base64url(payload).signature
  const encodedPayload = Buffer.from(dataToSign).toString('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a video token
 */
export function verifyVideoToken(token: string): VideoTokenPayload & { exp: number } {
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid video token format');
  }

  const [encodedPayload, signature] = parts;
  
  // Verify signature
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
  const payloadData = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
  hmac.update(payloadData);
  const expectedSignature = hmac.digest('base64url');
  
  if (signature !== expectedSignature) {
    throw new Error('Invalid video token signature');
  }
  
  // Parse and validate payload
  const payload = JSON.parse(payloadData) as VideoTokenPayload & { exp: number };
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Video token expired');
  }
  
  return payload;
}

/**
 * Extract token from query string or header
 */
export function extractToken(url: string, authHeader?: string): string | null {
  // Try query parameter first
  const urlObj = new URL(url, 'http://localhost');
  const token = urlObj.searchParams.get('token');
  if (token) return token;

  // Try Authorization header
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}
