'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { getRentals, type Rental } from '@/lib/api/rentals-client';
import { Link } from '@/i18n/routing';
import { Film, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPosterUrl } from '@/lib/images';
import { getMovieWatchUrl, getMoviePath } from '@/lib/movie-url';
import { getLocalizedText } from '@/lib/i18n';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProfileBreadcrumbWrapper } from '@/components/profile-breadcrumb-wrapper';

export default function RentalsPage() {
  const t = useTranslations('profile.rentals');
  const locale = useLocale() as 'en' | 'lo';
  const { user, isAuthenticated, anonymousId, isLoading: authLoading } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  
  useEffect(() => {
    const loadRentals = async () => {
      // Wait for auth to initialize
      if (authLoading) return;
      
      // Must be authenticated or have anonymous ID
      if (!isAuthenticated && !anonymousId) {
        router.push('/login');
        return;
      }
      
      try {
        const data = await getRentals();
        setRentals(data.rentals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rentals');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRentals();
  }, [isAuthenticated, anonymousId, authLoading, router]);
  
  const formatDate = (dateString: string) => {
    const timezone = user?.timezone || 'Asia/Vientiane';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    });
  };
  
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) <= new Date();
  };
  
  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }
    
    return `${hours}h ${minutes}m remaining`;
  };
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header variant="dark" />
      <ProfileBreadcrumbWrapper />
      <div className="max-w-6xl mx-auto px-4 py-8 flex-grow">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
          <p className="text-gray-400 mt-2">{t('subtitle')}</p>
        </div>
        
        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        
        {/* Anonymous User Notice */}
        {!isAuthenticated && (
          <div className="mb-6 bg-blue-900/30 border border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-400">
              <strong>Viewing anonymous rentals.</strong> Sign in to sync your rentals across devices.
            </p>
          </div>
        )}
        
        {/* Rentals List */}
        {rentals.length === 0 ? (
          <div className="bg-gray-900 rounded-lg shadow-sm p-12 text-center border border-gray-700">
            <Film className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">{t('noActive')}</p>
            <p className="text-sm text-gray-500 mb-6">
              {t('noActiveDesc')}
            </p>
            <Link href="/movies">
              <Button>
                <Film className="mr-2 h-4 w-4" />
                {t('browseMovies')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rentals.map((rental) => {
              const expired = isExpired(rental.expiresAt);
              const movieTitle = rental.movie?.title 
                ? getLocalizedText(rental.movie.title, locale)
                : 'Movie';
              const posterPath = rental.movie?.poster_path;
              const moviePath = rental.movie 
                ? getMoviePath(rental.movie)
                : rental.movieId;
              
              return (
                <div
                  key={rental.id}
                  className={`bg-gray-900 rounded-lg shadow-sm border-2 p-4 ${
                    expired ? 'border-gray-700 opacity-75' : 'border-green-700'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Movie Poster */}
                    <Link href={`/movies/${moviePath}`} className="flex-shrink-0">
                      {posterPath ? (
                        <img
                          src={getPosterUrl(posterPath, 'small') || ''}
                          alt={movieTitle}
                          className="w-16 h-24 object-cover rounded-md hover:opacity-80 transition-opacity"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-gray-800 rounded-md flex items-center justify-center">
                          <Film className="h-6 w-6 text-gray-600" />
                        </div>
                      )}
                    </Link>
                    
                    {/* Rental Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <Link href={`/movies/${moviePath}`}>
                            <h3 className="text-base font-semibold text-white mb-1 truncate hover:text-gray-300 transition-colors">
                              {movieTitle}
                            </h3>
                          </Link>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            expired 
                              ? 'bg-gray-700 text-gray-300' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {expired ? t('status.expired') : t('status.active')}
                          </span>
                        </div>
                        {!expired && (
                          <Link href={`/movies/${moviePath}/watch`}>
                            <Button size="sm">
                              {t('watchNow')}
                            </Button>
                          </Link>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-400 space-y-0.5">
                        {!expired && (
                          <p className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-green-500 font-medium">{getTimeRemaining(rental.expiresAt)}</span>
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {t('expires')}: {formatDate(rental.expiresAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
      </div>
      <Footer />
    </div>
  );
}
