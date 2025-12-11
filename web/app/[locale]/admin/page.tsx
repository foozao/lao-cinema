'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Film, Users, Download, ArrowRight, Home, BarChart3, RefreshCw, Building2 } from 'lucide-react';
import { movieAPI, peopleAPI, productionCompaniesAPI } from '@/lib/api/client';
import { syncSingleMovieFromTMDB } from './actions';

export default function AdminPage() {
  const t = useTranslations('admin');
  const [stats, setStats] = useState({
    moviesCount: 0,
    peopleCount: 0,
    companiesCount: 0,
    loading: true,
  });
  
  // State for sync all functionality
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, currentTitle: '' });
  const [syncResults, setSyncResults] = useState<{ synced: number; skipped: number; failed: number } | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [moviesResponse, peopleResponse, companiesResponse] = await Promise.all([
          movieAPI.getAll(),
          peopleAPI.getAll(),
          productionCompaniesAPI.getAll(),
        ]);
        setStats({
          moviesCount: moviesResponse.movies.length,
          peopleCount: peopleResponse.people.length,
          companiesCount: companiesResponse.companies.length,
          loading: false,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, []);

  // Sync all movies from TMDB
  const handleSyncAllMovies = async () => {
    if (syncingAll) return;
    
    if (!confirm('This will sync all movies that have a TMDB ID. This may take a while. Continue?')) {
      return;
    }
    
    setSyncingAll(true);
    setSyncResults(null);
    
    try {
      // Get all movies
      const { movies } = await movieAPI.getAll();
      const moviesWithTmdb = movies.filter(m => m.tmdb_id);
      
      setSyncProgress({ current: 0, total: moviesWithTmdb.length, currentTitle: '' });
      
      let synced = 0;
      let skipped = 0;
      let failed = 0;
      
      for (let i = 0; i < moviesWithTmdb.length; i++) {
        const movie = moviesWithTmdb[i];
        const title = movie.title?.en || movie.original_title || 'Unknown';
        setSyncProgress({ current: i + 1, total: moviesWithTmdb.length, currentTitle: title });
        
        try {
          // Fetch from TMDB using server action (keeps API key secure)
          const result = await syncSingleMovieFromTMDB(movie.tmdb_id);
          
          if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to fetch from TMDB');
          }
          
          const syncedData = result.data;
          
          // Update the movie (preserve existing Lao translations)
          await movieAPI.update(movie.id, {
            ...syncedData,
            // Preserve existing Lao translations
            title: { en: syncedData.title.en, lo: movie.title?.lo },
            overview: { en: syncedData.overview.en, lo: movie.overview?.lo },
            tagline: syncedData.tagline?.en ? { en: syncedData.tagline.en, lo: movie.tagline?.lo } : undefined,
          });
          
          synced++;
        } catch (error) {
          console.error(`Failed to sync movie ${title}:`, error);
          failed++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      
      setSyncResults({ synced, skipped, failed });
    } catch (error) {
      console.error('Failed to sync all movies:', error);
      alert('Failed to sync movies. Check console for details.');
    } finally {
      setSyncingAll(false);
      // Reload stats
      const [moviesResponse, peopleResponse, companiesResponse] = await Promise.all([
        movieAPI.getAll(),
        peopleAPI.getAll(),
        productionCompaniesAPI.getAll(),
      ]);
      setStats({
        moviesCount: moviesResponse.movies.length,
        peopleCount: peopleResponse.people.length,
        companiesCount: companiesResponse.companies.length,
        loading: false,
      });
    }
  };

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

        {/* Production Companies Card */}
        <Link href="/admin/production-companies">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-teal-100 rounded-lg">
                    <Building2 className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle>Production Companies</CardTitle>
                    <CardDescription>Manage studios</CardDescription>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {stats.loading ? '...' : stats.companiesCount}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Total companies in database
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
            <button
              onClick={handleSyncAllMovies}
              disabled={syncingAll}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${syncingAll ? 'animate-spin' : ''}`} />
              <div>
                <p className="font-medium text-gray-900">
                  {syncingAll ? 'Syncing...' : 'Sync All from TMDB'}
                </p>
                <p className="text-sm text-gray-600">
                  {syncingAll 
                    ? `${syncProgress.current}/${syncProgress.total}: ${syncProgress.currentTitle}`
                    : 'Update all movies with TMDB data'
                  }
                </p>
              </div>
            </button>
          </div>
          
          {/* Sync Results */}
          {syncResults && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">Sync Complete!</p>
              <p className="text-sm text-green-700">
                {syncResults.synced} synced, {syncResults.failed} failed
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
