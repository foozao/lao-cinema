'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Film, Users, Download, ArrowRight, Home } from 'lucide-react';
import { movieAPI, peopleAPI } from '@/lib/api/client';

export default function AdminPage() {
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
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h2>
        <p className="text-gray-600">Manage your movies and people</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
                    <CardTitle>Homepage</CardTitle>
                    <CardDescription>Customize featured films</CardDescription>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Select which films appear on the homepage
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
                    <CardTitle>Movies</CardTitle>
                    <CardDescription>Manage your movie catalog</CardDescription>
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
                Total movies in database
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
                    <CardTitle>People</CardTitle>
                    <CardDescription>Manage cast and crew</CardDescription>
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
                Total people in database
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/admin/import">
              <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Import from TMDB</p>
                  <p className="text-sm text-gray-600">Add movies from TMDB database</p>
                </div>
              </div>
            </Link>
            <Link href="/admin/add">
              <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Film className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Add New Movie</p>
                  <p className="text-sm text-gray-600">Manually create a movie entry</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
