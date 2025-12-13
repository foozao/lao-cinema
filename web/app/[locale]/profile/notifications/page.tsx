'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { Bell, BellOff, ArrowLeft, Loader2, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl } from '@/lib/images';
import { getMoviePath } from '@/lib/movie-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface MovieNotification {
  id: string;
  movieId: string;
  createdAt: string;
  movie: {
    id: string;
    tmdb_id: number | null;
    title: { en: string; lo?: string };
    poster_path: string | null;
    release_date: string | null;
    availability_status: string | null;
  };
}

export default function NotificationsPage() {
  const t = useTranslations('profile.notifications');
  const locale = useLocale() as 'en' | 'lo';
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<MovieNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated, authLoading, router]);

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('lao_cinema_session_token');
      const response = await fetch(`${API_URL}/notifications/movies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeNotification = async (movieId: string) => {
    setRemovingId(movieId);
    try {
      const token = localStorage.getItem('lao_cinema_session_token');
      const response = await fetch(`${API_URL}/notifications/movies/${movieId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.movieId !== movieId));
      }
    } catch (error) {
      console.error('Failed to remove notification:', error);
    } finally {
      setRemovingId(null);
    }
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
      <div className="max-w-4xl mx-auto px-4 py-8 flex-grow w-full">
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('backToProfile')}
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
          <p className="text-gray-400 mt-2">{t('subtitle')}</p>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-gray-900 rounded-lg shadow-sm p-12 text-center border border-gray-700">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('empty')}</h3>
            <p className="text-gray-400 mb-6">{t('emptyMessage')}</p>
            <Link href="/">
              <Button>{t('browseMovies')}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const title = getLocalizedText(notification.movie.title, locale);
              const posterUrl = getPosterUrl(notification.movie.poster_path, 'small');
              const moviePath = getMoviePath({
                id: notification.movie.id,
                tmdb_id: notification.movie.tmdb_id ?? undefined,
                title: notification.movie.title,
              });

              return (
                <div
                  key={notification.id}
                  className="bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-700"
                >
                  <div className="flex items-center gap-4">
                    {/* Poster */}
                    <Link href={`/movies/${moviePath}`}>
                      <div className="w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-gray-200">
                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/movies/${moviePath}`}>
                        <h3 className="font-semibold text-white hover:text-blue-400 truncate">
                          {title}
                        </h3>
                      </Link>
                      {notification.movie.release_date && (
                        <p className="text-sm text-gray-500">
                          {new Date(notification.movie.release_date).getFullYear()}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {t('subscribedOn')} {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNotification(notification.movieId)}
                      disabled={removingId === notification.movieId}
                      className="text-gray-500 hover:text-red-600"
                    >
                      {removingId === notification.movieId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BellOff className="h-4 w-4" />
                      )}
                    </Button>
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
