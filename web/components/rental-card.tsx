'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { Clock, Play, Info, Package, Film } from 'lucide-react';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl } from '@/lib/images';
import { getMoviePath, getMovieWatchUrl } from '@/lib/movie-url';
import { Card } from './ui/card';
import type { Language } from '@/lib/types';
import type { Rental } from '@/lib/api/rentals-client';

interface RentalCardProps {
  rental: Rental;
}

export function RentalCard({ rental }: RentalCardProps) {
  const t = useTranslations('profile.rentals');
  const tMovie = useTranslations('movie');
  const locale = useLocale() as Language;
  const [imageError, setImageError] = useState(false);
  
  // Determine if this is a pack or movie rental
  const isPack = !!(rental.pack && rental.shortPackId);
  const movie = rental.movie;
  const pack = rental.pack;
  
  // Skip if neither movie nor pack
  if (!movie && !pack) {
    return null;
  }
  
  // Handle title
  const title = isPack
    ? (pack?.title ? getLocalizedText(pack.title, locale) : 'Pack')
    : (movie?.title 
        ? (typeof movie.title === 'object' ? getLocalizedText(movie.title, locale) : movie.title)
        : movie?.original_title || 'Untitled');
  
  // Use getPosterUrl helper for proper URL construction
  const posterPath = isPack ? pack?.posterPath : movie?.poster_path;
  const posterUrl = getPosterUrl(posterPath, 'medium') || '/placeholder-poster.png';
  
  // Calculate time remaining or expired
  const now = new Date();
  const expiresAt = new Date(rental.expiresAt);
  const isExpired = expiresAt <= now;
  const timeRemaining = expiresAt.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  // Get metadata
  const year = !isPack && movie?.release_date ? new Date(movie.release_date).getFullYear() : null;
  const runtime = !isPack && movie?.runtime ? movie.runtime : null;
  
  // Pack metadata
  const shortCount = isPack ? (pack?.short_count ?? (pack as any)?.shortCount ?? 0) : 0;
  const totalRuntime = isPack ? (pack?.total_runtime ?? (pack as any)?.totalRuntime ?? 0) : 0;
  
  // Calculate watch progress percentage (handle both camelCase and snake_case from API)
  const wp = rental.watchProgress as any;
  const progressSeconds = wp?.progressSeconds ?? wp?.progress_seconds ?? 0;
  const durationSeconds = wp?.durationSeconds ?? wp?.duration_seconds ?? 0;
  const progressPercent = durationSeconds > 0
    ? Math.round((progressSeconds / durationSeconds) * 100)
    : 0;
  
  // Generate paths
  const detailPath = isPack
    ? `/short-packs/${pack?.slug || rental.shortPackId}`
    : `/movies/${movie ? getMoviePath(movie) : rental.movieId}`;
  
  const watchPath = isPack
    ? detailPath // For packs, go to pack detail page
    : (movie ? getMovieWatchUrl(movie) : detailPath);
  
  // Render poster collage for packs (same logic as ShortPackCard)
  const renderPosterCollage = () => {
    const shortPosters = ((pack as any)?.short_posters || []).slice(0, 4);
    
    if (shortPosters.length === 0) {
      // No posters - show placeholder
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900 text-white/60">
          <Package className="w-12 h-12 mb-1" />
          <span className="text-xs font-medium">{(pack as any)?.short_count || 0} shorts</span>
        </div>
      );
    }

    if (shortPosters.length === 1) {
      // Single poster
      return (
        <Image
          src={getPosterUrl(shortPosters[0], 'medium') || ''}
          alt=""
          fill
          className="object-cover group-hover/poster:scale-105 transition-transform duration-300"
          sizes="160px"
        />
      );
    }

    if (shortPosters.length === 2) {
      // Two posters side by side
      return (
        <div className="absolute inset-0 flex">
          {shortPosters.map((poster: string, i: number) => (
            <div key={i} className="relative w-1/2 h-full">
              <Image
                src={getPosterUrl(poster, 'small') || ''}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          ))}
        </div>
      );
    }

    if (shortPosters.length === 3) {
      // One large on left, two stacked on right
      return (
        <div className="absolute inset-0 flex">
          <div className="relative w-1/2 h-full">
            <Image
              src={getPosterUrl(shortPosters[0], 'small') || ''}
              alt=""
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="w-1/2 h-full flex flex-col">
            {shortPosters.slice(1).map((poster: string, i: number) => (
              <div key={i} className="relative w-full h-1/2">
                <Image
                  src={getPosterUrl(poster, 'small') || ''}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 4 posters - 2x2 grid
    return (
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
        {shortPosters.map((poster: string, i: number) => (
          <div key={i} className="relative">
            <Image
              src={getPosterUrl(poster, 'small') || ''}
              alt=""
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 h-[220px] p-0 border-2 border-gray-200 dark:border-gray-700 bg-[#ddd] hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700">
      <div className="flex h-full">
        {/* Poster - Clickable to watch/rent */}
        <Link 
          href={isExpired ? detailPath : watchPath}
          className="relative w-40 h-full flex-shrink-0 bg-gray-200 dark:bg-gray-800 group/poster overflow-hidden"
        >
          {isPack ? (
            renderPosterCollage()
          ) : imageError || !posterPath ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 text-white/60">
              <Film className="w-12 h-12 mb-1" />
              <span className="text-xs font-medium text-center px-2">{title}</span>
            </div>
          ) : (
            <Image
              src={posterUrl}
              alt={title}
              fill
              className="object-cover group-hover/poster:scale-105 transition-transform duration-300"
              sizes="192px"
              onError={() => setImageError(true)}
            />
          )}
          
          {/* Play button overlay for active rentals */}
          {!isExpired && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-full p-3">
                <Play className="w-6 h-6 text-blue-600" fill="currentColor" />
              </div>
            </div>
          )}
          
          {/* Status badge */}
          <div className={`absolute bottom-2 left-2 text-xs px-2 py-1 rounded flex items-center gap-1 ${
            isExpired 
              ? 'bg-red-500/90 text-white' 
              : 'bg-green-500/90 text-white'
          }`}>
            {isExpired ? t('expired') : t('active')}
          </div>
        </Link>

        {/* Content - Clickable to details */}
        <Link 
          href={detailPath}
          className="flex-1 p-4 flex flex-col group/info"
        >
            {/* Title */}
            <h3 className="font-bold text-lg mb-1 line-clamp-2 text-gray-900 dark:text-white">
              {title}
            </h3>
            
            {/* Pack badge or Movie metadata */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
              {isPack ? (
                <>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-purple-200">
                    Pack
                  </span>
                  {shortCount > 0 && (
                    <>
                      <span>•</span>
                      <span>{shortCount} shorts</span>
                    </>
                  )}
                  {totalRuntime > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{totalRuntime}m</span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {year && <span>{year}</span>}
                  {year && runtime && <span>•</span>}
                  {runtime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{runtime} {tMovie('min')}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Watch progress bar - show for active rentals (movies and packs) */}
            {!isExpired && progressPercent > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{t('percentWatched', { percent: progressPercent })}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Rental time remaining */}
            <div className="flex items-center gap-2 text-sm mt-auto">
              <Clock className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
              {isExpired ? (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {t('expiredRecently')}
                </span>
              ) : hoursRemaining < 3 ? (
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  {t('rentalExpiresInMinutes', { hours: hoursRemaining, minutes: minutesRemaining })}
                </span>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">
                  {t('rentalExpiresInHours', { hours: hoursRemaining })}
                </span>
              )}
            </div>
            
            {/* View Details hint */}
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-2">
              <Info className="w-4 h-4" />
              <span>{t('viewDetails')}</span>
            </div>
        </Link>
      </div>
    </Card>
  );
}
