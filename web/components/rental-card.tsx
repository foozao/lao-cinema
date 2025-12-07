'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { Clock, Play, Info } from 'lucide-react';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl } from '@/lib/images';
import { Card } from './ui/card';
import type { Language } from '@/lib/types';
import type { Rental } from '@/lib/api/rentals-client';

interface RentalCardProps {
  rental: Rental;
}

export function RentalCard({ rental }: RentalCardProps) {
  const t = useTranslations('profile.rentals');
  const locale = useLocale() as Language;
  
  const movie = rental.movie;
  if (!movie) return null;
  
  // Handle title - could be LocalizedText object or string
  const title = movie.title 
    ? (typeof movie.title === 'object' ? getLocalizedText(movie.title, locale) : movie.title)
    : movie.original_title || 'Untitled';
  
  // Use getPosterUrl helper for proper URL construction
  const posterUrl = getPosterUrl(movie.poster_path, 'medium') || '/placeholder-poster.png';
  
  // Calculate time remaining or expired
  const now = new Date();
  const expiresAt = new Date(rental.expiresAt);
  const isExpired = expiresAt <= now;
  const timeRemaining = expiresAt.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  // Get movie metadata
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
  const runtime = movie.runtime;
  
  // Calculate watch progress percentage (handle both camelCase and snake_case from API)
  const wp = rental.watchProgress as any;
  const progressSeconds = wp?.progressSeconds ?? wp?.progress_seconds ?? 0;
  const durationSeconds = wp?.durationSeconds ?? wp?.duration_seconds ?? 0;
  const progressPercent = durationSeconds > 0
    ? Math.round((progressSeconds / durationSeconds) * 100)
    : 0;
  
  return (
    <Link href={isExpired ? `/movies/${movie.id}` : `/movies/${movie.id}/watch`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group h-[220px] p-0 border-2 border-gray-200 dark:border-gray-700">
        <div className="flex h-full">
          {/* Poster - Full Height */}
          <div className="relative w-40 h-full flex-shrink-0 bg-gray-200 dark:bg-gray-800">
            <Image
              src={posterUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="192px"
            />
            
            {/* Play button overlay for active rentals */}
            {!isExpired && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
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
            
          </div>

          {/* Content */}
          <div className="flex-1 p-4 flex flex-col">
            {/* Title */}
            <h3 className="font-bold text-lg mb-1 line-clamp-2 text-gray-900 dark:text-white">
              {title}
            </h3>
            
            {/* Movie metadata: Year • Runtime */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
              {year && <span>{year}</span>}
              {year && runtime && <span>•</span>}
              {runtime && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{runtime} min</span>
                </div>
              )}
            </div>
            
            {/* Watch progress bar - always show for active rentals */}
            {!isExpired && (
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
            
            {/* Movie Details link - for active rentals */}
            {!isExpired && (
              <Link
                href={`/movies/${movie.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mt-2"
              >
                <Info className="w-4 h-4" />
                <span>{t('viewDetails')}</span>
              </Link>
            )}
            
            {/* Rent Again CTA - only for expired */}
            {isExpired && (
              <div className="mt-2">
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                  {t('rentAgain')} →
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
