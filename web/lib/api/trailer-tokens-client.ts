/**
 * Trailer Token API Client
 * Generates signed URLs for trailer streaming (no rental validation)
 */

import { getAuthHeadersAsync } from './auth-headers';
import { API_BASE_URL } from '../config';
import { ensureCsrfToken } from '../csrf';

export interface SignedTrailerUrlResponse {
  url: string;
  expiresIn: number; // seconds (2 hours)
}

export class TrailerTokenError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'TrailerTokenError';
  }
}

/**
 * Request a signed URL for trailer streaming
 * No rental validation required (trailers are marketing content)
 * 
 * @param trailerId - UUID of the trailer
 * @returns Signed URL and expiration time (2 hours)
 */
export async function getSignedTrailerUrl(trailerId: string): Promise<SignedTrailerUrlResponse> {
  // Ensure CSRF token exists before making POST request
  await ensureCsrfToken();
  
  const url = `${API_BASE_URL}/trailer-tokens`;
  
  // Use async version to ensure anonymous ID is available
  const headers = await getAuthHeadersAsync();
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include', // Send HttpOnly cookies for auth
    body: JSON.stringify({ trailerId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new TrailerTokenError(
      error.error || 'Failed to get signed trailer URL',
      error.code,
      response.status
    );
  }

  return response.json();
}
