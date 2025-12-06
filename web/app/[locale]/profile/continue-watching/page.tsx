'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getContinueWatching, deleteWatchProgress, type WatchProgress } from '@/lib/api/watch-progress-client';
import { Link } from '@/i18n/routing';
import { Play, Clock, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBackdropUrl, getPosterUrl } from '@/lib/images';

export default function ContinueWatchingPage() {
  const { isAuthenticated, anonymousId, isLoading: authLoading } = useAuth();
  const [progress, setProgress] = useState<WatchProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    loadProgress();
  }, [isAuthenticated, anonymousId, authLoading]);
  
  const loadProgress = async () => {
    // Wait for auth to initialize
    if (authLoading) return;
    
    // Must be authenticated or have anonymous ID
    if (!isAuthenticated && !anonymousId) {
      router.push('/login');
      return;
    }
    
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
    if (!confirm('Remove this movie from continue watching?')) return;
    
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
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  const formatLastWatched = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
            ← Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Continue Watching</h1>
          <p className="text-gray-600 mt-2">Pick up where you left off</p>
        </div>
        
        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        
        {/* Anonymous User Notice */}
        {!isAuthenticated && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Viewing local progress.</strong> Sign in to sync your watch progress across devices.
            </p>
          </div>
        )}
        
        {/* Progress List */}
        {progress.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No movies in progress</h2>
            <p className="text-gray-600 mb-6">
              Start watching a movie and it will appear here so you can pick up where you left off.
            </p>
            <Link href="/movies">
              <Button>Browse Movies</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {progress.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
              >
                {/* Backdrop/Poster */}
                <div className="relative aspect-video bg-gray-200">
                  {(item.movieBackdropPath || item.moviePosterPath) ? (
                    <img
                      src={(() => {
                        if (item.movieBackdropPath) {
                          return getBackdropUrl(item.movieBackdropPath, 'medium');
                        } else if (item.moviePosterPath) {
                          return getPosterUrl(item.moviePosterPath, 'medium');
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
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                    {item.movieTitle || 'Movie'}
                  </h3>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span>{getProgressPercentage(item)}% watched</span>
                    <span>
                      {formatTime(item.progressSeconds)} / {formatTime(item.durationSeconds)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {formatLastWatched(item.lastWatchedAt)}
                    </span>
                    
                    <button
                      onClick={() => handleDelete(item.movieId)}
                      disabled={deletingId === item.movieId}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Remove from continue watching"
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
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {progress.length}
                </p>
                <p className="text-sm text-gray-600">Movies in Progress</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(
                    progress.reduce((sum, p) => sum + getProgressPercentage(p), 0) / progress.length
                  )}%
                </p>
                <p className="text-sm text-gray-600">Average Progress</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {formatTime(
                    progress.reduce((sum, p) => sum + p.progressSeconds, 0)
                  )}
                </p>
                <p className="text-sm text-gray-600">Total Watch Time</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
