'use client';

import { OptimizedImage as Image } from './optimized-image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Movie } from '@/lib/types';
import { getLocalizedText } from '@/lib/i18n';
import { translateCrewJob } from '@/lib/i18n/translate-crew-job';
import { getPosterUrl } from '@/lib/images';
import { getGenreKey } from '@/lib/genres';
import { getMovieUrl } from '@/lib/movie-url';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, ExternalLink, Calendar, Ban } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations('movie');
  const tCrew = useTranslations('crew');
  const tGenres = useTranslations('genres');
  const title = getLocalizedText(movie.title, locale);
  const tagline = movie.tagline ? getLocalizedText(movie.tagline, locale) : null;
  const posterUrl = getPosterUrl(movie.poster_path, 'medium');
  
  // Get director and writer (with safety checks)
  const director = movie.crew?.find(
    (member) => getLocalizedText(member.job, 'en').toLowerCase() === 'director'
  );
  const writer = movie.crew?.find(
    (member) => {
      const job = getLocalizedText(member.job, 'en').toLowerCase();
      return job === 'writer' || job === 'screenplay';
    }
  );
  
  // Check if director and writer are the same person
  const directorName = director ? getLocalizedText(director.person.name, locale) : null;
  const writerName = writer ? getLocalizedText(writer.person.name, locale) : null;
  const sameDirectorWriter = directorName && writerName && directorName === writerName;
  
  // Get top 3 cast members (with safety checks)
  const topCast = movie.cast
    ? movie.cast
        .sort((a, b) => a.order - b.order)
        .slice(0, 3)
    : [];

  // Get availability badge configuration
  // Only show badges for non-available states (external, unavailable, coming soon)
  const getAvailabilityBadge = () => {
    // Determine status with smart defaults
    let status = movie.availability_status;
    
    // If status is 'auto', use smart defaults
    if (!status || status === 'auto') {
      if (movie.video_sources && movie.video_sources.length > 0) {
        status = 'available'; // Has video sources on our platform
      } else if (movie.external_platforms && movie.external_platforms.length > 0) {
        status = 'external'; // Available on external platforms
      } else {
        status = 'unavailable'; // Not available anywhere
      }
    }
    
    // Don't show badge for available movies (this is the default/expected state)
    if (status === 'available') {
      return null;
    }
    
    switch (status) {
      case 'external':
        return {
          icon: <ExternalLink className="w-3 h-3" />,
          text: t('availabilityStatus.external'),
          className: 'bg-gray-500/80 text-white',
        };
      case 'unavailable':
        return {
          icon: <Ban className="w-3 h-3" />,
          text: t('availabilityStatus.unavailable'),
          className: 'bg-gray-700/90 text-white',
        };
      case 'coming_soon':
        return {
          icon: <Calendar className="w-3 h-3" />,
          text: t('availabilityStatus.comingSoon'),
          className: 'bg-purple-600/90 text-white',
        };
      default:
        return null;
    }
  };

  const availabilityBadge = getAvailabilityBadge();
  
  return (
    <Link href={getMovieUrl(movie)}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group h-full p-0 border-0 sm:border-2 border-gray-200 dark:border-gray-700 bg-transparent sm:bg-[#ddd] hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg sm:rounded-xl">
        {/* Mobile (<640px): Poster-only compact card, Tablet+ (640px+): Side-by-side detailed layout */}
        <div className="flex flex-col sm:flex-row h-full">
          {/* Poster */}
          <div className="relative w-full sm:w-48 aspect-[2/3] sm:aspect-auto sm:h-full flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-lg sm:rounded-none overflow-hidden">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
sizes="(max-width: 640px) 50vw, 192px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                <span className="text-white text-4xl font-bold opacity-50">
                  {title.charAt(0)}
                </span>
              </div>
            )}
            {/* Mobile: Title overlay at bottom of poster */}
            <div className="sm:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 pt-10">
              <h3 className="font-semibold text-sm text-white line-clamp-2 leading-tight">
                {title}
              </h3>
              <div className="flex items-center gap-1 text-xs text-gray-300 mt-0.5">
                {movie.release_date && (
                  <span>{new Date(movie.release_date).getFullYear()}</span>
                )}
                {movie.runtime && (
                  <>
                    <span>•</span>
                    <span>{movie.runtime}m</span>
                  </>
                )}
              </div>
              {directorName && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {directorName}
                </p>
              )}
            </div>
            {/* Availability status badge - top on mobile (to not overlap title), bottom on desktop */}
            {availabilityBadge && (
              <div className={`absolute top-2 sm:top-auto sm:bottom-2 left-2 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded flex items-center gap-1 ${availabilityBadge.className}`}>
                {availabilityBadge.icon}
                <span className="hidden sm:inline">{availabilityBadge.text}</span>
              </div>
            )}
          </div>

          {/* Content - Hidden on mobile (<640px), visible on tablet+ */}
          <div className="hidden sm:flex flex-1 p-3 sm:p-4 flex-col">
            {/* Title */}
            <h3 className="font-bold text-lg md:text-xl mb-1 line-clamp-2 md:line-clamp-1 dark:text-white">
              {title}
            </h3>
            
            {/* Meta Info + Genres - Combined row */}
            <div className="flex items-center gap-2 text-xs mb-2 md:mb-3 flex-wrap">
              {/* Year and Runtime */}
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                {movie.release_date && (
                  <span>{new Date(movie.release_date).getFullYear()}</span>
                )}
                {movie.runtime && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{movie.runtime} {t('min')}</span>
                    </div>
                  </>
                )}
              </div>
              {/* Genres on same row */}
              <div className="flex flex-wrap gap-1">
              {movie.genres?.slice(0, 2).map((genre) => {
                const genreName = getLocalizedText(genre.name, 'en');
                const genreKey = getGenreKey(genreName);
                return (
                  <Badge key={genre.id} variant="secondary" className="text-xs">
                    {tGenres(genreKey)}
                  </Badge>
                );
              })}
                {/* Show 3rd genre only on md+ */}
                {movie.genres?.[2] && (
                  <Badge variant="secondary" className="text-xs hidden md:inline-flex">
                    {tGenres(getGenreKey(getLocalizedText(movie.genres[2].name, 'en')))}
                  </Badge>
                )}
              </div>
            </div>

            {/* Tagline - Hide on mobile for space */}
            {tagline && (
              <p className="hidden md:block text-sm text-gray-600 dark:text-gray-300 italic mb-3 line-clamp-2">
                "{tagline}"
              </p>
            )}

            {/* Director & Writer - Condensed format */}
            <div className="text-sm space-y-0.5 md:space-y-1 mb-2 md:mb-3">
              {director && (
                <div className="flex flex-wrap gap-x-1 md:gap-x-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {sameDirectorWriter ? `${tCrew('director')}/${tCrew('writer')}:` : `${tCrew('director')}:`}
                  </span>
                  <span className="text-gray-700 dark:text-gray-200">
                    {directorName}
                  </span>
                </div>
              )}
              {/* Only show writer separately if different from director */}
              {writer && !sameDirectorWriter && (
                <div className="flex flex-wrap gap-x-1 md:gap-x-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {tCrew('writer')}:
                  </span>
                  <span className="text-gray-700 dark:text-gray-200">
                    {writerName}
                  </span>
                </div>
              )}
            </div>

            {/* Top Cast - Truncate on mobile */}
            {topCast.length > 0 && (
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  {t('cast')}:{' '}
                </span>
                <span className="text-gray-700 dark:text-gray-200">
                  {topCast
                    .map((member) => getLocalizedText(member.person.name, locale))
                    .join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
