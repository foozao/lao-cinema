'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Movie } from '@/lib/types';
import { getLocalizedText } from '@/lib/i18n';
import { translateCrewJob } from '@/lib/i18n/translate-crew-job';
import { getPosterUrl } from '@/lib/images';
import { getGenreKey } from '@/lib/genres';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, ExternalLink } from 'lucide-react';

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
  
  // Get top 3 cast members (with safety checks)
  const topCast = movie.cast
    ? movie.cast
        .sort((a, b) => a.order - b.order)
        .slice(0, 3)
    : [];

  // Check if film is only available externally
  const isExternalOnly = movie.external_platforms && movie.external_platforms.length > 0;
  
  return (
    <Link href={`/movies/${movie.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group h-full p-0 border-2 border-gray-200 dark:border-gray-700">
        <div className="flex h-full">
          {/* Poster - Full Height */}
          <div className="relative w-40 h-full flex-shrink-0 bg-gray-200 dark:bg-gray-800">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="192px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                <span className="text-white text-4xl font-bold opacity-50">
                  {title.charAt(0)}
                </span>
              </div>
            )}
            {/* External-only indicator */}
            {isExternalOnly && (
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                <span>{t('externalOnly')}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 flex flex-col">
            {/* Title */}
            <h3 className="font-bold text-xl mb-1 line-clamp-1 dark:text-white">
              {title}
            </h3>
            
            {/* Meta Info */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
              {movie.release_date && (
                <span>{new Date(movie.release_date).getFullYear()}</span>
              )}
              {movie.runtime && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{movie.runtime} min</span>
                  </div>
                </>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-1 mb-3">
              {movie.genres?.slice(0, 3).map((genre) => {
                const genreName = getLocalizedText(genre.name, 'en');
                const genreKey = getGenreKey(genreName);
                return (
                  <Badge key={genre.id} variant="secondary" className="text-xs">
                    {tGenres(genreKey)}
                  </Badge>
                );
              })}
            </div>

            {/* Tagline */}
            {tagline && (
              <p className="text-sm text-gray-600 dark:text-gray-300 italic mb-3 line-clamp-2">
                "{tagline}"
              </p>
            )}

            {/* Director & Writer */}
            <div className="text-sm space-y-1 mb-3">
              {director && (
                <div className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {tCrew('director')}:
                  </span>
                  <span className="text-gray-700 dark:text-gray-200">
                    {getLocalizedText(director.person.name, locale)}
                  </span>
                </div>
              )}
              {writer && (
                <div className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {tCrew('writer')}:
                  </span>
                  <span className="text-gray-700 dark:text-gray-200">
                    {getLocalizedText(writer.person.name, locale)}
                  </span>
                </div>
              )}
            </div>

            {/* Top Cast */}
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
