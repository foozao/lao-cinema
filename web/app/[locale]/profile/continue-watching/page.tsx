'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { getContinueWatching, deleteWatchProgress, type WatchProgress } from '@/lib/api/watch-progress-client';
import { Link } from '@/i18n/routing';
import { Play, Clock, Trash2, Loader2 } from 'lucide-react';
import { getBackdropUrl, getPosterUrl } from '@/lib/images';
import { ProfilePageLayout } from '@/components/profile-page-layout';
import { EmptyState } from '@/components/empty-state';
import { AnonymousNotice } from '@/components/anonymous-notice';
import { formatDuration } from '@/lib/utils';

export default function ContinueWatchingPage() {
  const t = useTranslations('profile.continueWatching');
  const { user, isAuthenticated } = useAuth();
  const [progress, setProgress] = useState<WatchProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  useEffect(() => {
    loadProgress();
  }, []);
  
  const loadProgress = async () => {
    try {
      const data = await getContinueWatching();
      setProgress(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watch progress');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async (movieId: string) => {
    if (!confirm(t('confirmRemove'))) return;
    
    setDeletingId(movieId);
    try {
      await deleteWatchProgress(movieId);
      // Reload progress
      await loadProgress();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete progress');
    } finally {
      setDeletingId(null);
    }
  };
  
  const getProgressPercentage = (item: WatchProgress) => {
    return Math.round((item.progressSeconds / item.durationSeconds) * 100);
  };
  
  const formatLastWatched = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return t('justNow');
    if (diffHours < 24) return t('hoursAgo', { hours: diffHours });
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) return t('daysAgo', { days: diffDays });
    
    const timezone = user?.timezone || 'Asia/Vientiane';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      timeZone: timezone,
    });
  };
  
  return (
    <ProfilePageLayout allowAnonymous isLoading={isLoading}>
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
          <AnonymousNotice
            message={t('localProgressNotice')}
            signInMessage={t('localProgressSignIn')}
          />
        )}
        
        {/* Progress List */}
        {progress.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={t('noProgress')}
            description={t('noProgressDesc')}
            actionLabel={t('browseMovies')}
            actionHref="/movies"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {progress.map((item) => (
              <div
                key={item.id}
                className="bg-gray-900 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow group border border-gray-700"
              >
                {/* Backdrop/Poster */}
                <div className="relative aspect-video bg-gray-200">
                  {(item.movieBackdropPath || item.moviePosterPath) ? (
                    <img
                      src={(() => {
                        if (item.movieBackdropPath) {
                          return getBackdropUrl(item.movieBackdropPath, 'medium') || '';
                        } else if (item.moviePosterPath) {
                          return getPosterUrl(item.moviePosterPath, 'medium') || '';
                        }
                        return '';
                      })()}
                      alt={item.movieTitle || 'Movie'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Progress Bar Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                    <div
                      className="h-full bg-red-600"
                      style={{ width: `${getProgressPercentage(item)}%` }}
                    />
                  </div>
                  
                  {/* Play Button Overlay */}
                  <Link href={`/movies/${item.movieId}/watch`}>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white rounded-full p-4">
                          <Play className="h-8 w-8 text-gray-900" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
                
                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-2 line-clamp-1">
                    {item.movieTitle || 'Movie'}
                  </h3>
                  
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                    <span>{t('percentWatched', { percent: getProgressPercentage(item) })}</span>
                    <span>
                      {formatDuration(item.progressSeconds)} / {formatDuration(item.durationSeconds)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 mt-1">
                      {t('lastWatched')} {formatLastWatched(item.lastWatchedAt)}
                    </p>
                    
                    <button
                      onClick={() => handleDelete(item.movieId)}
                      disabled={deletingId === item.movieId}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      title={t('removeFromList')}
                    >
                      {deletingId === item.movieId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Stats */}
        {progress.length > 0 && (
          <div className="mt-8 bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">{t('summary')}</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {progress.length}
                </p>
                <p className="text-sm text-gray-400">{t('moviesInProgress')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(
                    progress.reduce((sum, p) => sum + getProgressPercentage(p), 0) / progress.length
                  )}%
                </p>
                <p className="text-sm text-gray-400">{t('averageProgress')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {formatDuration(
                    progress.reduce((sum, p) => sum + p.progressSeconds, 0)
                  )}
                </p>
                <p className="text-sm text-gray-400">{t('totalWatchTime')}</p>
              </div>
            </div>
          </div>
        )}
    </ProfilePageLayout>
  );
}
