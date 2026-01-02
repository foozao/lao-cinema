'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Play, Pause, Info, VolumeX, Volume2 } from 'lucide-react';
import { getLocalizedText } from '@/lib/i18n';
import { TEXT_LIMITS } from '@/lib/config';
import type { Movie, VideoTrailer } from '@/lib/types';
import { getSignedTrailerUrl } from '@/lib/api/trailer-tokens-client';

import Hls from 'hls.js';

function getTmdbImageUrl(path: string | null, size: 'w500' | 'w780' | 'original' = 'original'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

interface HeroSectionProps {
  movies: Movie[];
  /** Duration to play each trailer before advancing (seconds). Default 15. */
  clipDuration?: number;
}

export function HeroSection({ movies, clipDuration = 15 }: HeroSectionProps) {
  const t = useTranslations();
  const locale = useLocale() as 'en' | 'lo';
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Filter to only movies with local video trailers
  const moviesWithTrailers = movies.filter(m => 
    m.trailers?.some((t): t is VideoTrailer => t.type === 'video' && !!t.video_url)
  );
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Current movie and its trailer
  const movie = moviesWithTrailers[currentIndex] || movies[0];
  const videoTrailer = movie?.trailers?.find(
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

  // Fetch signed URL for current trailer
  useEffect(() => {
    if (!videoTrailer?.id) {
      setSignedUrl(null);
      return;
    }

    setIsLoadingUrl(true);
    setSignedUrl(null);
    setHasVideoError(false);

    getSignedTrailerUrl(videoTrailer.id)
      .then(response => {
        setSignedUrl(response.url);
        setIsLoadingUrl(false);
      })
      .catch(error => {
        console.error('Failed to get signed trailer URL:', error);
        setHasVideoError(true);
        setIsLoadingUrl(false);
      });
  }, [videoTrailer?.id, currentIndex]);

  // Initialize HLS player when signed URL is ready
  useEffect(() => {
    const video = videoRef.current;
    // Wait for signed URL to be ready
    if (!video || !signedUrl) return;

    // Reset state for new video
    setIsVideoReady(false);

    const initHls = () => {
      // Destroy previous instance
      hlsRef.current?.destroy();
      hlsRef.current = null;

      // Get start time for this movie's hero clip
      const startTime = movie.heroStartTime ?? 0;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startLevel: 1, // Start with 720p for hero (balance quality/speed)
          startPosition: startTime, // Start at hero clip position
          xhrSetup: (xhr) => {
            // Send cookies with cross-origin requests for session auth
            xhr.withCredentials = true;
          },
        });
        
        hls.loadSource(signedUrl);
        hls.attachMedia(video);
        
        // Ensure muted for autoplay compliance
        video.muted = true;
        
        // Try to play when we have enough data buffered
        const attemptPlay = () => {
          video.play().catch(() => {
            // Autoplay blocked - retry once on user interaction or canplay
          });
        };
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          attemptPlay();
        });
        
        // Also try on canplay in case manifest parsed fires too early
        video.addEventListener('canplay', attemptPlay, { once: true });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setHasVideoError(true);
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = signedUrl;
        video.muted = true; // Ensure muted for autoplay compliance
        // Wait for video to be seekable before setting start time
        const handleLoadedMetadata = () => {
          if (startTime > 0) {
            video.currentTime = startTime;
          }
          video.play().catch(() => {});
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
      } else {
        setHasVideoError(true);
      }
    };

    initHls();

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [signedUrl, currentIndex]);

  // Advance to next movie at end time or clip duration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Calculate effective end time: use heroEndTime if set, otherwise startTime + clipDuration
    const startTime = movie.heroStartTime ?? 0;
    const endTime = movie.heroEndTime ?? (startTime + clipDuration);

    let transitionScheduled = false;

    const handleTimeUpdate = () => {
      // Guard against multiple transitions
      if (transitionScheduled) return;
      
      if (video.currentTime >= endTime) {
        if (moviesWithTrailers.length > 1) {
          // Transition to next movie
          transitionScheduled = true;
          setIsTransitioning(true);
          setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % moviesWithTrailers.length);
            setTimeout(() => setIsTransitioning(false), 100);
          }, 500); // Wait for fade out
        } else {
          // Only one movie, loop back to start time
          video.currentTime = startTime;
        }
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
  }, [clipDuration, moviesWithTrailers.length, movie.heroStartTime, movie.heroEndTime]);

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
            {/* Dark background while video loads (no image flash) */}
            <div className="absolute inset-0 bg-gray-900" />
            
            {/* Video */}
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                isVideoReady && !isTransitioning ? 'opacity-100' : 'opacity-0'
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
        <div className={`absolute inset-x-0 bottom-0 pb-4 md:pb-8 transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}>
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
            <p className="hidden md:block text-gray-300/70 text-sm max-w-lg mb-4">
              {(() => {
                const { maxLength, graceThreshold, breakSearchRange } = TEXT_LIMITS.heroOverview;
                // Don't truncate if within grace threshold
                if (overview.length <= maxLength + graceThreshold) {
                  return overview;
                }
                // Look for a period or comma within breakSearchRange before maxLength
                const searchStart = maxLength - breakSearchRange;
                const searchArea = overview.slice(searchStart, maxLength);
                const lastBreak = Math.max(searchArea.lastIndexOf('.'), searchArea.lastIndexOf(','));
                if (lastBreak >= 0) {
                  // Found a sentence break - use it
                  return `${overview.slice(0, searchStart + lastBreak + 1).trimEnd()}…`;
                }
                // No sentence break - find the next space after maxLength
                const nextSpace = overview.indexOf(' ', maxLength);
                const breakPoint = nextSpace >= 0 ? nextSpace : maxLength;
                return `${overview.slice(0, breakPoint).trimEnd()}…`;
              })()}
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
              
              {/* Volume/Mute button */}
              {showVideo && isVideoReady && (
                <button
                  onClick={() => {
                    const video = videoRef.current;
                    if (video) {
                      video.muted = !video.muted;
                      setIsMuted(!isMuted);
                    }
                  }}
                  className="p-2.5 md:p-3 rounded-full bg-gray-900/60 hover:bg-gray-800/80 text-white transition-colors backdrop-blur-sm border border-gray-700/50 cursor-pointer"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </button>
              )}
              
              {/* Movie indicators (dots) - only show if multiple trailers */}
              {moviesWithTrailers.length > 1 && (
                <div className="flex items-center gap-1.5 ml-2">
                  {moviesWithTrailers.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (idx !== currentIndex) {
                          setIsTransitioning(true);
                          setTimeout(() => {
                            setCurrentIndex(idx);
                            if (videoRef.current) videoRef.current.currentTime = 0;
                            setTimeout(() => setIsTransitioning(false), 100);
                          }, 300);
                        }
                      }}
                      className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentIndex 
                          ? 'bg-white w-6' 
                          : 'bg-white/40 hover:bg-white/60'
                      }`}
                      aria-label={`View trailer ${idx + 1}`}
                    />
                  ))}
                </div>
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
