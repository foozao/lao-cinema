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

/**
 * Get the primary image from a movie's images array
 * Falls back to the first image of that type if no primary is set
 * 
 * @param images - Array of movie images
 * @param type - Type of image to retrieve ('poster', 'backdrop', 'logo')
 * @returns The primary image or null if none found
 */
export function getPrimaryImage(
  images: Array<{ type: string; file_path: string; is_primary?: boolean }> | undefined,
  type: 'poster' | 'backdrop' | 'logo'
): string | null {
  if (!images || images.length === 0) return null;
  
  const typeImages = images.filter(img => img.type === type);
  if (typeImages.length === 0) return null;
  
  // Find primary image
  const primary = typeImages.find(img => img.is_primary);
  if (primary) return primary.file_path;
  
  // Fall back to first image of that type
  return typeImages[0].file_path;
}

/**
 * Get all images of a specific type from a movie's images array
 * 
 * @param images - Array of movie images
 * @param type - Type of image to retrieve ('poster', 'backdrop', 'logo')
 * @returns Array of file paths for that type
 */
export function getImagesByType(
  images: Array<{ type: string; file_path: string }> | undefined,
  type: 'poster' | 'backdrop' | 'logo'
): string[] {
  if (!images || images.length === 0) return [];
  return images.filter(img => img.type === type).map(img => img.file_path);
}

/**
 * Get language-appropriate poster based on user's language preference
 * Fallback order: user language → language-neutral (null) → primary → first available
 * 
 * @param images - Array of movie images
 * @param type - Type of image to retrieve ('poster', 'backdrop', 'logo')
 * @param userLanguage - User's language preference ('en', 'lo', etc.)
 * @returns The best matching image file path or null
 * 
 * @example
 * ```ts
 * // User prefers Lao
 * const poster = getLanguageAwarePoster(movie.images, 'poster', 'lo');
 * // Returns: Lao poster if available, else language-neutral, else primary
 * ```
 */
export function getLanguageAwarePoster(
  images: Array<{ 
    type: string; 
    file_path: string; 
    iso_639_1?: string | null;
    is_primary?: boolean;
    vote_average?: number;
  }> | undefined,
  type: 'poster' | 'backdrop' | 'logo',
  userLanguage: 'en' | 'lo' = 'en'
): string | null {
  if (!images || images.length === 0) return null;
  
  const typeImages = images.filter(img => img.type === type);
  if (typeImages.length === 0) return null;
  
  // 1. Try to find image in user's language
  const userLangImages = typeImages.filter(img => img.iso_639_1 === userLanguage);
  if (userLangImages.length > 0) {
    // Return highest-rated if multiple
    return userLangImages.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))[0].file_path;
  }
  
  // 2. Try language-neutral images (no specific language)
  const neutralImages = typeImages.filter(img => !img.iso_639_1);
  if (neutralImages.length > 0) {
    // Return highest-rated if multiple
    return neutralImages.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))[0].file_path;
  }
  
  // 3. Fall back to primary image
  const primary = typeImages.find(img => img.is_primary);
  if (primary) return primary.file_path;
  
  // 4. Fall back to highest-rated image
  return typeImages.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))[0].file_path;
}
