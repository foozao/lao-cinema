import { getRawSessionToken } from '../auth/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
  const url = `${API_BASE_URL}/video-tokens`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add auth token if available
  const token = getRawSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
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
