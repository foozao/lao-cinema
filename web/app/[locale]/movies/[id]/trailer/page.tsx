'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { getBackdropUrl, getPosterUrl } from '@/lib/images';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { TrailerPlayer } from '@/components/trailer-player';
import { ShareButton } from '@/components/share-button';
import { Button } from '@/components/ui/button';
import { movieAPI } from '@/lib/api/client';
import { Play, Calendar, Clock } from 'lucide-react';
import { getMoviePath } from '@/lib/movie-url';
import type { Movie } from '@/lib/types';

export default function TrailerPage() {
  const params = useParams();
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const id = params.id as string;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

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
    return <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black" />;
  }

  if (!movie || !movie.trailers || movie.trailers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <Header variant="dark" />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <p>{t('common.error')}</p>
        </div>
      </div>
    );
  }

  const title = getLocalizedText(movie.title, locale);
  const overview = getLocalizedText(movie.overview, locale);
  const backdropUrl = getBackdropUrl(movie.backdrop_path, 'large');
  const posterUrl = getPosterUrl(movie.poster_path, 'medium');
  const trailer = movie.trailers[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Header variant="dark" />

      <main className="container mx-auto px-4 py-8">
        {/* Back to movie link */}
        <div className="mb-6">
          <Link
            href={`/movies/${getMoviePath(movie)}`}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            ← {t('common.back')} to {title}
          </Link>
        </div>

        {/* Trailer Player */}
        <div className="max-w-5xl mx-auto mb-8">
          <TrailerPlayer trailer={trailer} className="w-full aspect-video" />
        </div>

        {/* Movie Info Card */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
            <div className="grid md:grid-cols-[200px_1fr] gap-6 p-6">
              {/* Poster */}
              {posterUrl && (
                <div className="hidden md:block">
                  <img
                    src={posterUrl}
                    alt={title}
                    className="w-full rounded-lg shadow-lg"
                  />
                </div>
              )}

              {/* Info */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">{title}</h1>
                  
                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                    {movie.release_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(movie.release_date).getFullYear()}</span>
                      </div>
                    )}
                    {movie.runtime && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{t('movie.minutes', { count: movie.runtime })}</span>
                      </div>
                    )}
                  </div>

                  {/* Overview */}
                  {overview && (
                    <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-6">
                      {overview.length > 300 ? `${overview.slice(0, 300)}...` : overview}
                    </p>
                  )}
                </div>

                {/* Call to Action */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href={`/movies/${getMoviePath(movie)}`}>
                    <Button size="lg" className="w-full sm:w-auto gap-2 bg-red-600 hover:bg-red-700">
                      <Play className="w-5 h-5 fill-white" />
                      {t('movie.rentToWatch')}
                    </Button>
                  </Link>
                  <ShareButton
                    path={`/movies/${getMoviePath(movie)}/trailer`}
                    title={`${title} - ${t('movie.trailer')}`}
                    variant="secondary"
                    size="lg"
                  />
                </div>

                {/* Branding */}
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-500">
                    {t('common.watchOn')} <span className="font-semibold text-gray-400">Lao Cinema</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEO-friendly description */}
        <div className="max-w-5xl mx-auto mt-8 text-center text-sm text-gray-500">
          <p>
            {t('movie.trailerFor')} {title} • {t('movie.availableOn')} Lao Cinema
          </p>
        </div>
      </main>

      <Footer variant="dark" />
    </div>
  );
}
