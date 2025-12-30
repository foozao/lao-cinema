import { isAuthenticated } from '../auth/api-client';
import { getAnonymousId } from '../anonymous-id';
import { API_BASE_URL } from '../config';
import { getCsrfToken, ensureCsrfToken } from '../csrf';

export interface SignedVideoUrlResponse {
  url: string;
  expiresIn: number; // seconds
}

export class VideoTokenError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'VideoTokenError';
  }
}

/**
 * Request a signed URL for video streaming
 * Validates rental status on the backend before issuing token
 */
export async function getSignedVideoUrl(
  movieId: string,
  videoSourceId: string
): Promise<SignedVideoUrlResponse> {
  // Ensure CSRF token exists before making POST request
  await ensureCsrfToken();
  
  const url = `${API_BASE_URL}/video-tokens`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add CSRF token
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  // Add anonymous ID if not logged in (logged-in users use HttpOnly cookies)
  if (!isAuthenticated()) {
    const anonymousId = await getAnonymousId();
    if (anonymousId) {
      headers['x-anonymous-id'] = anonymousId;
    }
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include', // Send HttpOnly cookies for auth
    body: JSON.stringify({
      movieId,
      videoSourceId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new VideoTokenError(
      error.error || 'Failed to get signed video URL',
      error.code,
      response.status
    );
  }

  return response.json();
}
