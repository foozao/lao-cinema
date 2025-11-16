'use client';

import { useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Download, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { mapTMDBToMovie, getMissingTranslations } from '@/lib/tmdb';
import type { TMDBMovieDetails } from '@/lib/tmdb';
import type { Movie } from '@/lib/types';
import { fetchMovieFromTMDB } from './actions';
import { movieAPI } from '@/lib/api/client';

// Helper to get TMDB image URL
function getTMDBImageUrl(path: string | null, size: 'w500' | 'w780' | 'original' = 'original'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export default function ImportFromTMDBPage() {
  const router = useRouter();
  const [tmdbId, setTmdbId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    tmdbData: TMDBMovieDetails;
    mappedMovie: Partial<Movie>;
    missingTranslations: string[];
  } | null>(null);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPreview(null);
    setLoading(true);

    try {
      const id = parseInt(tmdbId);
      if (isNaN(id)) {
        throw new Error('Please enter a valid TMDB ID (number)');
      }

      // Fetch from TMDB via Server Action
      const result = await fetchMovieFromTMDB(id);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch movie from TMDB');
      }

      const tmdbData = result.data;
      const credits = result.credits;
      
      // Map to our schema (including cast/crew)
      const mappedMovie = mapTMDBToMovie(tmdbData, credits);
      
      // Check for missing translations
      const missingTranslations = getMissingTranslations(mappedMovie);

      setPreview({
        tmdbData,
        mappedMovie,
        missingTranslations,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch movie from TMDB');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    setLoading(true);
    setError(null);

    try {
      // Save movie to backend
      const savedMovie = await movieAPI.create(preview.mappedMovie);
      
      alert(
        `Movie "${preview.tmdbData.title}" imported successfully!\n\n` +
        'Redirecting to edit page where you can add Lao translations.'
      );

      // Redirect to edit page
      router.push(`/admin/edit/${savedMovie.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import movie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Import from TMDB</h2>
        <Link href="/admin/people">
          <Button variant="outline" className="gap-2">
            <Users className="w-4 h-4" />
            Manage People
          </Button>
        </Link>
      </div>

      {/* Search Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enter TMDB Movie ID</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFetch} className="space-y-4">
            <div>
              <Label htmlFor="tmdb_id">TMDB ID</Label>
              <div className="flex gap-2">
                <Input
                  id="tmdb_id"
                  type="text"
                  value={tmdbId}
                  onChange={(e) => setTmdbId(e.target.value)}
                  placeholder="e.g., 1126026 for The Signal"
                  required
                />
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>Loading...</>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Fetch
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Find the TMDB ID by searching on{' '}
                <a
                  href="https://www.themoviedb.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  themoviedb.org
                </a>
                {' '}(it's in the URL)
              </p>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {preview && (
        <>
          {/* Missing Translations Warning */}
          {preview.missingTranslations.length > 0 && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Missing Lao Translations
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      The following fields need Lao translations:
                    </p>
                    <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
                      {preview.missingTranslations.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                    <p className="text-sm text-yellow-700 mt-2">
                      You can add these after importing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Movie Preview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Preview: {preview.tmdbData.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Poster */}
              {preview.tmdbData.poster_path && (
                <div>
                  <img
                    src={getTMDBImageUrl(preview.tmdbData.poster_path, 'w500') || ''}
                    alt={preview.tmdbData.title}
                    className="w-48 rounded-lg shadow-md"
                  />
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Release Date:</span>
                  <p className="font-medium">{preview.tmdbData.release_date}</p>
                </div>
                <div>
                  <span className="text-gray-600">Runtime:</span>
                  <p className="font-medium">{preview.tmdbData.runtime} min</p>
                </div>
                <div>
                  <span className="text-gray-600">Rating:</span>
                  <p className="font-medium">{preview.tmdbData.vote_average.toFixed(1)}/10</p>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <p className="font-medium">{preview.tmdbData.status}</p>
                </div>
              </div>

              {/* Overview */}
              <div>
                <span className="text-sm text-gray-600">Overview:</span>
                <p className="text-sm mt-1">{preview.tmdbData.overview}</p>
              </div>

              {/* Tagline */}
              {preview.tmdbData.tagline && (
                <div>
                  <span className="text-sm text-gray-600">Tagline:</span>
                  <p className="text-sm italic mt-1">"{preview.tmdbData.tagline}"</p>
                </div>
              )}

              {/* Genres */}
              <div>
                <span className="text-sm text-gray-600">Genres:</span>
                <p className="text-sm mt-1">
                  {preview.tmdbData.genres.map((g) => g.name).join(', ')}
                </p>
              </div>

              {/* Budget & Revenue */}
              {(preview.tmdbData.budget > 0 || preview.tmdbData.revenue > 0) && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {preview.tmdbData.budget > 0 && (
                    <div>
                      <span className="text-gray-600">Budget:</span>
                      <p className="font-medium">
                        ${preview.tmdbData.budget.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {preview.tmdbData.revenue > 0 && (
                    <div>
                      <span className="text-gray-600">Revenue:</span>
                      <p className="font-medium">
                        ${preview.tmdbData.revenue.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cast & Crew */}
              {preview.mappedMovie.cast && preview.mappedMovie.cast.length > 0 && (
                <div>
                  <span className="text-sm text-gray-600 font-medium">Cast:</span>
                  <p className="text-sm mt-1">
                    {preview.mappedMovie.cast.slice(0, 5).map((c) => c.person.name.en).join(', ')}
                    {preview.mappedMovie.cast.length > 5 && ` and ${preview.mappedMovie.cast.length - 5} more`}
                  </p>
                </div>
              )}

              {preview.mappedMovie.crew && preview.mappedMovie.crew.length > 0 && (
                <div>
                  <span className="text-sm text-gray-600 font-medium">Crew:</span>
                  <div className="text-sm mt-1 space-y-1">
                    {preview.mappedMovie.crew.slice(0, 5).map((c, index) => (
                      <div key={`crew-${c.person.id}-${index}`}>
                        <strong>{c.person.name.en}</strong> - {c.job.en}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPreview(null);
                setTmdbId('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImport}>
              <Download className="w-4 h-4 mr-2" />
              Import Movie
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
