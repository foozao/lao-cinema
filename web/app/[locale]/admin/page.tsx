'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Film, Users, Download, ArrowRight, Home, BarChart3 } from 'lucide-react';
import { movieAPI, peopleAPI } from '@/lib/api/client';

export default function AdminPage() {
  const t = useTranslations('admin');
  const [stats, setStats] = useState({
    moviesCount: 0,
    peopleCount: 0,
    loading: true,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [moviesResponse, peopleResponse] = await Promise.all([
          movieAPI.getAll(),
          peopleAPI.getAll(),
        ]);
        setStats({
          moviesCount: moviesResponse.movies.length,
          peopleCount: peopleResponse.people.length,
          loading: false,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('adminDashboard')}</h2>
        <p className="text-gray-600">{t('manageMoviesAndPeople')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Homepage Card */}
        <Link href="/admin/homepage">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Home className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>{t('homepage')}</CardTitle>
                    <CardDescription>{t('customizeFeatured')}</CardDescription>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {t('selectHomepageFilms')}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Movies Card */}
        <Link href="/admin/movies">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Film className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>{t('movies')}</CardTitle>
                    <CardDescription>{t('manageMovieCatalog')}</CardDescription>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {stats.loading ? '...' : stats.moviesCount}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {t('totalMoviesInDatabase')}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* People Card */}
        <Link href="/admin/people">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>{t('people')}</CardTitle>
                    <CardDescription>{t('manageCastAndCrew')}</CardDescription>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {stats.loading ? '...' : stats.peopleCount}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {t('totalPeopleInDatabase')}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Analytics Card */}
        <Link href="/admin/analytics">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>{t('analytics')}</CardTitle>
                    <CardDescription>{t('viewAnalytics')}</CardDescription>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Track watch time, completions, and engagement metrics
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('quickActions')}</CardTitle>
          <CardDescription>{t('commonTasks')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/admin/import">
              <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">{t('importFromTMDB')}</p>
                  <p className="text-sm text-gray-600">{t('addMoviesFromTMDB')}</p>
                </div>
              </div>
            </Link>
            <Link href="/admin/add">
              <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Film className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">{t('addNewMovie')}</p>
                  <p className="text-sm text-gray-600">{t('manuallyCreateMovie')}</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
