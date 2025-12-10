'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { MovieCard } from '@/components/movie-card';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Search, User, Film } from 'lucide-react';
import { APIError } from '@/components/api-error';
import type { Movie, Person } from '@/lib/types';
import { SHORT_FILM_THRESHOLD_MINUTES } from '@/lib/constants';
import { getMovieUrl } from '@/lib/movie-url';
import { peopleAPI } from '@/lib/api/client';

function MoviesPageContent() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'network' | 'server' | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'feature' | 'short' | 'people'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc'>('date-desc');
  const [isInitialized, setIsInitialized] = useState(false);
  const [searchedPeople, setSearchedPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  // Initialize state from URL params
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const filter = searchParams.get('filter') as 'all' | 'feature' | 'short' | 'people' | null;
    const sort = searchParams.get('sort') as 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc' | null;
    
    setSearchQuery(query);
    if (filter && ['all', 'feature', 'short', 'people'].includes(filter)) {
      setFilterType(filter);
    }
    if (sort && ['date-desc', 'date-asc', 'alpha-asc', 'alpha-desc'].includes(sort)) {
      setSortBy(sort);
    }
    setIsInitialized(true);
  }, [searchParams]);

  // Load movies
  const loadMovies = useCallback(async () => {
    try {
      setError(null);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
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

  // Search people via API
  useEffect(() => {
    const searchPeople = async () => {
      if (!searchQuery || filterType === 'feature' || filterType === 'short') {
        setSearchedPeople([]);
        return;
      }

      setPeopleLoading(true);
      try {
        const response = await peopleAPI.search(searchQuery);
        setSearchedPeople(response.people || []);
      } catch (error) {
        console.error('Failed to search people:', error);
        setSearchedPeople([]);
      } finally {
        setPeopleLoading(false);
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(searchPeople, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterType]);

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
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '';
    
    // Use replace to avoid adding to history stack
    router.replace(`/${locale}/movies${newUrl}`, { scroll: false });
  }, [searchQuery, filterType, sortBy, router, locale, isInitialized]);

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

  // Get people with their movie credits
  interface PersonMatch {
    person: Person;
    movies: { movie: Movie; role: string; type: 'cast' | 'crew' }[];
  }

  const getMatchingPeople = (): PersonMatch[] => {
    if (!searchedPeople.length) return [];
    
    // For each person from API search, find their movies in the loaded movies
    return searchedPeople.map(person => {
      const personMovies: { movie: Movie; role: string; type: 'cast' | 'crew' }[] = [];
      
      movies.forEach(movie => {
        // Check if person is in cast
        movie.cast?.forEach(member => {
          if (member.person?.id === person.id) {
            const characterName = member.character?.[locale as 'en' | 'lo'] || member.character?.en || '';
            personMovies.push({
              movie,
              role: characterName,
              type: 'cast'
            });
          }
        });
        
        // Check if person is in crew
        movie.crew?.forEach(member => {
          if (member.person?.id === person.id) {
            const jobName = member.job?.[locale as 'en' | 'lo'] || member.job?.en || member.department || '';
            personMovies.push({
              movie,
              role: jobName,
              type: 'crew'
            });
          }
        });
      });
      
      return {
        person,
        movies: personMovies
      };
    });
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

  const filteredMovies = sortMovies(movies.filter((movie) => {
    // Filter by search query
    if (searchQuery) {
      const matchType = getMatchType(movie, searchQuery);
      if (!matchType) return false;
    }
    
    // Filter by film type (feature vs short) - skip if filtering by people only
    if (filterType !== 'all' && filterType !== 'people') {
      const runtime = movie.runtime || 0;
      const isShort = runtime <= SHORT_FILM_THRESHOLD_MINUTES;
      
      if (filterType === 'short' && !isShort) return false;
      if (filterType === 'feature' && isShort) return false;
    }
    
    return true;
  }));

  // Separate movies by match type when searching
  const moviesByTitle = searchQuery ? filteredMovies.filter(m => getMatchType(m, searchQuery) === 'title') : filteredMovies;
  const moviesByCastCrew = searchQuery ? filteredMovies.filter(m => {
    const type = getMatchType(m, searchQuery);
    return type === 'cast' || type === 'crew';
  }) : [];
  const matchingPeople = searchQuery ? getMatchingPeople() : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black flex flex-col">
      {/* Header */}
      <Header variant="light" />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-grow">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('nav.movies')}
          </h2>

          {/* Search Bar and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('movies.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Film Type Toggle */}
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
                onClick={() => setFilterType('people')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterType === 'people'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t('movies.people')}
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
          ) : filterType === 'people' && !searchQuery ? (
            <div className="text-center py-20">
              <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {t('movies.searchForPeople')}
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                {t('movies.searchForPeopleDescription')}
              </p>
            </div>
          ) : filteredMovies.length > 0 || matchingPeople.length > 0 ? (
            <>
              {/* Result count at top */}
              {!searchQuery && filterType !== 'people' && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {t('admin.showing')} {filteredMovies.length} {t('admin.of')} {movies.length} {t('admin.movies')}
                </p>
              )}

              {/* Movies Section */}
              {moviesByTitle.length > 0 && filterType !== 'people' && (
                <div className="mb-12">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    {t('movies.moviesSection')} ({moviesByTitle.length})
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {moviesByTitle.slice(0, searchQuery ? 4 : undefined).map((movie) => (
                      <MovieCard key={movie.id} movie={movie} />
                    ))}
                  </div>
                  {searchQuery && moviesByTitle.length > 4 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                      {t('movies.andMore', { count: moviesByTitle.length - 4 })}
                    </p>
                  )}
                </div>
              )}

              {/* People Section */}
              {matchingPeople.length > 0 && (filterType === 'all' || filterType === 'people') && (
                <div className="mb-12">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    {t('movies.peopleSection')} ({matchingPeople.length})
                  </h3>
                  <div className="space-y-3">
                    {matchingPeople.slice(0, 20).map((personMatch) => {
                      const personName = personMatch.person.name?.[locale as 'en' | 'lo'] || personMatch.person.name?.en || '';
                      const profilePath = personMatch.person.profile_path;
                      const imageUrl = profilePath 
                        ? `https://image.tmdb.org/t/p/w185${profilePath}`
                        : null;
                      
                      return (
                        <div key={personMatch.person.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                          <div className="flex items-start gap-3">
                            <Link 
                              href={`/people/${personMatch.person.id}`}
                              className="flex-shrink-0"
                            >
                              {imageUrl ? (
                                <img 
                                  src={imageUrl}
                                  alt={personName}
                                  className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-700 hover:opacity-80 transition-opacity cursor-pointer"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                                  <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </div>
                              )}
                            </Link>
                            <div className="flex-1 min-w-0">
                              <Link 
                                href={`/people/${personMatch.person.id}`}
                                className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 mb-1 inline-block"
                              >
                                {personName}
                              </Link>
                              {/* Display nicknames */}
                              {personMatch.person.nicknames && (personMatch.person.nicknames.en || personMatch.person.nicknames.lo) && (
                                <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                                  {personMatch.person.nicknames.en?.map((nickname: string, index: number) => (
                                    <span
                                      key={`en-${index}`}
                                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded"
                                    >
                                      {nickname}
                                    </span>
                                  ))}
                                  {personMatch.person.nicknames.lo?.map((nickname: string, index: number) => (
                                    <span
                                      key={`lo-${index}`}
                                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded"
                                    >
                                      {nickname}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="space-y-1">
                                {personMatch.movies.slice(0, 3).map((movieRole, idx) => {
                                  const movieTitle = movieRole.movie.title?.[locale as 'en' | 'lo'] || movieRole.movie.title?.en || '';
                                  return (
                                    <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                                      <Link 
                                        href={getMovieUrl(movieRole.movie)}
                                        className="font-medium hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                                      >
                                        {movieTitle}
                                      </Link>
                                      {movieRole.role && (
                                        <span className="text-gray-500 dark:text-gray-500"> • {movieRole.role}</span>
                                      )}
                                    </p>
                                  );
                                })}
                                {personMatch.movies.length > 3 && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('movies.andMoreMovies', { count: personMatch.movies.length - 3 })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {matchingPeople.length > 20 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                      {t('movies.andMore', { count: matchingPeople.length - 20 })}
                    </p>
                  )}
                </div>
              )}
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
      <Footer />
    </div>
  );
}

// No need for Suspense wrapper - progress bar handles navigation,
// delayed spinner handles data fetching
export default function MoviesPage() {
  return <MoviesPageContent />;
}
