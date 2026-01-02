'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  Users, 
  TrendingUp,
  RefreshCw,
  Film,
  Percent,
  Eye,
  Ticket,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { 
  getMovieAnalytics,
  getMovieUserActivity,
  type MovieAnalytics,
  type UserMovieActivity,
} from '@/lib/analytics';
import { 
  getMovieAnalyticsDetail,
  type MovieAnalyticsDetail,
} from '@/lib/api/analytics-client';
import { formatDuration } from '@/lib/utils';
import { getLocalizedText } from '@/lib/i18n';

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

export default function MovieAnalyticsPage() {
  const params = useParams();
  const movieId = params.movieId as string;
  const t = useTranslations('analytics');
  const locale = useLocale() as 'en' | 'lo';
  
  // Local analytics from localStorage
  const [analytics, setAnalytics] = useState<MovieAnalytics | null>(null);
  const [userActivity, setUserActivity] = useState<UserMovieActivity[]>([]);
  // Backend analytics from API
  const [apiAnalytics, setApiAnalytics] = useState<MovieAnalyticsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    
    // Load local analytics (localStorage)
    const movieAnalytics = getMovieAnalytics(movieId);
    const activity = getMovieUserActivity(movieId);
    setAnalytics(movieAnalytics);
    setUserActivity(activity.sort((a, b) => b.lastWatched - a.lastWatched));
    
    // Load backend analytics (API)
    try {
      const apiData = await getMovieAnalyticsDetail(movieId);
      setApiAnalytics(apiData);
    } catch (error) {
      console.error('Failed to load API analytics:', error);
      // Continue without API data
    }
    
    setLoading(false);
  }, [movieId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  // Get movie title from API or localStorage
  const movieTitle = apiAnalytics 
    ? getLocalizedText(apiAnalytics.movie.title as any, locale)
    : analytics?.movieTitle || 'Unknown Movie';
  
  // Get combined stats (prefer API data when available)
  const watchStats = {
    uniqueViewers: apiAnalytics?.watch.uniqueWatchers ?? analytics?.uniqueViewers ?? 0,
    totalWatchTime: apiAnalytics?.watch.totalWatchTime ?? analytics?.totalWatchTime ?? 0,
    completions: apiAnalytics?.watch.completions ?? analytics?.completions ?? 0,
    completionRate: apiAnalytics?.watch.completionRate ?? analytics?.completionRate ?? 0,
    averageProgress: apiAnalytics?.watch.averageProgress ?? analytics?.averageProgress ?? 0,
    averageWatchTime: analytics?.averageWatchTime ?? 0,
    lastWatched: analytics?.lastWatched,
  };
  
  const rentalStats = apiAnalytics?.rentals ?? {
    total: 0,
    active: 0,
    revenue: 0,
    currency: 'USD',
    uniqueRenters: 0,
    firstRental: null,
    lastRental: null,
  };

  // Check if we have any data
  const hasData = analytics || apiAnalytics;

  if (!hasData) {
    return (
      <div>
        <div className="mb-6">
          <Link href="/admin/analytics">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToAnalytics')}
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Film className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('noDataForMovie')}</h3>
            <p className="text-gray-500 text-center max-w-md">
              {t('noDataForMovieDescription')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/analytics">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToAnalytics')}
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{movieTitle}</h2>
          <p className="text-gray-600">{t('movieAnalyticsDescription')}</p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('refresh')}
        </Button>
      </div>

      {/* Rental Stats Cards */}
      {apiAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('totalRentals')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{rentalStats.total}</div>
              <p className="text-sm text-gray-500">{rentalStats.active} {t('activeNow')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('revenue')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${rentalStats.revenue.toFixed(2)}</div>
              <p className="text-sm text-gray-500">{rentalStats.currency}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('uniqueRenters')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{rentalStats.uniqueRenters}</div>
              <p className="text-sm text-gray-500">{t('distinctRenters')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('lastRental')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {rentalStats.lastRental 
                  ? new Date(rentalStats.lastRental).toLocaleDateString()
                  : '-'}
              </div>
              <p className="text-sm text-gray-500">
                {rentalStats.firstRental 
                  ? `${t('since')} ${new Date(rentalStats.firstRental).toLocaleDateString()}`
                  : t('noRentalsYet')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Watch Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            <div className="text-3xl font-bold">{watchStats.uniqueViewers}</div>
            <p className="text-sm text-gray-500">{t('distinctViewers')}</p>
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
            <div className="text-3xl font-bold">{formatHours(watchStats.totalWatchTime)}</div>
            <p className="text-sm text-gray-500">{t('avgPerSession')}: {formatDuration(watchStats.averageWatchTime)}</p>
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
            <div className="text-3xl font-bold">{watchStats.completions}</div>
            <p className="text-sm text-gray-500">
              {watchStats.completionRate.toFixed(0)}% {t('completionRate')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-orange-600" />
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('avgProgress')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{watchStats.averageProgress.toFixed(0)}%</div>
            <p className="text-sm text-gray-500">{t('averageWatched')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('viewingStats')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('uniqueViewers')}</span>
                <span className="font-semibold">{watchStats.uniqueViewers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('totalWatchTime')}</span>
                <span className="font-semibold">{formatHours(watchStats.totalWatchTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('watchTimePerViewer')}</span>
                <span className="font-semibold">{watchStats.uniqueViewers > 0 ? formatDuration(watchStats.totalWatchTime / watchStats.uniqueViewers) : '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('engagementStats')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('completions')}</span>
                <span className="font-semibold">{watchStats.completions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('completionRate')}</span>
                <span className="font-semibold">{watchStats.completionRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('avgProgress')}</span>
                <span className="font-semibold">{watchStats.averageProgress.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('lastWatched')}</span>
                <span className="font-semibold text-sm">
                  {watchStats.lastWatched ? formatDate(watchStats.lastWatched) : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Rentals */}
      {apiAnalytics && apiAnalytics.recentRentals.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              {t('recentRentals')}
            </CardTitle>
            <CardDescription>{t('last10Rentals')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {apiAnalytics.recentRentals.map((rental) => {
                const isActive = new Date(rental.expiresAt) > new Date();
                return (
                  <div 
                    key={rental.id} 
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Ticket className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          ${rental.amount.toFixed(2)} {rental.currency}
                        </p>
                        {isActive && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {t('active')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(rental.purchasedAt).toLocaleString()} - {rental.paymentMethod}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {isActive ? (
                        <span>{t('expiresIn')} {Math.ceil((new Date(rental.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))}h</span>
                      ) : (
                        <span>{t('expired')}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('viewerActivity')}
          </CardTitle>
          <CardDescription>{t('perUserWatchTime')}</CardDescription>
        </CardHeader>
        <CardContent>
          {userActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('noSessions')}</p>
          ) : (
            <div className="space-y-3">
              {userActivity.map((activity) => (
                <div 
                  key={activity.viewerId} 
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {formatDuration(activity.totalWatchTime)} {t('totalWatched')}
                      </p>
                      {activity.completed && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          {t('completed')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(activity.lastWatched)} • {activity.sessionCount} {activity.sessionCount === 1 ? t('session') : t('sessions')} • {activity.maxProgress.toFixed(0)}% {t('progress')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">{activity.maxProgress.toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">{t('progress')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
