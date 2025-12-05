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
import { Calendar, Clock, Star, Users, Play } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';
import { PaymentModal, type PaymentReason } from '@/components/payment-modal';
import { StreamingPlatformList } from '@/components/streaming-platform-badge';
import { isRentalValid, storeRental, formatRemainingTime } from '@/lib/rental';
import type { Movie } from '@/lib/types';

export default function MoviePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const tGenres = useTranslations('genres');
  const id = params.id as string;
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentReason, setPaymentReason] = useState<PaymentReason>('default');
  const [hasValidRental, setHasValidRental] = useState(false);
  const [remainingTime, setRemainingTime] = useState('');

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
    const checkRental = () => {
      const valid = isRentalValid(id);
      setHasValidRental(valid);
      if (valid) {
        setRemainingTime(formatRemainingTime(id));
      }
    };

    checkRental();
    // Check every minute to update remaining time
    const interval = setInterval(checkRental, 60000);
    return () => clearInterval(interval);
  }, [id]);

  const handleWatchNowClick = () => {
    if (isRentalValid(id)) {
      // Rental is valid, go directly to watch page
      router.push(`/movies/${id}/watch`);
    } else {
      // No valid rental, show payment modal
      setPaymentReason('default');
      setShowPaymentModal(true);
    }
  };

  const handlePaymentComplete = () => {
    // Store the rental
    storeRental(id);
    setHasValidRental(true);
    setRemainingTime(formatRemainingTime(id));
    setShowPaymentModal(false);
    // Navigate to watch page
    router.push(`/movies/${id}/watch`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <p>{t('common.error')}</p>
      </div>
    );
  }

  // Get the primary video source (prefer HLS, fallback to MP4)
  const videoSource =
    movie.video_sources.find((vs) => vs.format === 'hls') ||
    movie.video_sources[0];

  // Check if film is only available on external platforms
  const hasExternalPlatforms = movie.external_platforms && movie.external_platforms.length > 0;
  const isAvailableOnSite = videoSource && !hasExternalPlatforms;

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
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Poster - Left Side */}
                  <div className="flex-shrink-0">
                    <div className="relative w-full md:w-[300px] aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 shadow-2xl">
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

                  {/* Movie Info - Right Side */}
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">{title}</h1>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 mb-6 text-sm md:text-base">
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

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2 mb-6">
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

                    {/* Watch Now Button or External Platforms */}
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
                          </div>
                          {hasValidRental && remainingTime && (
                            <p className="text-sm text-green-400">
                              {t('payment.rentalActive')} • {t('payment.expiresIn', { time: remainingTime })}
                            </p>
                          )}
                        </>
                      ) : hasExternalPlatforms ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-300">
                            {t('movie.availableOn')}
                          </p>
                          <StreamingPlatformList platforms={movie.external_platforms!} size="lg" />
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

            {/* Overview */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3">{t('movie.overview')}</h3>
              <p className="text-gray-300 leading-relaxed">
                {overview}
              </p>
            </div>

            {/* Cast */}
            {movie.cast.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5" />
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
      <Footer />

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
