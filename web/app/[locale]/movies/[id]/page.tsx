'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { getBackdropUrl, getPosterUrl, getProfileUrl } from '@/lib/images';
import { VideoPlayer } from '@/components/video-player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ArrowLeft, Calendar, Clock, Star, Users, Play } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';
import type { Movie } from '@/lib/types';

export default function MoviePage() {
  const params = useParams();
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const id = params.id as string;
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);

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

  const title = getLocalizedText(movie.title, locale);
  const titleEn = getLocalizedText(movie.title, 'en');
  const overview = getLocalizedText(movie.overview, locale);
  const overviewEn = getLocalizedText(movie.overview, 'en');
  
  // Get image URLs
  const backdropUrl = getBackdropUrl(movie.backdrop_path, 'large');
  const posterUrl = getPosterUrl(movie.poster_path, 'large');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t('nav.home')}
            </Button>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section / Video Player */}
        <section className="mb-8">
          {isWatching && videoSource ? (
            <VideoPlayer
              src={videoSource.url}
              poster={backdropUrl || posterUrl || undefined}
              title={title}
            />
          ) : (
            <div className="grid md:grid-cols-5 gap-6">
              {/* Backdrop Image - Smaller */}
              <div className="md:col-span-2">
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900">
                  {backdropUrl || posterUrl ? (
                    <img
                      src={backdropUrl || posterUrl || ''}
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

              {/* Movie Info - More prominent */}
              <div className="md:col-span-3 flex flex-col justify-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-2">{title}</h1>
                <h2 className="text-xl text-gray-400 mb-4">{titleEn}</h2>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 mb-6 text-base">
                  {movie.release_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span>{new Date(movie.release_date).getFullYear()}</span>
                    </div>
                  )}
                  {movie.runtime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <span>{t('movie.minutes', { count: movie.runtime })}</span>
                    </div>
                  )}
                  {movie.vote_average && (
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold">{movie.vote_average.toFixed(1)}/10</span>
                    </div>
                  )}
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {movie.genres.map((genre) => (
                    <Badge key={genre.id} variant="secondary" className="text-sm">
                      {getLocalizedText(genre.name, locale)}
                    </Badge>
                  ))}
                </div>

                {/* Overview */}
                <p className="text-gray-300 leading-relaxed mb-6 line-clamp-4">
                  {overview}
                </p>

                {/* Watch Now Button - More Prominent */}
                <div className="flex gap-3">
                  <Button
                    size="lg"
                    onClick={() => setIsWatching(true)}
                    className="gap-2 text-lg px-8 py-6 bg-red-600 hover:bg-red-700"
                    disabled={!videoSource}
                  >
                    <Play className="w-6 h-6 fill-white" />
                    {t('movie.watchNow')}
                  </Button>
                  {movie.vote_count && (
                    <div className="flex items-center gap-2 px-4 text-sm text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{movie.vote_count.toLocaleString()} votes</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Detailed Info Section */}
        <section className="grid md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2">

            {/* Overview */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3">{t('movie.overview')}</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                {overview}
              </p>
              {/* Only show English version if it's different from the displayed language */}
              {locale !== 'en' && overview !== overviewEn && (
                <p className="text-gray-400 leading-relaxed text-sm">
                  {overviewEn}
                </p>
              )}
            </div>

            {/* Cast */}
            {movie.cast.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t('movie.cast')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {movie.cast.slice(0, 10).map((member, index) => {
                    const profileUrl = getProfileUrl(member.profile_path, 'small');
                    const memberName = getLocalizedText(member.name, 'en');
                    return (
                      <Link
                        key={`cast-${member.id}-${index}`}
                        href={`/people/${member.id}`}
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
                          {getLocalizedText(member.name, locale)}
                        </p>
                        <p className="text-sm text-gray-400 truncate">
                          as {getLocalizedText(member.character, locale)}
                        </p>
                      </div>
                    </Link>
                    );
                  })}
                </div>
                {movie.cast.length > 10 && (
                  <p className="text-sm text-gray-400 mt-3">
                    + {movie.cast.length - 10} more cast members
                  </p>
                )}
              </div>
            )}

            {/* Crew */}
            {movie.crew.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-3">{t('movie.crew')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {movie.crew.map((member, index) => {
                    const profileUrl = getProfileUrl(member.profile_path, 'small');
                    const memberName = getLocalizedText(member.name, 'en');
                    return (
                      <Link
                        key={`crew-${member.id}-${index}`}
                        href={`/people/${member.id}`}
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
                          {getLocalizedText(member.name, locale)}
                        </p>
                        <p className="text-sm text-gray-400 truncate">
                          {getLocalizedText(member.job, locale)}
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
            {/* Poster */}
            {posterUrl && (
              <div className="aspect-[2/3] relative rounded-lg overflow-hidden mb-6 bg-gray-800">
                <img
                  src={posterUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Additional Info */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-400 mb-1">Original Title</p>
                <p className="font-medium">{movie.original_title || titleEn}</p>
              </div>
              {movie.vote_count && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Votes</p>
                  <p className="font-medium">{movie.vote_count.toLocaleString()}</p>
                </div>
              )}
              {movie.popularity && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Popularity</p>
                  <p className="font-medium">{movie.popularity.toFixed(1)}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
