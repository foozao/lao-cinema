'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { translateCrewJob } from '@/lib/i18n/translate-crew-job';
import { getLanguageName } from '@/lib/i18n/get-language-name';
import { getBackdropUrl, getPosterUrl, getProfileUrl } from '@/lib/images';
import { getGenreKey } from '@/lib/genres';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Calendar, Clock, Star, Play, Ban, Sparkles, AlertCircle } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';
import { PaymentModal, type PaymentReason } from '@/components/payment-modal';
import { StreamingPlatformList } from '@/components/streaming-platform-badge';
import { isRentalValid, purchaseRental, getFormattedRemainingTime, getRecentlyExpiredRental } from '@/lib/rental-service';
import { ShareButton } from '@/components/share-button';
import { getMoviePath } from '@/lib/movie-url';
import { useAuth } from '@/lib/auth';
import { TrailerPlayer } from '@/components/trailer-player';
import type { Movie } from '@/lib/types';

export default function MoviePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const tGenres = useTranslations('genres');
  const id = params.id as string;
  const { isLoading: authLoading } = useAuth();
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentReason, setPaymentReason] = useState<PaymentReason>('default');
  const [hasValidRental, setHasValidRental] = useState(false);
  const [remainingTime, setRemainingTime] = useState('');
  const [recentlyExpired, setRecentlyExpired] = useState<{ expiredAt: Date } | null>(null);

  // Check for rental query param (redirect from watch page)
  useEffect(() => {
    const rentalParam = searchParams.get('rental');
    if (rentalParam === 'required' || rentalParam === 'expired') {
      const reason: PaymentReason = rentalParam === 'expired' ? 'rental_expired' : 'rental_required';
      setPaymentReason(reason);
      setShowPaymentModal(true);
      // Clean up the URL without triggering a navigation
      window.history.replaceState({}, '', `/${locale}/movies/${id}`);
    }
  }, [searchParams, locale, id]);

  useEffect(() => {
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
  }, [id]);

  // Check rental validity on mount and periodically
  useEffect(() => {
    // Wait for auth and movie to initialize before checking rental
    if (authLoading || !movie) return;
    
    const checkRental = async () => {
      // Use the actual movie UUID, not the URL slug
      const valid = await isRentalValid(movie.id);
      setHasValidRental(valid);
      if (valid) {
        const time = await getFormattedRemainingTime(movie.id);
        setRemainingTime(time);
        setRecentlyExpired(null);
      } else {
        // Check if rental recently expired
        const expired = await getRecentlyExpiredRental(movie.id);
        setRecentlyExpired(expired);
      }
    };

    checkRental();
    // Check every minute to update remaining time
    const interval = setInterval(checkRental, 60000);
    return () => clearInterval(interval);
  }, [movie, authLoading]);

  const handleWatchNowClick = async () => {
    if (!movie) return;
    
    const valid = await isRentalValid(movie.id);
    if (valid) {
      // Rental is valid, go directly to watch page
      router.push(`/movies/${id}/watch`);
    } else {
      // No valid rental, show payment modal
      setPaymentReason('default');
      setShowPaymentModal(true);
    }
  };

  const handlePaymentComplete = async () => {
    if (!movie) return;
    
    try {
      // Create the rental via API (use UUID, not slug)
      await purchaseRental(
        movie.id,
        `demo_txn_${Date.now()}`,
        500,
        'demo'
      );
      
      setHasValidRental(true);
      const time = await getFormattedRemainingTime(movie.id);
      setRemainingTime(time);
      setShowPaymentModal(false);
      
      // Navigate to watch page
      router.push(`/movies/${id}/watch`);
    } catch (error) {
      console.error('Failed to create rental:', error);
      alert('Failed to complete rental. Please try again.');
    }
  };

  // Show blank page during loading (progress bar provides feedback)
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black" />;
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <Header variant="dark" />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <p>{t('common.error')}</p>
        </div>
      </div>
    );
  }

  // Get the primary video source (prefer HLS, fallback to MP4)
  const videoSource =
    movie.video_sources.find((vs) => vs.format === 'hls') ||
    movie.video_sources[0];

  // Determine availability status with smart defaults
  let availabilityStatus = movie.availability_status;
  
  // Handle 'auto' mode - determine availability based on what's available
  if (!availabilityStatus || availabilityStatus === 'auto') {
    if (movie.video_sources && movie.video_sources.length > 0) {
      availabilityStatus = 'available';
    } else if (movie.external_platforms && movie.external_platforms.length > 0) {
      availabilityStatus = 'external';
    } else {
      availabilityStatus = 'unavailable';
    }
  }

  const isAvailableOnSite = availabilityStatus === 'available' && videoSource;
  const hasExternalPlatforms = availabilityStatus === 'external' && movie.external_platforms && movie.external_platforms.length > 0;
  const isComingSoon = availabilityStatus === 'coming_soon';
  const isUnavailable = availabilityStatus === 'unavailable';

  const title = getLocalizedText(movie.title, locale);
  const overview = getLocalizedText(movie.overview, locale);
  
  // Get image URLs
  const backdropUrl = getBackdropUrl(movie.backdrop_path, 'large');
  const posterUrl = getPosterUrl(movie.poster_path, 'large');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <Header variant="dark" />

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="mb-8">
          <div className="relative">
              {/* Backdrop Image with Overlay */}
              <div className="absolute inset-0 w-full h-full">
                {backdropUrl ? (
                  <>
                    <img
                      src={backdropUrl}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                    {/* Dark overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-900/80" />
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                )}
              </div>

              {/* Content */}
              <div className="relative container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                  {/* Mobile: Horizontal layout with smaller poster */}
                  <div className="flex md:hidden gap-4 mb-4">
                    {/* Poster - Smaller on mobile */}
                    <div className="flex-shrink-0">
                      <div className="relative w-[120px] aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 shadow-xl">
                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                            <span className="text-white text-3xl font-bold opacity-50">
                              {title.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Title and meta info next to poster on mobile */}
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <h1 className="text-2xl font-bold mb-2 line-clamp-2">{title}</h1>
                      
                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {movie.release_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{new Date(movie.release_date).getFullYear()}</span>
                          </div>
                        )}
                        {movie.runtime && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{movie.runtime}m</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Genres on mobile */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {movie.genres.slice(0, 2).map((genre) => {
                          const genreName = getLocalizedText(genre.name, 'en');
                          const genreKey = getGenreKey(genreName);
                          return (
                            <Badge key={genre.id} variant="secondary" className="text-xs px-2 py-0.5">
                              {tGenres(genreKey)}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Desktop: Poster on left */}
                  <div className="hidden md:block flex-shrink-0">
                    <div className="relative w-[300px] aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 shadow-2xl">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                          <span className="text-white text-6xl font-bold opacity-50">
                            {title.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Movie Info - Right Side (Desktop) / Full Width (Mobile) */}
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <h1 className="hidden md:block text-3xl md:text-4xl lg:text-5xl font-bold mb-4">{title}</h1>

                    {/* Meta Info - Desktop only */}
                    <div className="hidden md:flex flex-wrap items-center gap-4 mb-6 text-sm md:text-base">
                      {movie.release_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{new Date(movie.release_date).getFullYear()}</span>
                        </div>
                      )}
                      {movie.runtime && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{t('movie.minutes', { count: movie.runtime })}</span>
                        </div>
                      )}
                    </div>

                    {/* Genres - Desktop only */}
                    <div className="hidden md:flex flex-wrap gap-2 mb-6">
                      {movie.genres.map((genre) => {
                        const genreName = getLocalizedText(genre.name, 'en');
                        const genreKey = getGenreKey(genreName);
                        return (
                          <Badge key={genre.id} variant="secondary" className="text-sm">
                            {tGenres(genreKey)}
                          </Badge>
                        );
                      })}
                    </div>

                    {/* Overview */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">{t('movie.overview')}</h3>
                      <p className="text-gray-200 leading-relaxed">
                        {overview}
                      </p>
                    </div>

                    {/* Watch Now Button or Status Message */}
                    <div className="flex flex-col gap-3">
                      {isAvailableOnSite ? (
                        <>
                          <div className="flex gap-3">
                            <Button
                              size="lg"
                              onClick={handleWatchNowClick}
                              className="gap-2 text-base md:text-lg px-6 md:px-8 py-5 md:py-6 bg-red-600 hover:bg-red-700"
                            >
                              <Play className="w-5 h-5 md:w-6 md:h-6 fill-white" />
                              {t('movie.watchNow')}
                            </Button>
                            <ShareButton
                              path={`/movies/${getMoviePath(movie)}`}
                              title={title}
                              size="lg"
                              variant="secondary"
                              className="px-6 md:px-8 py-5 md:py-6"
                            />
                          </div>
                          {hasValidRental && remainingTime && (
                            <p className="text-sm text-green-400">
                              {t('payment.rentalActive')} • {t('payment.expiresIn', { time: remainingTime })}
                            </p>
                          )}
                          {!hasValidRental && recentlyExpired && (
                            <div className="flex items-center gap-2 text-sm text-amber-400">
                              <AlertCircle className="w-4 h-4" />
                              <span>{t('payment.recentlyExpired')}</span>
                            </div>
                          )}
                        </>
                      ) : hasExternalPlatforms ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-300">
                            {t('movie.availableOn')}
                          </p>
                          <StreamingPlatformList platforms={movie.external_platforms!} size="lg" />
                          <ShareButton
                            path={`/movies/${getMoviePath(movie)}`}
                            title={title}
                            variant="secondary"
                          />
                        </div>
                      ) : isComingSoon ? (
                        <div className="space-y-3">
                          <div className="bg-purple-600/20 border border-purple-600/50 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-semibold text-purple-200 mb-1">
                                  {t('movie.availabilityStatus.comingSoon')}
                                </h4>
                                <p className="text-sm text-purple-300">
                                  {t('movie.comingSoonMessage')}
                                </p>
                              </div>
                            </div>
                          </div>
                          <ShareButton
                            path={`/movies/${getMoviePath(movie)}`}
                            title={title}
                            variant="secondary"
                          />
                        </div>
                      ) : isUnavailable ? (
                        <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Ban className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-gray-200 mb-1">
                                {t('movie.availabilityStatus.unavailable')}
                              </h4>
                              <p className="text-sm text-gray-400">
                                {t('movie.unavailableMessage')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </section>

        <div className="container mx-auto px-4">

        {/* Detailed Info Section */}
        <section className="grid md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2">

            {/* Trailer */}
            {movie.trailers && movie.trailers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-3">{t('movie.trailer')}</h3>
                <TrailerPlayer
                  trailer={movie.trailers[0]}
                  className="w-full aspect-video"
                />
              </div>
            )}

            {/* Cast */}
            {movie.cast.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold">
                    {t('movie.cast')}
                  </h3>
                  <Link href={`/movies/${id}/cast-crew`}>
                    <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                      {t('movie.viewAll')} →
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {movie.cast
                    .sort((a, b) => a.order - b.order)
                    .slice(0, 6)
                    .map((member, index) => {
                      const profileUrl = getProfileUrl(member.person.profile_path, 'small');
                      const memberName = getLocalizedText(member.person.name, 'en');
                      return (
                        <Link
                          key={`cast-${member.person.id}-${index}`}
                          href={`/people/${member.person.id}`}
                          className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors"
                        >
                          {profileUrl ? (
                            <img
                              src={profileUrl}
                              alt={memberName}
                              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-2xl font-bold text-gray-400">
                                {memberName.charAt(0)}
                              </span>
                            </div>
                          )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {getLocalizedText(member.person.name, locale)}
                          </p>
                          <p className="text-sm text-gray-400 truncate">
                            {getLocalizedText(member.character, locale)}
                          </p>
                        </div>
                      </Link>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Crew */}
            {movie.crew.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold">{t('movie.crew')}</h3>
                  <Link href={`/movies/${id}/cast-crew`}>
                    <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                      {t('movie.viewAll')} →
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {movie.crew
                    .filter((member) => {
                      const job = getLocalizedText(member.job, 'en').toLowerCase();
                      return job === 'director' || job === 'writer' || job === 'screenplay';
                    })
                    .map((member, index) => {
                      const profileUrl = getProfileUrl(member.person.profile_path, 'small');
                      const memberName = getLocalizedText(member.person.name, 'en');
                      return (
                        <Link
                          key={`crew-${member.person.id}-${index}`}
                          href={`/people/${member.person.id}`}
                          className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors"
                        >
                          {profileUrl ? (
                            <img
                              src={profileUrl}
                              alt={memberName}
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-lg font-bold text-gray-400">
                                {memberName.charAt(0)}
                              </span>
                            </div>
                          )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {getLocalizedText(member.person.name, locale)}
                          </p>
                          <p className="text-sm text-gray-400 truncate">
                            {translateCrewJob(getLocalizedText(member.job, 'en'), t)}
                          </p>
                        </div>
                      </Link>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1">
            {/* Additional Info */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
              {/* Status */}
              {movie.status && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('movie.status')}</p>
                  <p className="font-medium">{movie.status}</p>
                </div>
              )}

              {/* Release Date */}
              {movie.release_date && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('movie.releaseDate')}</p>
                  <p className="font-medium">
                    {new Date(movie.release_date).toLocaleDateString(locale, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}

              {/* Production Companies */}
              {movie.production_companies && movie.production_companies.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('movie.productionCompanies')}</p>
                  <div className="space-y-2">
                    {movie.production_companies.map((company) => {
                      const companyName = typeof company.name === 'string' 
                        ? company.name 
                        : (company.name?.en || company.name?.lo || 'Unknown');
                      return (
                        <Link
                          key={company.id}
                          href={`/production/${company.id}`}
                          className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                        >
                          {company.logo_path && (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${company.logo_path}`}
                              alt={companyName}
                              className="h-4 w-auto object-contain"
                            />
                          )}
                          <span className="text-sm font-medium">{companyName}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Original Language */}
              {movie.original_language && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('movie.originalLanguage')}</p>
                  <p className="font-medium">{getLanguageName(movie.original_language, t)}</p>
                </div>
              )}

              {/* Production Countries */}
              {movie.production_countries && movie.production_countries.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('movie.productionCountries')}</p>
                  <p className="font-medium">
                    {movie.production_countries.map(c => c.name).join(', ')}
                  </p>
                </div>
              )}

              {/* Spoken Languages */}
              {movie.spoken_languages && movie.spoken_languages.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t('movie.spokenLanguages')}</p>
                  <p className="font-medium">
                    {movie.spoken_languages.map(l => l.english_name).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
        </div>
      </main>

      {/* Footer */}
      <Footer variant="dark" />

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        movieTitle={title}
        onPaymentComplete={handlePaymentComplete}
        reason={paymentReason}
      />
    </div>
  );
}
