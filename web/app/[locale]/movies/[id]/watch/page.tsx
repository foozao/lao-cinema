'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { translateCrewJob } from '@/lib/i18n/translate-crew-job';
import { getBackdropUrl, getPosterUrl } from '@/lib/images';
import { VideoPlayer } from '@/components/video-player';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { AlertCircle, X } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';
import { canWatch, isInGracePeriod, getRemainingGraceTime } from '@/lib/rental-service';
import { useAuth } from '@/lib/auth';
import { getSignedVideoUrl, VideoTokenError } from '@/lib/api/video-tokens-client';
import type { Movie } from '@/lib/types';

// Helper to format grace time
function formatDurationMs(ms: number): string {
  if (ms <= 0) return '';
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const id = params.id as string;
  const { isLoading: authLoading } = useAuth();
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [rentalChecked, setRentalChecked] = useState(false);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [graceTimeRemaining, setGraceTimeRemaining] = useState('');
  const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  // First, load the movie to get its UUID
  useEffect(() => {
    const loadMovie = async () => {
      try {
        const data = await movieAPI.getById(id);
        setMovie(data);
      } catch (error) {
        console.error('Failed to load movie:', error);
        setLoading(false);
      }
    };

    loadMovie();
  }, [id]);

  // Then check rental validity and fetch signed video URL
  useEffect(() => {
    // Wait for auth and movie to load
    if (authLoading || !movie) return;
    
    const checkAccess = async () => {
      try {
        // Use movie.id (UUID) instead of params.id (slug)
        const canAccess = await canWatch(movie.id);
        
        if (!canAccess) {
          // No valid rental and not in grace period - redirect
          router.push(`/movies/${id}?rental=expired`);
          return;
        }
        
        // Check if in grace period
        const gracePeriod = await isInGracePeriod(movie.id);
        setInGracePeriod(gracePeriod);
        
        if (gracePeriod) {
          const graceMs = await getRemainingGraceTime(movie.id);
          setGraceTimeRemaining(formatDurationMs(graceMs));
        }
        
        // Get the primary video source (prefer HLS, fallback to MP4)
        const videoSource =
          movie.video_sources.find((vs) => vs.format === 'hls') ||
          movie.video_sources[0];
        
        if (!videoSource) {
          setVideoError('No video source available');
          setLoading(false);
          return;
        }
        
        // Fetch signed video URL from API
        const { url } = await getSignedVideoUrl(movie.id, videoSource.id);
        setSignedVideoUrl(url);
        
        setRentalChecked(true);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load video:', error);
        
        if (error instanceof VideoTokenError) {
          if (error.code === 'RENTAL_REQUIRED') {
            // Rental expired during loading
            router.push(`/movies/${id}?rental=expired`);
            return;
          }
          setVideoError(error.message);
        } else {
          setVideoError('Failed to load video');
        }
        
        setLoading(false);
      }
    };
    
    checkAccess();
  }, [movie, authLoading, id, router]);

  // Esc key to close info panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showInfo) {
        e.preventDefault();
        setShowInfo(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInfo]);

  // Show blank page during loading
  if (loading) {
    return <div className="min-h-screen bg-black" />;
  }

  if (!movie || videoError) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header variant="dark" />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <p>{videoError || t('common.error')}</p>
        </div>
      </div>
    );
  }

  if (!signedVideoUrl) {
    // Still loading signed URL
    return <div className="min-h-screen bg-black" />;
  }

  // Get the primary video source for metadata
  const videoSource =
    movie.video_sources.find((vs) => vs.format === 'hls') ||
    movie.video_sources[0];

  const title = getLocalizedText(movie.title, locale);
  const overview = getLocalizedText(movie.overview, locale);
  const backdropUrl = getBackdropUrl(movie.backdrop_path, 'large');
  const posterUrl = getPosterUrl(movie.poster_path, 'large');

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <Header variant="dark" fullWidth />

      {/* Grace Period Warning Banner */}
      {inGracePeriod && graceTimeRemaining && (
        <div className="bg-yellow-600/90 text-white px-4 py-3 flex items-center justify-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>
            {t('watch.gracePeriodWarning', { time: graceTimeRemaining })}
          </p>
        </div>
      )}

      {/* Video Player - Constrained to viewport height */}
      <div className="w-full md:flex-1 flex items-center justify-center">
        <VideoPlayer
          src={signedVideoUrl}
          poster={backdropUrl || posterUrl || undefined}
          title={title}
          autoPlay={true}
          videoId={movie.id}
          movieId={movie.id}
          movieTitle={title}
          movieDuration={movie.runtime ? movie.runtime * 60 : undefined}
          constrainToViewport={true}
          aspectRatio={videoSource?.aspect_ratio}
          onInfoClick={() => setShowInfo(true)}
        />
      </div>

      {/* Backdrop overlay for mobile */}
      {showInfo && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 md:hidden animate-in fade-in duration-300"
          onClick={() => setShowInfo(false)}
        />
      )}

      {/* Movie Info Panel - Bottom sheet on mobile, side panel on desktop */}
      {showInfo && (
        <div className="fixed bottom-0 left-0 right-0 md:top-0 md:right-0 md:bottom-0 md:left-auto w-full md:w-96 max-h-[35vh] md:max-h-none bg-gray-900/60 backdrop-blur-sm rounded-t-2xl md:rounded-none z-40 overflow-y-auto animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
          {/* Mobile drag handle */}
          <div className="md:hidden flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-500 rounded-full" />
          </div>
          
          <div className="p-6 pt-3 md:pt-20">
            {/* Movie Title with Close button */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInfo(false)}
                className="text-white hover:bg-white/20 flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-300">
              {movie.release_date && (
                <span>{new Date(movie.release_date).getFullYear()}</span>
              )}
              {movie.runtime && (
                <span>{t('movie.minutes', { count: movie.runtime })}</span>
              )}
            </div>

            {/* Genres */}
            {movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {movie.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300"
                  >
                    {getLocalizedText(genre.name, locale)}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                {t('movie.overview')}
              </h3>
              <p className="text-gray-300 leading-relaxed">{overview}</p>
            </div>

            {/* Director & Writer */}
            {movie.crew.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {t('movie.crew')}
                </h3>
                <div className="space-y-1">
                  {movie.crew
                    .filter((member) => {
                      const job = getLocalizedText(member.job, 'en').toLowerCase();
                      return job === 'director' || job === 'writer' || job === 'screenplay';
                    })
                    .map((member, index) => (
                      <a
                        key={`crew-${member.person.id}-${index}`}
                        href={`/${locale}/people/${member.person.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 text-sm hover:bg-gray-800/50 py-1 px-2 -mx-2 rounded transition-colors group"
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium group-hover:text-red-400 transition-colors">
                            {getLocalizedText(member.person.name, locale)}
                          </p>
                          <p className="text-gray-400">
                            {translateCrewJob(getLocalizedText(member.job, 'en'), t)}
                          </p>
                        </div>
                      </a>
                    ))}
                </div>
              </div>
            )}

            {/* Cast */}
            {movie.cast.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {t('movie.cast')}
                </h3>
                <div className="space-y-1">
                  {movie.cast
                    .sort((a, b) => a.order - b.order)
                    .slice(0, 5)
                    .map((member, index) => (
                      <a
                        key={`cast-${member.person.id}-${index}`}
                        href={`/${locale}/people/${member.person.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 text-sm hover:bg-gray-800/50 py-1 px-2 -mx-2 rounded transition-colors group"
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium group-hover:text-red-400 transition-colors">
                            {getLocalizedText(member.person.name, locale)}
                          </p>
                          <p className="text-gray-400">
                            {getLocalizedText(member.character, locale)}
                          </p>
                        </div>
                      </a>
                    ))}
                </div>
              </div>
            )}

            {/* View Full Details Button */}
            <a
              href={`/${locale}/movies/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full cursor-pointer"
            >
              <Button
                variant="outline"
                className="w-full"
              >
                {t('movie.viewFullDetails')}
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
