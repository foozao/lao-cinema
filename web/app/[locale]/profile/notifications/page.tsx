'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Bell, BellOff, Loader2, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl } from '@/lib/images';
import { getMoviePath } from '@/lib/movie-url';
import { ProfilePageLayout } from '@/components/profile-page-layout';
import { EmptyState } from '@/components/empty-state';
import { getMovieNotifications, unsubscribeFromMovie, type MovieNotification } from '@/lib/api/notifications-client';

export default function NotificationsPage() {
  const t = useTranslations('profile.notifications');
  const locale = useLocale() as 'en' | 'lo';
  const [notifications, setNotifications] = useState<MovieNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try{
      const data = await getMovieNotifications();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeNotification = async (movieId: string) => {
    setRemovingId(movieId);
    try {
      await unsubscribeFromMovie(movieId);
      setNotifications(prev => prev.filter(n => n.movieId !== movieId));
    } catch (error) {
      console.error('Failed to remove notification:', error);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <ProfilePageLayout isLoading={isLoading}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
          <p className="text-gray-400 mt-2">{t('subtitle')}</p>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={t('empty')}
            description={t('emptyMessage')}
            actionLabel={t('browseMovies')}
            actionHref="/"
          />
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
    </ProfilePageLayout>
  );
}
