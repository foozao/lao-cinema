'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { translateCrewJob } from '@/lib/i18n/translate-crew-job';
import { getBackdropUrl, getPosterUrl } from '@/lib/images';
import { VideoPlayer } from '@/components/video-player';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { AlertCircle, X } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';
import { canWatch, isInGracePeriod, formatRemainingGraceTime } from '@/lib/rental';
import type { Movie } from '@/lib/types';

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const id = params.id as string;
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [rentalChecked, setRentalChecked] = useState(false);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [graceTimeRemaining, setGraceTimeRemaining] = useState('');

  // Check rental validity on mount
  useEffect(() => {
    const canAccess = canWatch(id);
    
    if (!canAccess) {
      // No valid rental and not in grace period - redirect
      router.push(`/movies/${id}?rental=expired`);
      return;
    }
    
    // Check if in grace period
    const gracePeriod = isInGracePeriod(id);
    setInGracePeriod(gracePeriod);
    
    if (gracePeriod) {
      setGraceTimeRemaining(formatRemainingGraceTime(id));
    }
    
    setRentalChecked(true);
  }, [id, router]);

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

  useEffect(() => {
    // Only load movie if rental is valid
    if (!rentalChecked) return;
    
    const loadMovie = async () => {
      try {
        const data = await movieAPI.getById(id);
        setMovie(data);
      } catch (error) {
        console.error('Failed to load movie:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
  }, [id, rentalChecked]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>{t('common.error')}</p>
      </div>
    );
  }

  // Get the primary video source (prefer HLS, fallback to MP4)
  const videoSource =
    movie.video_sources.find((vs) => vs.format === 'hls') ||
    movie.video_sources[0];

  if (!videoSource) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p>{t('common.error')}</p>
        </div>
      </div>
    );
  }

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
      <div className="flex-1 w-full flex items-center justify-center">
        <VideoPlayer
          src={videoSource.url}
          poster={backdropUrl || posterUrl || undefined}
          title={title}
          autoPlay={true}
          videoId={movie.id}
          movieId={movie.id}
          movieTitle={title}
          movieDuration={movie.runtime ? movie.runtime * 60 : undefined}
          constrainToViewport={true}
          aspectRatio={videoSource.aspect_ratio}
          onInfoClick={() => setShowInfo(true)}
        />
      </div>

      {/* Movie Info Sidebar - Slides in from right */}
      {showInfo && (
        <div className="fixed top-0 right-0 bottom-0 w-full md:w-96 bg-gray-900 z-40 overflow-y-auto animate-in slide-in-from-right">
          <div className="p-6 pt-20">
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
