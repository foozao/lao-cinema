/**
 * Video and Trailer URL Construction Helpers
 * 
 * Centralized logic for building video and trailer URLs based on environment.
 * Uses VIDEO_SERVER_URL as the base for both local and production environments.
 */

const VIDEO_SERVER_URL = process.env.VIDEO_SERVER_URL || 'https://storage.googleapis.com/lao-cinema-videos';

/**
 * Build video URL from a slug
 * 
 * @param slug - Video slug (e.g., 'chanthaly', 'the-signal')
 * @param format - Video format ('hls' or 'mp4')
 * @returns Full video URL
 * 
 * @example
 * // Local: http://localhost:3002/videos/hls/chanthaly/master.m3u8
 * // Prod: https://storage.googleapis.com/lao-cinema-videos/hls/chanthaly/master.m3u8
 */
export function buildVideoUrl(slug: string, format: 'hls' | 'mp4' = 'hls'): string {
  if (format === 'hls') {
    return `${VIDEO_SERVER_URL}/videos/hls/${slug}/master.m3u8`;
  } else {
    return `${VIDEO_SERVER_URL}/videos/${slug}.mp4`;
  }
}

/**
 * Build trailer URL from a slug
 * 
 * @param slug - Trailer slug (e.g., 'chanthaly', 'the-signal')
 * @param format - Video format ('hls' or 'mp4')
 * @returns Full trailer URL
 * 
 * @example
 * // Local: http://localhost:3002/trailers/hls/chanthaly/master.m3u8
 * // Prod: https://storage.googleapis.com/lao-cinema-trailers/hls/chanthaly/master.m3u8
 */
export function buildTrailerUrl(slug: string, format: 'hls' | 'mp4' = 'hls'): string {
  // For production GCS, use separate bucket for trailers
  const trailerServerUrl = VIDEO_SERVER_URL.replace('lao-cinema-videos', 'lao-cinema-trailers');
  
  if (format === 'hls') {
    return `${trailerServerUrl}/trailers/hls/${slug}/master.m3u8`;
  } else {
    return `${trailerServerUrl}/trailers/${slug}.mp4`;
  }
}

/**
 * Build trailer thumbnail URL from a slug or path
 * 
 * @param slugOrPath - Either just the slug (e.g., 'chanthaly') or a full path (e.g., 'chanthaly/thumbnail-1.jpg')
 * @param format - Video format (used to determine default thumbnail location)
 * @returns Full thumbnail URL
 * 
 * @example
 * // With full path: http://localhost:3002/trailers/hls/chanthaly/thumbnail-1.jpg
 * // With slug only: http://localhost:3002/trailers/hls/chanthaly/thumbnail.jpg
 */
export function buildTrailerThumbnailUrl(slugOrPath: string, format: 'hls' | 'mp4' = 'hls'): string {
  const trailerServerUrl = VIDEO_SERVER_URL.replace('lao-cinema-videos', 'lao-cinema-trailers');
  
  if (format === 'hls') {
    // HLS trailers have thumbnails in the HLS directory
    if (slugOrPath.includes('/')) {
      // Full path provided (e.g., 'chanthaly/thumbnail-1.jpg')
      return `${trailerServerUrl}/trailers/hls/${slugOrPath}`;
    } else {
      // Just slug provided - use default thumbnail.jpg
      return `${trailerServerUrl}/trailers/hls/${slugOrPath}/thumbnail.jpg`;
    }
  } else {
    // MP4 trailers have thumbnails at the same level
    if (slugOrPath.includes('/')) {
      return `${trailerServerUrl}/trailers/${slugOrPath}`;
    } else {
      return `${trailerServerUrl}/trailers/${slugOrPath}.jpg`;
    }
  }
}

/**
 * Check if a URL is already a full URL (starts with http/https)
 */
export function isFullUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}
