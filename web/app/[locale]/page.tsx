'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { MovieCard } from '@/components/movie-card';
import { RentalCard } from '@/components/rental-card';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Film } from 'lucide-react';
import { APIError } from '@/components/api-error';
import type { Movie } from '@/lib/types';
import { getRentals, type Rental } from '@/lib/api/rentals-client';

export default function Home() {
  const t = useTranslations();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [rentalsLoading, setRentalsLoading] = useState(true);
  const [error, setError] = useState<'network' | 'server' | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadMovies = useCallback(async () => {
    try {
      setError(null);
      // Fetch featured films for homepage
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/homepage/featured`);
      
      if (!response.ok) {
        // Server returned an error status
        setError('server');
        return;
      }
      
      const data = await response.json();
      setMovies(data.movies || []);
    } catch (err) {
      console.error('Failed to load movies:', err);
      // Network error (server unreachable, CORS, etc.)
      setError('network');
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, []);

  const loadRentals = useCallback(async () => {
    try {
      // Fetch active and recently expired rentals
      const { rentals: userRentals } = await getRentals(true);
      
      // Sort: active rentals first, then expired (by expiry date descending)
      const now = new Date();
      const sortedRentals = userRentals.sort((a, b) => {
        const aExpired = new Date(a.expiresAt) <= now;
        const bExpired = new Date(b.expiresAt) <= now;
        
        // Active rentals come first
        if (aExpired !== bExpired) {
          return aExpired ? 1 : -1;
        }
        
        // Within same status, sort by expiry date (soonest first for active, most recent for expired)
        return new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime();
      });
      
      setRentals(sortedRentals);
    } catch (err) {
      console.error('Failed to load rentals:', err);
      // Silently fail for rentals - not critical for homepage
    } finally {
      setRentalsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovies();
    loadRentals();
  }, [loadMovies, loadRentals]);

  const handleRetry = () => {
    setIsRetrying(true);
    setLoading(true);
    loadMovies();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black flex flex-col">
      {/* Header */}
      <Header variant="light" />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-grow">
        {/* My Rentals Section */}
        {!rentalsLoading && rentals.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              {t('home.myRentals')}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {rentals.map((rental) => (
                <RentalCard key={rental.id} rental={rental} />
              ))}
            </div>
          </section>
        )}

        {/* Featured Films Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('home.featured')}
            </h2>
            <Link
              href="/movies"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('home.browseAll')}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        {/* Movie Grid */}
        <section>
          {loading ? (
            <div className="text-center py-20">
              <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
            </div>
          ) : error ? (
            <APIError 
              type={error} 
              onRetry={handleRetry} 
              isRetrying={isRetrying} 
            />
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
