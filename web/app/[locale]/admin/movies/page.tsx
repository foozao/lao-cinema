'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Download, ArrowLeft } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';
import type { Movie } from '@/lib/types';

export default function MoviesAdminPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMovies = async () => {
      try {
        const response = await movieAPI.getAll();
        setMovies(response.movies);
      } catch (error) {
        console.error('Failed to load movies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">All Movies</h2>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/import">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Import from TMDB
            </Button>
          </Link>
          <Link href="/admin/add">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add New Movie
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading movies...</p>
      ) : movies.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600 text-center">
              No movies yet. Import one from TMDB to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {movies.map((movie) => (
          <Card key={movie.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {getLocalizedText(movie.title, 'lo')}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {getLocalizedText(movie.title, 'en')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/edit/${movie.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Release Date:</span>
                  <p className="font-medium">{movie.release_date}</p>
                </div>
                <div>
                  <span className="text-gray-600">Runtime:</span>
                  <p className="font-medium">{movie.runtime} min</p>
                </div>
                <div>
                  <span className="text-gray-600">Rating:</span>
                  <p className="font-medium">{movie.vote_average}/10</p>
                </div>
                <div>
                  <span className="text-gray-600">Genres:</span>
                  <p className="font-medium">
                    {movie.genres.map((g) => getLocalizedText(g.name, 'en')).join(', ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}
