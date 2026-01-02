/**
 * DEPRECATED: Use video-url-helpers.ts instead
 * 
 * This file is kept for backwards compatibility but should not be used.
 * All new code should import from video-url-helpers.ts
 */

import { buildVideoUrl, buildTrailerUrl } from './video-url-helpers.js';

const VIDEO_SERVER_URL = process.env.VIDEO_SERVER_URL || 'https://storage.googleapis.com/lao-cinema-videos';

/**
 * @deprecated Use buildVideoUrl from video-url-helpers.ts
 */
export function getVideoUrl(movieSlug: string): string {
  return buildVideoUrl(movieSlug, 'hls');
}

/**
 * Check if we're using cloud storage
 */
export function isUsingCloudStorage(): boolean {
  return VIDEO_SERVER_URL.includes('storage.googleapis.com');
}

/**
 * Get the base URL for videos
 */
export function getVideoBaseUrl(): string {
  return `${VIDEO_SERVER_URL}/videos/hls`;
}

/**
 * @deprecated Use buildTrailerUrl from video-url-helpers.ts
 */
export function getTrailerUrl(trailerSlug: string, format: 'hls' | 'mp4' = 'hls'): string {
  return buildTrailerUrl(trailerSlug, format);
}
