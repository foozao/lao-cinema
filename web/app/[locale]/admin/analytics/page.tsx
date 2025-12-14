'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  Users, 
  TrendingUp,
  Download,
  Trash2,
  RefreshCw,
  Film,
  Ticket,
} from 'lucide-react';
import { 
  getAnalyticsSummary, 
  exportAnalyticsData, 
  clearAnalytics,
  type AnalyticsSummary,
  type MovieAnalytics,
  type UserMovieActivity,
} from '@/lib/analytics';
import { getRentals, type Rental } from '@/lib/api/rentals-client';

// Format seconds to human-readable duration
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

// Format date
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

// Format hours from seconds
function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.round(seconds / 60)} minutes`;
  return `${hours.toFixed(1)} hours`;
}

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const router = useRouter();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [rentals, setRentals] = useState<{ total: number; active: number }>({ total: 0, active: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    // Load analytics from localStorage
    setTimeout(async () => {
      const data = getAnalyticsSummary();
      setSummary(data);
      
      // Load rental data from API
      try {
        const { rentals: allRentals } = await getRentals(true); // Include expired
        const now = new Date();
        const activeCount = allRentals.filter(r => new Date(r.expiresAt) > now).length;
        setRentals({ total: allRentals.length, active: activeCount });
      } catch (error) {
        console.error('Failed to load rentals:', error);
      }
      
      setLoading(false);
    }, 100);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = () => {
    const data = exportAnalyticsData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lao-cinema-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm(t('confirmClear'))) {
      clearAnalytics();
      loadData();
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  const hasData = summary && summary.totalSessions > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h2>
          <p className="text-gray-600">{t('description')}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">{t('refresh')}</span>
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!hasData}>
            <Download className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">{t('export')}</span>
          </Button>
          <Button variant="outline" onClick={handleClear} disabled={!hasData} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">{t('clear')}</span>
          </Button>
        </div>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Film className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('noData')}</h3>
            <p className="text-gray-500 text-center max-w-md">
              {t('noDataDescription')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {t('uniqueViewers')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.uniqueViewers}</div>
                <p className="text-sm text-gray-500">{t('distinctViewers')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-indigo-600" />
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {t('rentals')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{rentals.total}</div>
                <p className="text-sm text-gray-500">{rentals.active} {t('activeRentals')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {t('totalWatchTime')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatHours(summary.totalWatchTime)}</div>
                <p className="text-sm text-gray-500">{t('acrossAllMovies')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {t('completions')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.totalCompletions}</div>
                <p className="text-sm text-gray-500">
                  {summary.totalSessions > 0 
                    ? `${((summary.totalCompletions / summary.totalSessions) * 100).toFixed(0)}% ${t('completionRate')}`
                    : t('noSessions')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {t('avgSessionLength')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatDuration(summary.averageSessionLength)}</div>
                <p className="text-sm text-gray-500">{t('perSession')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Movies Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Top by Watch Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {t('topByWatchTime')}
                </CardTitle>
                <CardDescription>{t('mostWatchedMovies')}</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.topMovies.byWatchTime.length > 0 ? (
                  <div className="space-y-3">
                    {summary.topMovies.byWatchTime.map((movie, index) => (
                      <div key={movie.movieId} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{movie.movieTitle}</p>
                          <p className="text-sm text-gray-500">{formatHours(movie.totalWatchTime)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{t('noMoviesYet')}</p>
                )}
              </CardContent>
            </Card>

            {/* Top by Completion Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {t('topByCompletion')}
                </CardTitle>
                <CardDescription>{t('mostEngagingMovies')}</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.topMovies.byCompletionRate.length > 0 ? (
                  <div className="space-y-3">
                    {summary.topMovies.byCompletionRate.map((movie, index) => (
                      <div key={movie.movieId} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{movie.movieTitle}</p>
                          <p className="text-sm text-gray-500">{movie.completionRate.toFixed(0)}% completed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{t('noMoviesYet')}</p>
                )}
              </CardContent>
            </Card>

            {/* Top by Viewers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t('topByViewers')}
                </CardTitle>
                <CardDescription>{t('mostPopularMovies')}</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.topMovies.byViewers.length > 0 ? (
                  <div className="space-y-3">
                    {summary.topMovies.byViewers.map((movie, index) => (
                      <div key={movie.movieId} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{movie.movieTitle}</p>
                          <p className="text-sm text-gray-500">{movie.uniqueViewers} {t('users')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{t('noMoviesYet')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* All Movies Stats */}
          {summary.movieStats.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{t('allMoviesStats')}</CardTitle>
                <CardDescription>{t('detailedStats')}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium">{t('movie')}</th>
                        <th className="pb-3 font-medium text-right">{t('users')}</th>
                        <th className="pb-3 font-medium text-right">{t('watchTime')}</th>
                        <th className="pb-3 font-medium text-right">{t('avgSession')}</th>
                        <th className="pb-3 font-medium text-right">{t('completions')}</th>
                        <th className="pb-3 font-medium text-right">{t('completionRate')}</th>
                        <th className="pb-3 font-medium text-right">{t('avgProgress')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.movieStats.map((movie) => (
                        <tr 
                          key={movie.movieId} 
                          className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/admin/analytics/${movie.movieId}`)}
                        >
                          <td className="py-3 font-medium">{movie.movieTitle}</td>
                          <td className="py-3 text-right">{movie.uniqueViewers}</td>
                          <td className="py-3 text-right">{formatDuration(movie.totalWatchTime)}</td>
                          <td className="py-3 text-right">{formatDuration(movie.averageWatchTime)}</td>
                          <td className="py-3 text-right">{movie.completions}</td>
                          <td className="py-3 text-right">{movie.completionRate.toFixed(0)}%</td>
                          <td className="py-3 text-right">{movie.averageProgress.toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {summary.movieStats.map((movie) => (
                    <Link 
                      key={movie.movieId} 
                      href={`/admin/analytics/${movie.movieId}`}
                      className="block border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="font-semibold text-base">{movie.movieTitle}</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-gray-600">{t('users')}</div>
                          <div className="font-medium">{movie.uniqueViewers}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">{t('watchTime')}</div>
                          <div className="font-medium">{formatDuration(movie.totalWatchTime)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">{t('avgSession')}</div>
                          <div className="font-medium">{formatDuration(movie.averageWatchTime)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">{t('completions')}</div>
                          <div className="font-medium">{movie.completions}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">{t('completionRate')}</div>
                          <div className="font-medium">{movie.completionRate.toFixed(0)}%</div>
                        </div>
                        <div>
                          <div className="text-gray-600">{t('avgProgress')}</div>
                          <div className="font-medium">{movie.averageProgress.toFixed(0)}%</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          {summary.recentActivity.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('recentActivity')}</CardTitle>
                <CardDescription>{t('userMovieActivity')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary.recentActivity.map((activity) => (
                    <div key={`${activity.viewerId}-${activity.movieId}`} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.completed ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {activity.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{activity.movieTitle}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(activity.lastWatched)} • {formatDuration(activity.totalWatchTime)} {t('totalWatched')} • {activity.sessionCount} {activity.sessionCount === 1 ? t('session') : t('sessions')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-700">{activity.maxProgress.toFixed(0)}%</div>
                        <div className="text-xs text-gray-500">{t('progress')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
