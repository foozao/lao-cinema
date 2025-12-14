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
      <div className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full">
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('backToProfile')}
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Bookmark className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
              <p className="text-gray-400 mt-1">{t('subtitle')}</p>
            </div>
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map((item) => {
              const title = getLocalizedText(item.movie.title, locale);
              const posterUrl = getPosterUrl(item.movie.poster_path, 'medium');
              const moviePath = getMoviePath({
                id: item.movie.id,
                tmdb_id: item.movie.tmdb_id ?? undefined,
                title: item.movie.title,
              });
              const isAvailable = item.movie.availability_status === 'available' || item.movie.availability_status === 'auto';

              return (
                <div
                  key={item.id}
                  className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors group"
                >
                  {/* Poster */}
                  <Link href={`/movies/${moviePath}`}>
                    <div className="relative aspect-[2/3] bg-gray-800">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-12 w-12 text-gray-600" />
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                          <Play className="w-8 h-8 text-white" fill="white" />
                        </div>
                      </div>
                      {/* Availability badge */}
                      {!isAvailable && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-gray-900/80 rounded text-xs text-gray-300">
                          {item.movie.availability_status === 'coming_soon' ? t('comingSoon') : t('unavailable')}
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-4">
                    <Link href={`/movies/${moviePath}`}>
                      <h3 className="font-semibold text-white hover:text-amber-400 truncate mb-1">
                        {title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      {item.movie.release_date && (
                        <span>{new Date(item.movie.release_date).getFullYear()}</span>
                      )}
                      {item.movie.runtime && (
                        <>
                          <span>•</span>
                          <span>{formatRuntime(item.movie.runtime)}</span>
                        </>
                      )}
                      {item.movie.vote_average && item.movie.vote_average > 0 && (
                        <>
                          <span>•</span>
                          <span>★ {item.movie.vote_average.toFixed(1)}</span>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {t('addedOn')} {new Date(item.addedAt).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromWatchlist(item.movie.id)}
                        disabled={removingId === item.movie.id}
                        className="text-gray-500 hover:text-red-500"
                      >
                        {removingId === item.movie.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
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
