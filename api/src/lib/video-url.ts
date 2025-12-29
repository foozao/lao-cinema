/**
 * Get the correct video URL based on environment
 * - Development: Local video server (localhost:3002)
 * - Production: Google Cloud Storage
 * 
 * Only VIDEO_BASE_URL needs to be configured. Trailer URLs are derived from it.
 */

const VIDEO_BASE_URL = process.env.VIDEO_BASE_URL || 'https://storage.googleapis.com/lao-cinema-videos/hls';

// Derive trailer base URL from video base URL
// - If localhost (dev): http://localhost:3002/videos/hls -> http://localhost:3002/trailers/hls
// - If GCS (prod): https://storage.googleapis.com/lao-cinema-videos/hls -> https://storage.googleapis.com/lao-cinema-videos/trailers/hls
function getTrailerBaseUrl(): string {
  // Replace /videos/hls with /trailers/hls (local) or just swap videos->trailers path segment
  return VIDEO_BASE_URL.replace('/videos/hls', '/trailers/hls').replace('lao-cinema-videos/hls', 'lao-cinema-videos/trailers/hls');
}

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

/**
 * Get the full trailer URL for a movie
 * @param trailerSlug - The trailer slug/folder name (e.g., 'the-signal-trailer', 'last-dance-teaser')
 * @param format - The video format ('hls' or 'mp4')
 * @returns Full URL to the trailer file
 */
export function getTrailerUrl(trailerSlug: string, format: 'hls' | 'mp4' = 'hls'): string {
  const trailerBase = getTrailerBaseUrl();
  if (format === 'hls') {
    return `${trailerBase}/${trailerSlug}/master.m3u8`;
  }
  // For MP4, use /trailers/{slug}.mp4 (no /hls/ subfolder)
  return trailerBase.replace('/hls', '') + `/${trailerSlug}.mp4`;
}
