'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Play, Pause, Info } from 'lucide-react';
import { getLocalizedText } from '@/lib/i18n';
import type { Movie, VideoTrailer } from '@/lib/types';

import Hls from 'hls.js';

function getTmdbImageUrl(path: string | null, size: 'w500' | 'w780' | 'original' = 'original'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

interface HeroSectionProps {
  movie: Movie;
  /** Duration to play trailer before looping (seconds). Default 15. */
  clipDuration?: number;
}

export function HeroSection({ movie, clipDuration = 15 }: HeroSectionProps) {
  const t = useTranslations();
  const locale = useLocale() as 'en' | 'lo';
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasVideoError, setHasVideoError] = useState(false);

  // Find first self-hosted video trailer
  const videoTrailer = movie.trailers?.find(
    (t): t is VideoTrailer => t.type === 'video' && !!t.video_url
  );

  const title = getLocalizedText(movie.title, locale);
  const tagline = movie.tagline ? getLocalizedText(movie.tagline, locale) : null;
  const overview = getLocalizedText(movie.overview, locale);
  const backdropUrl = movie.backdrop_path 
    ? getTmdbImageUrl(movie.backdrop_path, 'original')
    : null;

  // Director from crew
  const director = movie.crew?.find(c => c.department === 'Directing');
  const directorName = director ? getLocalizedText(director.person.name, locale) : null;

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoTrailer?.video_url) return;

    const initHls = () => {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startLevel: 1, // Start with 720p for hero (balance quality/speed)
        });
        
        hls.loadSource(videoTrailer.video_url);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {
            // Autoplay blocked, that's ok - we show poster
          });
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setHasVideoError(true);
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = videoTrailer.video_url;
        video.play().catch(() => {});
      } else {
        setHasVideoError(true);
      }
    };

    initHls();

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [videoTrailer?.video_url]);

  // Loop video at clip duration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= clipDuration) {
        video.currentTime = 0;
      }
    };

    const handleCanPlay = () => {
      setIsVideoReady(true);
    };

    const handleError = () => {
      setHasVideoError(true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [clipDuration]);

  // Auto-pause when scrolled off screen (50% visibility threshold)
  // Using scroll listener for more responsive detection
  useEffect(() => {
    const content = contentRef.current;
    const video = videoRef.current;
    if (!content || !video) return;

    const checkVisibility = () => {
      const rect = content.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Account for fixed header (approximately 120px)
      const headerHeight = 120;
      const effectiveViewportTop = headerHeight;
      
      // Calculate how much of the element is visible (below the header)
      const visibleTop = Math.max(effectiveViewportTop, rect.top);
      const visibleBottom = Math.min(viewportHeight, rect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const ratio = visibleHeight / rect.height;
      
      console.log('Hero visibility:', ratio.toFixed(2), 'rect.top:', rect.top.toFixed(0), 'rect.bottom:', rect.bottom.toFixed(0));
      
      // Pause when less than 50% visible
      if (ratio < 0.5 && !video.paused) {
        console.log('🛑 PAUSING VIDEO - visibility below 0.5');
        video.pause();
        setIsPlaying(false);
      }
    };

    // Check on scroll
    window.addEventListener('scroll', checkVisibility, { passive: true });
    
    // Initial check
    checkVisibility();

    return () => window.removeEventListener('scroll', checkVisibility);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const showVideo = videoTrailer && !hasVideoError;
  const movieUrl = movie.slug ? `/movies/${movie.slug}` : `/movies/${movie.id}`;

  return (
    <section className="relative w-full h-[55vh] overflow-hidden">
      {/* Content area to observe (excludes bottom gradient/line) */}
      <div ref={contentRef} className="absolute inset-0">
        {/* Background: Video or Image */}
        {showVideo ? (
          <>
            {/* Backdrop image as loading placeholder */}
            {backdropUrl && !isVideoReady && (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${backdropUrl})` }}
              />
            )}
            
            {/* Video */}
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                isVideoReady ? 'opacity-100' : 'opacity-0'
              }`}
              muted
              playsInline
              autoPlay
              loop={false}
            />
          </>
        ) : (
          // Fallback to backdrop image
          backdropUrl && (
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${backdropUrl})` }}
            />
          )
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />

        {/* Content overlay */}
        <div className="absolute inset-x-0 bottom-0 pb-4 md:pb-8">
          <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6">
          <div className="max-w-xl md:max-w-2xl">
            {/* Tagline */}
            {tagline && (
              <p className="text-purple-400 text-sm md:text-base font-medium mb-2 tracking-wide uppercase">
                {tagline}
              </p>
            )}

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white/90 mb-2 md:mb-3 leading-tight drop-shadow-lg">
              {title}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-gray-300/80 text-xs md:text-sm mb-2 md:mb-3">
              {movie.release_date && (
                <span>{new Date(movie.release_date).getFullYear()}</span>
              )}
              {movie.runtime && (
                <>
                  <span className="text-gray-600">•</span>
                  <span>{movie.runtime} {t('movie.minutes')}</span>
                </>
              )}
              {directorName && (
                <>
                  <span className="text-gray-600">•</span>
                  <span>{t('movie.directedBy')} {directorName}</span>
                </>
              )}
            </div>

            {/* Overview (truncated) - hidden on mobile */}
            <p className="hidden md:block text-gray-300/70 text-sm line-clamp-2 max-w-lg mb-4">
              {overview}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Link
                href={movieUrl}
                className="inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-white/90 hover:bg-white text-black text-sm md:text-base font-medium rounded-md transition-colors"
              >
                <Info className="w-4 h-4 md:w-5 md:h-5" />
                {t('home.moreInfo')}
              </Link>
              
              {/* Play/Pause button */}
              {showVideo && isVideoReady && (
                <button
                  onClick={togglePlay}
                  className="p-2.5 md:p-3 rounded-full bg-gray-900/60 hover:bg-gray-800/80 text-white transition-colors backdrop-blur-sm border border-gray-700/50 cursor-pointer"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Bottom fade gradient to hint at content below */}
      <div className="absolute bottom-0 inset-x-0 h-24 md:h-32 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
      
      {/* Demarcation line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gray-700/50" />
    </section>
  );
}
