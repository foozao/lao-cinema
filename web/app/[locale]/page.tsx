'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MovieCard } from '@/components/movie-card';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Footer } from '@/components/footer';
import { Film } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';
import type { Movie } from '@/lib/types';

export default function Home() {
  const t = useTranslations();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMovies = async () => {
      try {
        const response = await movieAPI.getAll();
        setMovies(response.movies);
      } catch (error) {
        console.error('Failed to load movies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Film className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('home.title')}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('home.subtitle')}
                </p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            {t('home.featured')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('home.tagline')}
          </p>
        </section>

        {/* Movie Grid */}
        <section>
          {loading ? (
            <div className="text-center py-20">
              <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
            </div>
          ) : movies.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Film className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {t('home.noFilms')}
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                {t('home.noFilmsDescription')}
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
