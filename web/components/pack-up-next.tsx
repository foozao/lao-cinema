'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Package, Clock, Play } from 'lucide-react';
import { shortPacksAPI } from '@/lib/api/client';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl } from '@/lib/images';
import type { Movie } from '@/lib/types';

interface PackContext {
  inPack: boolean;
  hasAccess?: boolean;
  pack?: {
    id: string;
    slug: string;
    title: Record<string, string>;
  };
  currentIndex?: number;
  totalCount?: number;
  prevMovie?: Movie | null;
  nextMovie?: Movie | null;
  rental?: {
    id: string;
    expiresAt: string;
  };
}

interface PackUpNextProps {
  movieId: string;
  onPlayNext?: () => void;
  autoPlayDelay?: number; // seconds before auto-play, 0 to disable
}

export function PackUpNext({ movieId, onPlayNext, autoPlayDelay = 10 }: PackUpNextProps) {
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations('shortPacks');
  const [context, setContext] = useState<PackContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    loadContext();
  }, [movieId]);

  // Auto-play countdown
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Trigger play next when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && context?.nextMovie && onPlayNext) {
      onPlayNext();
    }
  }, [countdown, context?.nextMovie, onPlayNext]);

  const loadContext = async () => {
    try {
      setLoading(true);
      const data = await shortPacksAPI.getPackContext(movieId);
      setContext(data);
      
      // Start countdown if there's a next movie and auto-play is enabled
      if (data.hasAccess && data.nextMovie && autoPlayDelay > 0) {
        setCountdown(autoPlayDelay);
      }
    } catch (err) {
      console.error('Failed to load pack context:', err);
    } finally {
      setLoading(false);
    }
  };

  const cancelAutoPlay = () => {
    setCountdown(null);
  };

  if (loading || !context?.inPack || !context?.hasAccess) {
    return null;
  }

  const packTitle = context.pack?.title ? getLocalizedText(context.pack.title as { en: string; lo?: string }, locale) : '';

  return (
    <div className="bg-gradient-to-r from-purple-900/90 to-indigo-900/90 rounded-lg p-4 backdrop-blur-sm">
      {/* Pack info header */}
      <div className="flex items-center gap-2 mb-3">
        <Badge className="bg-purple-600 text-white text-xs">
          <Package className="w-3 h-3 mr-1" />
          {t('packBadge')}
        </Badge>
        <span className="text-white/80 text-sm">
          {packTitle} • {context.currentIndex}/{context.totalCount}
        </span>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        {/* Previous */}
        {context.prevMovie && (
          <Link 
            href={`/movies/${context.prevMovie.slug || context.prevMovie.id}/watch`}
            className="flex-1 group"
          >
            <div className="flex items-center gap-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <ChevronLeft className="w-5 h-5 text-white/60" />
              <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0">
                {context.prevMovie.poster_path ? (
                  <Image
                    src={getPosterUrl(context.prevMovie.poster_path, 'small') || ''}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <Play className="w-4 h-4 text-gray-500" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/60">Previous</p>
                <p className="text-sm text-white font-medium truncate">
                  {getLocalizedText(context.prevMovie.title, locale)}
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* Next (with auto-play) */}
        {context.nextMovie && (
          <Link 
            href={`/movies/${context.nextMovie.slug || context.nextMovie.id}/watch`}
            className="flex-1 group"
            onClick={onPlayNext}
          >
            <div className="flex items-center gap-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border-2 border-purple-500">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white/60">
                  {countdown !== null && countdown > 0 
                    ? `Playing in ${countdown}s...` 
                    : 'Up Next'
                  }
                </p>
                <p className="text-sm text-white font-medium truncate">
                  {getLocalizedText(context.nextMovie.title, locale)}
                </p>
                {context.nextMovie.runtime && (
                  <p className="text-xs text-white/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {context.nextMovie.runtime}m
                  </p>
                )}
              </div>
              <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0">
                {context.nextMovie.poster_path ? (
                  <Image
                    src={getPosterUrl(context.nextMovie.poster_path, 'small') || ''}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <Play className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                {countdown !== null && countdown > 0 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{countdown}</span>
                  </div>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </div>
          </Link>
        )}
      </div>

      {/* Cancel auto-play button */}
      {countdown !== null && countdown > 0 && (
        <div className="mt-3 text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={cancelAutoPlay}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            Cancel auto-play
          </Button>
        </div>
      )}
    </div>
  );
}
