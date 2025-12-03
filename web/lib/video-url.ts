/**
 * Get the correct video URL based on environment
 * - Development (localhost): Uses local files from /public/videos/hls/
 * - Production (GCP): Uses Google Cloud Storage
 */

const VIDEO_BASE_URL = process.env.NEXT_PUBLIC_VIDEO_BASE_URL || '/videos/hls';

/**
 * Get the full video URL for a movie
 * @param movieSlug - The movie slug/folder name (e.g., 'last-dance', 'the-signal')
 * @returns Full URL to the HLS master playlist
 */
export function getVideoUrl(movieSlug: string): string {
  return `${VIDEO_BASE_URL}/${movieSlug}/master.m3u8`;
}

/**
 * Check if we're using cloud storage
 */
export function isUsingCloudStorage(): boolean {
  return VIDEO_BASE_URL.includes('storage.googleapis.com');
}

/**
 * Get the base URL for videos
 */
export function getVideoBaseUrl(): string {
  return VIDEO_BASE_URL;
}
