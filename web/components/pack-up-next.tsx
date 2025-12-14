'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Package, Clock, Play } from 'lucide-react';
import { shortPacksAPI } from '@/lib/api/client';
import { updatePackPosition } from '@/lib/api/rentals-client';
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
  currentMovieTitle?: string; // Title of the currently playing short
  onPlayNext?: () => void;
  autoPlayDelay?: number; // seconds before auto-play, 0 to disable
  videoEnded?: boolean; // set to true when current video finishes playing
  onCountdownChange?: (countdown: number | null, nextTitle: string | null, onCancel?: () => void, onPlayNow?: () => void) => void;
  onBackToPackChange?: (show: boolean, packUrl: string | null) => void;
}

export function PackUpNext({ movieId, currentMovieTitle, onPlayNext, autoPlayDelay = 10, videoEnded = false, onCountdownChange, onBackToPackChange }: PackUpNextProps) {
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations('shortPacks');
  const router = useRouter();
  const [context, setContext] = useState<PackContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [userCancelled, setUserCancelled] = useState(false);

  useEffect(() => {
    loadContext();
  }, [movieId]);

  // Start countdown only when video ends and user hasn't cancelled
  useEffect(() => {
    if (videoEnded && context?.hasAccess && context?.nextMovie && autoPlayDelay > 0 && countdown === null && !userCancelled) {
      setCountdown(autoPlayDelay);
    }
  }, [videoEnded, context, autoPlayDelay, countdown, userCancelled]);

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
    if (countdown === 0 && context?.nextMovie) {
      // Update pack position before navigating
      if (context.rental?.id && context.nextMovie.id) {
        updatePackPosition(context.rental.id, context.nextMovie.id).catch(err => {
          console.error('Failed to update pack position:', err);
        });
      }
      
      if (onPlayNext) {
        onPlayNext();
      } else {
        // Auto-navigate to next movie if no callback provided
        const nextSlug = context.nextMovie.slug || context.nextMovie.id;
        router.push(`/movies/${nextSlug}/watch`);
      }
    }
  }, [countdown, context?.nextMovie, context?.rental, onPlayNext, router]);

  const loadContext = async () => {
    try {
      setLoading(true);
      const data = await shortPacksAPI.getPackContext(movieId);
      setContext(data);
    } catch (err) {
      console.error('Failed to load pack context:', err);
    } finally {
      setLoading(false);
    }
  };

  const cancelAutoPlay = useCallback(() => {
    setCountdown(null);
    setUserCancelled(true);
  }, []);

  const playNow = useCallback(() => {
    setCountdown(0);
  }, []);

  // Notify parent of countdown changes
  useEffect(() => {
    if (onCountdownChange && context?.nextMovie) {
      const nextTitle = getLocalizedText(context.nextMovie.title, locale);
      onCountdownChange(
        countdown, 
        countdown !== null && countdown > 0 ? nextTitle : null,
        cancelAutoPlay,
        playNow
      );
    } else if (onCountdownChange) {
      onCountdownChange(null, null);
    }
  }, [countdown, context?.nextMovie, locale, onCountdownChange, cancelAutoPlay, playNow]);

  // Notify parent when to show Back to Pack overlay
  useEffect(() => {
    if (onBackToPackChange && context?.pack) {
      const packUrl = `/short-packs/${context.pack.slug || context.pack.id}`;
      onBackToPackChange(userCancelled, packUrl);
    }
  }, [userCancelled, context?.pack, onBackToPackChange]);

  if (loading || !context?.inPack || !context?.hasAccess) {
    return null;
  }

  const packTitle = context.pack?.title ? getLocalizedText(context.pack.title as { en: string; lo?: string }, locale) : '';

  return (
    <div className="bg-black/90 backdrop-blur-sm shadow-lg border-b border-gray-800">
      <div className="flex items-center justify-between gap-2 md:gap-4 px-4 py-2 text-sm">
        {/* Left: Pack info and current short */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Pack badge - hidden on mobile */}
          <Badge className="hidden md:flex bg-gray-800 text-gray-300 text-xs flex-shrink-0">
            <Package className="w-3 h-3 mr-1" />
            {t('packBadge')}
          </Badge>
          <span className="text-gray-400 truncate text-xs md:text-sm">
            {packTitle} • {context.currentIndex}/{context.totalCount}
          </span>
          {currentMovieTitle && (
            <>
              <span className="text-gray-600">•</span>
              <span className="text-gray-300 truncate max-w-[100px] sm:max-w-[150px] md:max-w-[200px] text-xs md:text-sm">
                {currentMovieTitle}
              </span>
            </>
          )}
        </div>

        {/* Center/Right: Navigation */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Previous button */}
          {context.prevMovie && (
            <Link 
              href={`/movies/${context.prevMovie.slug || context.prevMovie.id}/watch`}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              title={`Previous: ${getLocalizedText(context.prevMovie.title, locale)}`}
              onClick={() => {
                if (context.rental?.id && context.prevMovie?.id) {
                  updatePackPosition(context.rental.id, context.prevMovie.id).catch(console.error);
                }
              }}
            >
              <ChevronLeft className="w-4 h-4 text-white/60" />
            </Link>
          )}

          {/* Next info */}
          {context.nextMovie && (
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-gray-500 text-xs">
                <span className="md:hidden">Next:</span>
                <span className="hidden md:inline">Up Next:</span>
              </span>
              <Link 
                href={`/movies/${context.nextMovie.slug || context.nextMovie.id}/watch`}
                className="text-gray-300 hover:text-white hover:underline max-w-[120px] md:max-w-[200px] truncate text-xs md:text-sm"
                onClick={() => {
                  if (context.rental?.id && context.nextMovie?.id) {
                    updatePackPosition(context.rental.id, context.nextMovie.id).catch(console.error);
                  }
                }}
              >
                {getLocalizedText(context.nextMovie.title, locale)}
              </Link>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
