'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { RentalCard } from '@/components/rental-card';
import { Header } from '@/components/header';
import { SubHeader } from '@/components/sub-header';
import { Footer } from '@/components/footer';
import { CinematicLoader } from '@/components/cinematic-loader';
import { AnimatedMovieGrid } from '@/components/animated-movie-grid';
import { Film } from 'lucide-react';
import { APIError } from '@/components/api-error';
import type { Movie } from '@/lib/types';
import { getRentals, type Rental } from '@/lib/api/rentals-client';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const t = useTranslations();
  const { user, isLoading: authLoading } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [rentalsLoading, setRentalsLoading] = useState(true);
  const [error, setError] = useState<'network' | 'server' | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

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
  }, [loadMovies]);

  // Reload rentals when auth state changes (login/logout)
  useEffect(() => {
    if (!authLoading) {
      setRentalsLoading(true);
      loadRentals();
    }
  }, [user?.id, authLoading, loadRentals]);

  const handleRetry = () => {
    setIsRetrying(true);
    setLoading(true);
    loadMovies();
  };

  // Content is ready when not loading and loader is done
  const contentReady = !loading && !showLoader;

  return (
    <>
      {/* Cinematic Loader - first visit only */}
      {showLoader && (
        <CinematicLoader onComplete={() => setShowLoader(false)} />
      )}

      <div className={`min-h-screen bg-black flex flex-col transition-opacity duration-700 ${
        showLoader ? 'opacity-0' : 'opacity-100'
      }`}>
        {/* Header */}
        <Header variant="dark" />
        <SubHeader variant="dark" />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 flex-grow">
          {/* My Rentals Section */}
          {!rentalsLoading && rentals.length > 0 && (
            <section className={`mb-12 transition-all duration-700 ease-out ${
              contentReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <h2 className="text-3xl font-bold text-white mb-6">
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
          <section className={`transition-all duration-700 ease-out delay-100 ${
            contentReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <h2 className="text-3xl font-bold text-white mb-6">
              {t('home.featured')}
            </h2>

            {/* Movie Grid */}
            {loading ? (
              <div className="py-20" />
            ) : error ? (
              <APIError 
                type={error} 
                onRetry={handleRetry} 
                isRetrying={isRetrying} 
              />
            ) : movies.length > 0 ? (
              <AnimatedMovieGrid movies={movies} />
            ) : (
              <div className="text-center py-20">
                <Film className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  {t('home.noFilms')}
                </h3>
                <p className="text-gray-500">
                  {t('home.noFilmsDescription')}
                </p>
              </div>
            )}
          </section>
        </main>

        {/* Footer */}
        <Footer variant="dark" />
      </div>
    </>
  );
}
