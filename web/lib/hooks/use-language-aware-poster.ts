import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { MovieImage } from '../types';
import { getLanguageAwarePoster, getImageUrl, ImageSize, ImageType } from '../images';

/**
 * Hook to get language-appropriate poster based on user's locale
 * 
 * @param images - Array of movie images
 * @param type - Type of image ('poster', 'backdrop', 'logo')
 * @param size - Image size to render
 * @returns Full URL to the best matching image
 * 
 * @example
 * ```tsx
 * function MovieCard({ movie }: { movie: Movie }) {
 *   const posterUrl = useLanguageAwarePoster(movie.images, 'poster', 'medium');
 *   return <img src={posterUrl} alt={movie.title.en} />;
 * }
 * ```
 */
export function useLanguageAwarePoster(
  images: MovieImage[] | undefined,
  type: ImageType = 'poster',
  size: ImageSize = 'medium'
): string | null {
  const locale = useLocale() as 'en' | 'lo';
  
  const posterPath = useMemo(() => {
    if (!images) return null;
    return getLanguageAwarePoster(images, type, locale);
  }, [images, type, locale]);
  
  return getImageUrl(posterPath, type, size);
}

/**
 * Hook to get all posters with language information
 * Useful for displaying multiple posters with language badges
 * 
 * @param images - Array of movie images
 * @param type - Type of image ('poster', 'backdrop', 'logo')
 * @returns Array of images with their metadata
 */
export function useLanguagePosters(
  images: MovieImage[] | undefined,
  type: ImageType = 'poster'
): Array<MovieImage & { isUserLanguage: boolean; isNeutral: boolean }> {
  const locale = useLocale() as 'en' | 'lo';
  
  return useMemo(() => {
    if (!images) return [];
    
    return images
      .filter(img => img.type === type)
      .map(img => ({
        ...img,
        isUserLanguage: img.iso_639_1 === locale,
        isNeutral: !img.iso_639_1,
      }))
      .sort((a, b) => {
        // Sort by: user language first, then neutral, then others
        if (a.isUserLanguage && !b.isUserLanguage) return -1;
        if (!a.isUserLanguage && b.isUserLanguage) return 1;
        if (a.isNeutral && !b.isNeutral) return -1;
        if (!a.isNeutral && b.isNeutral) return 1;
        
        // Then by vote average
        return (b.vote_average || 0) - (a.vote_average || 0);
      });
  }, [images, type, locale]);
}
