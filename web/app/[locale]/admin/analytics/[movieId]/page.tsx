'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Clock, 
  CheckCircle, 
  Users, 
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Film,
  Calendar,
  Percent,
} from 'lucide-react';
import { 
  getMovieAnalytics,
  getMovieSessions,
  type MovieAnalytics,
  type WatchSession,
} from '@/lib/analytics';

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

export default function MovieAnalyticsPage() {
  const params = useParams();
  const movieId = params.movieId as string;
  const t = useTranslations('analytics');
  
  const [analytics, setAnalytics] = useState<MovieAnalytics | null>(null);
  const [sessions, setSessions] = useState<WatchSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    setTimeout(() => {
      const movieAnalytics = getMovieAnalytics(movieId);
      const movieSessions = getMovieSessions(movieId);
      setAnalytics(movieAnalytics);
      setSessions(movieSessions.sort((a, b) => b.startedAt - a.startedAt));
      setLoading(false);
    }, 100);
  };

  useEffect(() => {
    loadData();
  }, [movieId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!analytics) {
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{analytics.movieTitle}</h2>
          <p className="text-gray-600">{t('movieAnalyticsDescription')}</p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('refresh')}
        </Button>
      </div>

      {/* Summary Cards */}
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
            <div className="text-3xl font-bold">{analytics.uniqueViewers}</div>
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
            <div className="text-3xl font-bold">{formatHours(analytics.totalWatchTime)}</div>
            <p className="text-sm text-gray-500">{t('avgPerSession')}: {formatDuration(analytics.averageWatchTime)}</p>
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
            <div className="text-3xl font-bold">{analytics.completions}</div>
            <p className="text-sm text-gray-500">
              {analytics.completionRate.toFixed(0)}% {t('completionRate')}
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
            <div className="text-3xl font-bold">{analytics.averageProgress.toFixed(0)}%</div>
            <p className="text-sm text-gray-500">{t('averageWatched')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              {t('viewingStats')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('totalSessions')}</span>
                <span className="font-semibold">{analytics.totalViews}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('uniqueViewers')}</span>
                <span className="font-semibold">{analytics.uniqueViewers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('totalWatchTime')}</span>
                <span className="font-semibold">{formatHours(analytics.totalWatchTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('avgSessionLength')}</span>
                <span className="font-semibold">{formatDuration(analytics.averageWatchTime)}</span>
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
                <span className="font-semibold">{analytics.completions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('completionRate')}</span>
                <span className="font-semibold">{analytics.completionRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('avgProgress')}</span>
                <span className="font-semibold">{analytics.averageProgress.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('lastWatched')}</span>
                <span className="font-semibold text-sm">
                  {analytics.lastWatched ? formatDate(analytics.lastWatched) : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('sessionHistory')}
          </CardTitle>
          <CardDescription>{t('allViewingSessions')}</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('noSessions')}</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    session.completed ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {session.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Play className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {formatDuration(session.totalWatchTime)} {t('watched')}
                      </p>
                      {session.completed && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          {t('completed')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(session.startedAt)} • {session.maxProgress.toFixed(0)}% {t('progress')}
                      {session.playCount > 1 && ` • ${session.playCount} plays`}
                    </p>
                  </div>
                  <div className="text-xs px-2 py-1 rounded bg-gray-200">
                    {session.deviceType}
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
