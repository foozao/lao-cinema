/**
 * DEPRECATED: Video URLs are now constructed by the API
 * 
 * The frontend should use video URLs directly from the API response.
 * This file is kept for backwards compatibility only.
 */

const VIDEO_SERVER_URL = process.env.NEXT_PUBLIC_VIDEO_SERVER_URL || '/videos/hls';

/**
 * @deprecated Use video URLs from API response instead
 */
export function getVideoUrl(movieSlug: string): string {
  return `${VIDEO_SERVER_URL}/videos/hls/${movieSlug}/master.m3u8`;
}

/**
 * Check if we're using cloud storage
 */
export function isUsingCloudStorage(): boolean {
  return VIDEO_SERVER_URL.includes('storage.googleapis.com');
}

/**
 * @deprecated Use video URLs from API response instead
 */
export function getVideoBaseUrl(): string {
  return `${VIDEO_SERVER_URL}/videos/hls`;
}
