'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { AnimatedMovieGrid } from '@/components/animated-movie-grid';
import { Header } from '@/components/header';
import { SubHeader } from '@/components/sub-header';
import { Footer } from '@/components/footer';
import { Search, Film } from 'lucide-react';
import { APIError } from '@/components/api-error';
import type { Movie, Genre } from '@/lib/types';
import { API_BASE_URL, SHORT_FILM_THRESHOLD_MINUTES } from '@/lib/config';
import { getLocalizedText } from '@/lib/i18n';
import { getGenreKey } from '@/lib/genres';

function MoviesPageContent() {
  const t = useTranslations();
  const tGenres = useTranslations('genres');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'network' | 'server' | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'feature' | 'short'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc'>('date-desc');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize state from URL params
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const filter = searchParams.get('filter') as 'all' | 'feature' | 'short' | null;
    const sort = searchParams.get('sort') as 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc' | null;
    const unavailable = searchParams.get('unavailable') === 'true';
    const genre = searchParams.get('genre');
    
    setSearchQuery(query);
    if (filter && ['all', 'feature', 'short'].includes(filter)) {
      setFilterType(filter);
    }
    if (sort && ['date-desc', 'date-asc', 'alpha-asc', 'alpha-desc'].includes(sort)) {
      setSortBy(sort);
    }
    setShowUnavailable(unavailable);
    setSelectedGenre(genre ? parseInt(genre, 10) : null);
    setIsInitialized(true);
  }, [searchParams]);

  // Load movies
  const loadMovies = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/movies`);
      
      if (!response.ok) {
        setError('server');
        return;
      }
      
      const data = await response.json();
      setMovies(data.movies || []);
    } catch (err) {
      console.error('Failed to load movies:', err);
      setError('network');
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const handleRetry = () => {
    setIsRetrying(true);
    setLoading(true);
    loadMovies();
  };

  // Update URL when search query, filter, or sort changes (after initialization)
  useEffect(() => {
    if (!isInitialized) return;
    
    const params = new URLSearchParams();
    
    if (searchQuery) {
      params.set('q', searchQuery);
    }
    
    if (filterType !== 'all') {
      params.set('filter', filterType);
    }
    
    if (sortBy !== 'date-desc') {
      params.set('sort', sortBy);
    }
    
    if (showUnavailable) {
      params.set('unavailable', 'true');
    }
    
    if (selectedGenre !== null) {
      params.set('genre', selectedGenre.toString());
    }
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '';
    
    // Use replace to avoid adding to history stack
    router.replace(`/${locale}/movies${newUrl}`, { scroll: false });
  }, [searchQuery, filterType, sortBy, showUnavailable, selectedGenre, router, locale, isInitialized]);

  // Helper function to get match type for a movie
  const getMatchType = (movie: Movie, query: string): 'title' | 'cast' | 'crew' | null => {
    if (!query) return null;
    
    const q = query.toLowerCase();
    
    // Check title match
    const title = movie.title?.[locale as 'en' | 'lo']?.toLowerCase() || '';
    const originalTitle = movie.original_title?.toLowerCase() || '';
    if (title.includes(q) || originalTitle.includes(q)) {
      return 'title';
    }
    
    // Check cast match
    if (movie.cast && movie.cast.length > 0) {
      const castMatch = movie.cast.some(member => {
        const name = member.person?.name?.[locale as 'en' | 'lo']?.toLowerCase() || 
                     member.person?.name?.en?.toLowerCase() || '';
        return name.includes(q);
      });
      if (castMatch) return 'cast';
    }
    
    // Check crew match
    if (movie.crew && movie.crew.length > 0) {
      const crewMatch = movie.crew.some(member => {
        const name = member.person?.name?.[locale as 'en' | 'lo']?.toLowerCase() || 
                     member.person?.name?.en?.toLowerCase() || '';
        return name.includes(q);
      });
      if (crewMatch) return 'crew';
    }
    
    return null;
  };

  // Sort movies helper
  const sortMovies = (moviesToSort: Movie[]) => {
    const sorted = [...moviesToSort];
    
    switch (sortBy) {
      case 'date-desc':
        return sorted.sort((a, b) => {
          const dateA = a.release_date || '';
          const dateB = b.release_date || '';
          return dateB.localeCompare(dateA);
        });
      case 'date-asc':
        return sorted.sort((a, b) => {
          const dateA = a.release_date || '';
          const dateB = b.release_date || '';
          return dateA.localeCompare(dateB);
        });
      case 'alpha-asc':
        return sorted.sort((a, b) => {
          const titleA = a.title?.[locale as 'en' | 'lo'] || a.original_title || '';
          const titleB = b.title?.[locale as 'en' | 'lo'] || b.original_title || '';
          return titleA.localeCompare(titleB, locale);
        });
      case 'alpha-desc':
        return sorted.sort((a, b) => {
          const titleA = a.title?.[locale as 'en' | 'lo'] || a.original_title || '';
          const titleB = b.title?.[locale as 'en' | 'lo'] || b.original_title || '';
          return titleB.localeCompare(titleA, locale);
        });
      default:
        return sorted;
    }
  };

  // Extract unique genres from all movies
  const allGenres: Genre[] = [];
  const genreMap = new Map<number, Genre>();
  
  movies.forEach(movie => {
    movie.genres?.forEach(genre => {
      if (!genreMap.has(genre.id)) {
        genreMap.set(genre.id, genre);
        allGenres.push(genre);
      }
    });
  });
  
  // Sort genres alphabetically by localized name
  const sortedGenres = allGenres.sort((a, b) => {
    const nameA = getLocalizedText(a.name, locale as 'en' | 'lo');
    const nameB = getLocalizedText(b.name, locale as 'en' | 'lo');
    return nameA.localeCompare(nameB, locale);
  });

  const filteredMovies = sortMovies(movies.filter((movie) => {
    // Filter by search query
    if (searchQuery) {
      const matchType = getMatchType(movie, searchQuery);
      if (!matchType) return false;
    }
    
    // Filter by genre
    if (selectedGenre !== null) {
      const hasGenre = movie.genres.some(g => g.id === selectedGenre);
      if (!hasGenre) return false;
    }
    
    // Filter by film type (feature vs short)
    if (filterType !== 'all') {
      const runtime = movie.runtime || 0;
      const isShort = runtime <= SHORT_FILM_THRESHOLD_MINUTES;
      
      if (filterType === 'short' && !isShort) return false;
      if (filterType === 'feature' && isShort) return false;
    }
    
    // Filter by availability status
    if (!showUnavailable) {
      const status = movie.availability_status;
      const hasVideoSources = movie.video_sources && movie.video_sources.length > 0;
      const hasExternalPlatforms = movie.external_platforms && movie.external_platforms.length > 0;
      
      // Show if: available now, coming soon, or externally available
      // Hide if: unavailable status OR (no video sources AND no external platforms)
      if (status === 'unavailable') return false;
      if (!hasVideoSources && !hasExternalPlatforms && status !== 'coming_soon') return false;
    }
    
    return true;
  }));


  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <Header variant="dark" />
      <SubHeader variant="dark" activePage="movies" />

      {/* Main Content */}
      <main className="w-full mx-auto px-3 py-8 flex-grow max-w-[1600px]">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('nav.movies')}
          </h2>

          {/* Search Bar and Filters */}
          <div className="flex flex-col gap-4">
            {/* Genre Chips - Horizontal Scrollable */}
            {sortedGenres.length > 0 && (
              <div className="-mx-4 px-4">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  <button
                    onClick={() => setSelectedGenre(null)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                      selectedGenre === null
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {t('movies.all')}
                  </button>
                  {sortedGenres.map((genre) => {
                    const genreName = getLocalizedText(genre.name, 'en');
                    const genreKey = getGenreKey(genreName);
                    return (
                      <button
                        key={genre.id}
                        onClick={() => setSelectedGenre(genre.id)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                          selectedGenre === genre.id
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        {tGenres(genreKey)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Search, Filters, and Sort - Horizontal Row */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('admin.searchMovies')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Filter Buttons */}
              <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {t('movies.all')}
                </button>
                <button
                  onClick={() => setFilterType('feature')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filterType === 'feature'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {t('movies.feature')}
                </button>
                <button
                  onClick={() => setFilterType('short')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filterType === 'short'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {t('movies.short')}
                </button>
              </div>
              
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date-desc">{t('movies.sortNewest')}</option>
                <option value="date-asc">{t('movies.sortOldest')}</option>
                <option value="alpha-asc">{t('movies.sortAlphaAsc')}</option>
                <option value="alpha-desc">{t('movies.sortAlphaDesc')}</option>
              </select>
            </div>
            
            {/* Availability Toggle - Separate Row */}
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer w-fit">
              <input 
                type="checkbox" 
                checked={showUnavailable}
                onChange={(e) => setShowUnavailable(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              />
              {t('movies.showUnavailable')}
            </label>
          </div>
        </div>

        {/* Movie Grid */}
        <section>
          {loading ? (
            // Show blank space during loading
            <div className="py-20" />
          ) : error ? (
            <APIError 
              type={error} 
              onRetry={handleRetry} 
              isRetrying={isRetrying} 
            />
          ) : filteredMovies.length > 0 ? (
            <>
              {/* Result count at top */}
              {!searchQuery && (
                <p className="text-sm text-gray-400 mb-6">
                  {t('admin.showing')} {filteredMovies.length} {t('admin.of')} {movies.length} {t('admin.movies')}
                </p>
              )}

              {/* Movies Grid */}
              <AnimatedMovieGrid movies={filteredMovies} />
            </>
          ) : searchQuery ? (
            <div className="text-center py-20">
              <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {t('admin.noMoviesFound')}
              </h3>
            </div>
          ) : (
            <div className="text-center py-20">
              <Film className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {t('home.noFilms')}
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                {t('home.noFilmsDescription')}
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <Footer variant="dark" />
    </div>
  );
}

// No need for Suspense wrapper - progress bar handles navigation,
// delayed spinner handles data fetching
export default function MoviesPage() {
  return <MoviesPageContent />;
}
