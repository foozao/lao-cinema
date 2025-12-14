'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ShortPackSummary } from '@/lib/types';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl } from '@/lib/images';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, Film, Package } from 'lucide-react';

interface ShortPackCardProps {
  pack: ShortPackSummary;
}

export function ShortPackCard({ pack }: ShortPackCardProps) {
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations('shortPacks');
  const title = getLocalizedText(pack.title, locale);
  const tagline = pack.tagline ? getLocalizedText(pack.tagline, locale) : null;
  
  // Get short posters for collage (up to 4)
  const shortPosters = (pack.short_posters || []).slice(0, 4);

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };


  // Render poster collage based on number of posters
  const renderPosterCollage = () => {
    if (shortPosters.length === 0) {
      // No posters - show placeholder
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900 text-white/60">
          <Package className="w-12 h-12 mb-1" />
          <span className="text-xs font-medium">{pack.short_count} shorts</span>
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
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="160px"
        />
      );
    }

    if (shortPosters.length === 2) {
      // Two posters side by side
      return (
        <div className="absolute inset-0 flex">
          {shortPosters.map((poster, i) => (
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
            {shortPosters.slice(1).map((poster, i) => (
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
        {shortPosters.map((poster, i) => (
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
    <Link href={`/short-packs/${pack.slug || pack.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group h-full p-0 border-2 border-gray-200 dark:border-gray-700 bg-[#ddd] hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700">
        <div className="flex h-full">
          {/* Poster Collage - Match MovieCard poster width */}
          <div className="relative w-40 h-full flex-shrink-0 bg-gray-200 dark:bg-gray-800 overflow-hidden">
            {renderPosterCollage()}
            
            {/* Pack badge overlay */}
            <div className="absolute top-2 left-2 z-10">
              <Badge className="bg-purple-600/90 text-white text-xs shadow-md">
                <Package className="w-3 h-3 mr-1" />
                {t('packBadge')}
              </Badge>
            </div>
          </div>

          {/* Content - Match MovieCard layout */}
          <div className="flex-1 p-4 flex flex-col">
            {/* Title */}
            <h3 className="font-bold text-xl mb-1 line-clamp-1 dark:text-white">
              {title}
            </h3>
            
            {/* Meta Info */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
              <div className="flex items-center gap-1">
                <Film className="w-3 h-3" />
                <span>{pack.short_count} {pack.short_count === 1 ? t('short') : t('shorts')}</span>
              </div>
              {pack.total_runtime && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatRuntime(pack.total_runtime)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Directors */}
            {pack.directors && pack.directors.length > 0 && (
              <div className="text-sm mb-2">
                <span className="text-gray-500 dark:text-gray-400">
                  {pack.directors.length === 1 ? t('director') : t('directors')}:{' '}
                </span>
                <span className="text-gray-700 dark:text-gray-200">
                  {pack.directors.map(d => getLocalizedText(d, locale)).join(', ')}
                </span>
              </div>
            )}

            {/* Tagline */}
            {tagline && (
              <p className="text-sm text-gray-600 dark:text-gray-300 italic line-clamp-2">
                "{tagline}"
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
