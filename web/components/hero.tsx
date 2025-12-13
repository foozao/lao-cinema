'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Movie } from '@/lib/types';
import { getLocalizedText } from '@/lib/i18n';
import { getBackdropUrl } from '@/lib/images';
import { getMovieUrl } from '@/lib/movie-url';
import { Play, Info } from 'lucide-react';
import { Button } from './ui/button';

interface HeroProps {
  movie: Movie;
  onLoaded?: () => void;
}

export function Hero({ movie, onLoaded }: HeroProps) {
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const title = getLocalizedText(movie.title, locale);
  const tagline = movie.tagline ? getLocalizedText(movie.tagline, locale) : null;
  const overview = getLocalizedText(movie.overview, locale);
  const backdropUrl = getBackdropUrl(movie.backdrop_path, 'original');
  
  useEffect(() => {
    if (imageLoaded && onLoaded) {
      onLoaded();
    }
  }, [imageLoaded, onLoaded]);

  // Get director
  const director = movie.crew?.find(
    (member) => getLocalizedText(member.job, 'en').toLowerCase() === 'director'
  );

  return (
    <section className="relative w-full h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt={title}
            fill
            priority
            className={`object-cover transition-opacity duration-1000 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
        )}
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full container mx-auto px-4 flex items-end pb-16">
        <div className="max-w-2xl space-y-4 animate-fade-in-up">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg">
            {title}
          </h1>
          
          {/* Tagline */}
          {tagline && (
            <p className="text-xl md:text-2xl text-gray-200 italic drop-shadow">
              "{tagline}"
            </p>
          )}
          
          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-300">
            {movie.release_date && (
              <span>{new Date(movie.release_date).getFullYear()}</span>
            )}
            {movie.runtime && (
              <>
                <span>•</span>
                <span>{movie.runtime} min</span>
              </>
            )}
            {director && (
              <>
                <span>•</span>
                <span>{t('crew.director')}: {getLocalizedText(director.person.name, locale)}</span>
              </>
            )}
          </div>
          
          {/* Overview (truncated) */}
          <p className="text-gray-300 line-clamp-3 max-w-xl">
            {overview}
          </p>
          
          {/* CTAs */}
          <div className="flex gap-3 pt-2">
            <Link href={`${getMovieUrl(movie)}/watch`}>
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-200 gap-2">
                <Play className="w-5 h-5 fill-current" />
                {t('movie.watchNow')}
              </Button>
            </Link>
            <Link href={getMovieUrl(movie)}>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/50 text-white hover:bg-white/20 gap-2"
              >
                <Info className="w-5 h-5" />
                {t('movie.info')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
