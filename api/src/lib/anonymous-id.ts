/**
 * Anonymous ID Management
 * 
 * Generates and validates cryptographically signed anonymous IDs.
 * Uses HMAC signature to prevent client impersonation.
 */

import crypto from 'crypto';

const ANONYMOUS_SECRET = process.env.ANONYMOUS_ID_SECRET || 'dev-anonymous-secret-change-in-production';
const ANONYMOUS_ID_EXPIRY_DAYS = 90; // 90 days

export interface AnonymousIdPayload {
  id: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Generate a cryptographically signed anonymous ID
 * 
 * Format: {id}.{signature}
 * - id: Random UUID
 * - signature: HMAC-SHA256 signature
 * 
 * @returns Signed anonymous ID string
 */
export function generateAnonymousId(): string {
  const id = crypto.randomUUID();
  const createdAt = Math.floor(Date.now() / 1000);
  const expiresAt = createdAt + (ANONYMOUS_ID_EXPIRY_DAYS * 24 * 60 * 60);
  
  const payload: AnonymousIdPayload = {
    id,
    createdAt,
    expiresAt,
  };
  
  const dataToSign = JSON.stringify(payload);
  const encodedPayload = Buffer.from(dataToSign).toString('base64url');
  
  // Generate HMAC signature
  const hmac = crypto.createHmac('sha256', ANONYMOUS_SECRET);
  hmac.update(encodedPayload);
  const signature = hmac.digest('base64url');
  
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and decode an anonymous ID
 * 
 * @param anonymousId - Signed anonymous ID to verify
 * @returns Decoded payload if valid
 * @throws Error if invalid or expired
 */
export function verifyAnonymousId(anonymousId: string): AnonymousIdPayload {
  const parts = anonymousId.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid anonymous ID format');
  }
  
  const [encodedPayload, signature] = parts;
  
  // Verify signature
  const hmac = crypto.createHmac('sha256', ANONYMOUS_SECRET);
  hmac.update(encodedPayload);
  const expectedSignature = hmac.digest('base64url');
  
  if (signature !== expectedSignature) {
    throw new Error('Invalid anonymous ID signature');
  }
  
  // Decode and parse payload
  const payloadData = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
  const payload = JSON.parse(payloadData) as AnonymousIdPayload;
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.expiresAt < now) {
    throw new Error('Anonymous ID expired');
  }
  
  return payload;
}

/**
 * Extract the ID portion from a signed anonymous ID
 * Used for database lookups after validation
 */
export function extractAnonymousId(signedAnonymousId: string): string {
  const payload = verifyAnonymousId(signedAnonymousId);
  return payload.id;
}

/**
 * Check if an anonymous ID is valid without throwing
 */
export function isValidAnonymousId(anonymousId: string): boolean {
  try {
    verifyAnonymousId(anonymousId);
    return true;
  } catch {
    return false;
  }
}
