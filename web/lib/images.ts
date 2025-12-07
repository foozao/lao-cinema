/**
 * Image URL helpers for TMDB and custom images
 */

export type ImageType = 'poster' | 'backdrop' | 'profile';
export type ImageSize = 'small' | 'medium' | 'large' | 'original';

/**
 * TMDB image size mappings
 */
const TMDB_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w500',
    large: 'w780',
    original: 'original',
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
  profile: {
    small: 'w45',
    medium: 'w185',
    large: 'h632',
    original: 'original',
  },
} as const;

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Get the full URL for an image
 * 
 * Handles both TMDB images (paths starting with /) and custom hosted images (full URLs)
 * 
 * @param path - Image path from TMDB (e.g., "/abc123.jpg") or full URL
 * @param type - Type of image (poster, backdrop, profile)
 * @param size - Desired size
 * @returns Full image URL or null if no path provided
 * 
 * @example
 * ```ts
 * getImageUrl('/abc123.jpg', 'poster', 'medium')
 * // => 'https://image.tmdb.org/t/p/w500/abc123.jpg'
 * 
 * getImageUrl('https://cdn.example.com/custom.jpg', 'poster', 'medium')
 * // => 'https://cdn.example.com/custom.jpg'
 * ```
 */
export function getImageUrl(
  path: string | null | undefined,
  type: ImageType = 'poster',
  size: ImageSize = 'medium'
): string | null {
  if (!path) return null;

  // If already a full URL (custom hosted image)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // TMDB image - construct URL
  const tmdbSize = TMDB_SIZES[type][size];
  return `${TMDB_IMAGE_BASE}/${tmdbSize}${path}`;
}

/**
 * Get poster URL with specific size
 */
export function getPosterUrl(
  path: string | null | undefined,
  size: ImageSize = 'medium'
): string | null {
  return getImageUrl(path, 'poster', size);
}

/**
 * Get backdrop URL with specific size
 */
export function getBackdropUrl(
  path: string | null | undefined,
  size: ImageSize = 'medium'
): string | null {
  return getImageUrl(path, 'backdrop', size);
}

/**
 * Get profile photo URL with specific size
 */
export function getProfileUrl(
  path: string | null | undefined,
  size: ImageSize = 'medium'
): string | null {
  return getImageUrl(path, 'profile', size);
}

/**
 * Check if an image path is from TMDB or custom hosted
 */
export function isTMDBImage(path: string | null | undefined): boolean {
  if (!path) return false;
  return path.startsWith('/') && !path.startsWith('http');
}

/**
 * Get placeholder image URL for missing images
 */
export function getPlaceholderUrl(type: ImageType = 'poster'): string {
  // You can replace these with actual placeholder images
  const placeholders = {
    poster: '/placeholder-poster.png',
    backdrop: '/placeholder-backdrop.png',
    profile: '/placeholder-profile.png',
  };
  return placeholders[type];
}

