'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Download, Search, ArrowUpDown } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';
import { getPosterUrl } from '@/lib/images';
import { useAdminList } from '@/hooks/use-admin-list';
import type { Movie } from '@/lib/types';

type SortOption = 'title-asc' | 'title-desc' | 'date-asc' | 'date-desc';

export default function MoviesAdminPage() {
  const t = useTranslations('admin');
  const tCrew = useTranslations('crew');
  
  const { filteredItems: filteredMovies, loading, searchQuery, setSearchQuery, sortBy, setSortBy } = useAdminList<Movie>({
    fetchFn: movieAPI.getAll,
    dataKey: 'movies',
    searchFields: (movie) => [
      getLocalizedText(movie.title, 'en'),
      getLocalizedText(movie.title, 'lo'),
    ],
    sortFn: (a, b, sort) => {
      switch (sort) {
        case 'title-asc':
          return getLocalizedText(a.title, 'en').localeCompare(getLocalizedText(b.title, 'en'));
        case 'title-desc':
          return getLocalizedText(b.title, 'en').localeCompare(getLocalizedText(a.title, 'en'));
        case 'date-asc':
          return (a.release_date || '').localeCompare(b.release_date || '');
        case 'date-desc':
          return (b.release_date || '').localeCompare(a.release_date || '');
        default:
          return 0;
      }
    },
    initialSort: 'title-asc',
  });

  // Helper to get director(s) from crew
  const getDirectors = (movie: Movie): string => {
    const directors = movie.crew?.filter((c) => getLocalizedText(c.job, 'en') === 'Director') || [];
    if (directors.length === 0) return '';
    const names = directors.map((d) => getLocalizedText(d.person.name, 'en')).join(', ');
    return `${tCrew('director')}: ${names}`;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('allMovies')}</h2>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/import">
            <Button variant="outline" className="flex-1 sm:flex-none">
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t('importFromTMDB')}</span>
              <span className="sm:hidden">Import</span>
            </Button>
          </Link>
          <Link href="/admin/add">
            <Button className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t('addNewMovie')}</span>
              <span className="sm:hidden">Add Movie</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder={t('searchMovies')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <ArrowUpDown className="w-4 h-4 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
          >
            <option value="title-asc">{t('sortTitleAZ')}</option>
            <option value="title-desc">{t('sortTitleZA')}</option>
            <option value="date-desc">{t('sortDateNewest')}</option>
            <option value="date-asc">{t('sortDateOldest')}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20" />
      ) : filteredMovies.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600 text-center">
              {searchQuery ? t('noMoviesFound') : t('noMoviesYetImport')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          {filteredMovies.map((movie) => {
            // Get poster from images array (primary first) or fallback to poster_path
            const primaryPoster = movie.images?.find(img => img.type === 'poster' && img.is_primary);
            const firstPoster = movie.images?.find(img => img.type === 'poster');
            const posterPath = primaryPoster?.file_path || firstPoster?.file_path || movie.poster_path;
            const posterUrl = getPosterUrl(posterPath, 'small');
            
            const director = getDirectors(movie);
            const genres = movie.genres?.map((g) => getLocalizedText(g.name, 'en')).join(', ') || '';
            
            return (
              <Link key={movie.id} href={`/admin/edit/${movie.id}`} className="block mb-3">
                <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:bg-gray-50 transition-all cursor-pointer h-24">
                  {/* Poster */}
                  <div className="flex-shrink-0">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={getLocalizedText(movie.title, 'en')}
                        className="w-16 h-24 object-cover"
                      />
                    ) : (
                      <div className="w-16 h-24 bg-gray-200 flex items-center justify-center">
                        <span className="text-xl">🎬</span>
                      </div>
                    )}
                  </div>

                  {/* Movie Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center px-4">
                    <div className="mb-1">
                      <h3 className="text-base font-semibold text-gray-900 leading-tight">
                        {getLocalizedText(movie.title, 'lo')}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {getLocalizedText(movie.title, 'en')}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                      <span>{movie.release_date || '—'}</span>
                      <span>{movie.runtime ? `${movie.runtime} ${t('min')}` : '—'}</span>
                      {director && <span>{director}</span>}
                      {genres && <span className="truncate max-w-48">{genres}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
      </div>
      )}
    </div>
  );
}
