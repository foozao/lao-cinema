'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { Bookmark, Trash2, ArrowLeft, Loader2, Film, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProfileBreadcrumbWrapper } from '@/components/profile-breadcrumb-wrapper';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl } from '@/lib/images';
import { getMoviePath } from '@/lib/movie-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface WatchlistItem {
  id: string;
  addedAt: string;
  movie: {
    id: string;
    tmdb_id: number | null;
    title: { en: string; lo?: string };
    overview: { en: string; lo?: string };
    poster_path: string | null;
    release_date: string | null;
    runtime: number | null;
    vote_average: number | null;
    availability_status: string | null;
  };
}

export default function WatchlistPage() {
  const t = useTranslations('watchlist');
  const locale = useLocale() as 'en' | 'lo';
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      loadWatchlist();
    }
  }, [isAuthenticated, authLoading, router]);

  const loadWatchlist = async () => {
    try {
      const token = localStorage.getItem('lao_cinema_session_token');
      const response = await fetch(`${API_URL}/watchlist`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWatchlist(data.watchlist || []);
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromWatchlist = async (movieId: string) => {
    setRemovingId(movieId);
    try {
      const token = localStorage.getItem('lao_cinema_session_token');
      const response = await fetch(`${API_URL}/watchlist/${movieId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setWatchlist(prev => prev.filter(item => item.movie.id !== movieId));
      }
    } catch (error) {
      console.error('Failed to remove from watchlist:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const formatRuntime = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
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

        {/* Watchlist */}
        {watchlist.length === 0 ? (
          <div className="bg-gray-900 rounded-lg shadow-sm p-12 text-center border border-gray-700">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bookmark className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('empty')}</h3>
            <p className="text-gray-400 mb-6">{t('emptyMessage')}</p>
            <Link href="/">
              <Button>{t('browseMovies')}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {watchlist.map((item) => {
              const title = getLocalizedText(item.movie.title, locale);
              const posterUrl = getPosterUrl(item.movie.poster_path, 'medium');
              const moviePath = getMoviePath({
                id: item.movie.id,
                tmdb_id: item.movie.tmdb_id ?? undefined,
                title: item.movie.title,
              });

              return (
                <div key={item.id} className="group relative">
                  <Link href={`/movies/${moviePath}`}>
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-8 w-8 text-gray-600" />
                        </div>
                      )}
                    </div>
                  </Link>
                  {/* Remove button */}
                  <button
                    onClick={() => removeFromWatchlist(item.movie.id)}
                    disabled={removingId === item.movie.id}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {removingId === item.movie.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                  {/* Title */}
                  <h3 className="mt-2 text-sm font-medium text-white truncate">
                    {title}
                  </h3>
                  {item.movie.release_date && (
                    <p className="text-xs text-gray-500">
                      {new Date(item.movie.release_date).getFullYear()}
                    </p>
                  )}
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
