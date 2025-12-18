'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Header } from '@/components/header';
import { SubHeader } from '@/components/sub-header';
import { Footer } from '@/components/footer';
import { Search, User } from 'lucide-react';
import { APIError } from '@/components/api-error';
import { peopleAPI } from '@/lib/api/client';
import { getProfileUrl } from '@/lib/images';

interface MovieCredit {
  movie_id: string;
  movie_title: { en?: string; lo?: string };
  role?: { en?: string; lo?: string };
  type: 'cast' | 'crew';
}

interface Person {
  id: number;
  name: { en?: string; lo?: string };
  profile_path?: string;
  known_for_department?: string;
  movie_credits?: MovieCredit[];
}

export default function PeoplePage() {
  const t = useTranslations();
  const locale = useLocale() as 'en' | 'lo';
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<'network' | 'server' | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from URL params
  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchQuery(query);
    if (query) setHasSearched(true);
    setIsInitialized(true);
  }, [searchParams]);

  // Update URL when search changes
  useEffect(() => {
    if (!isInitialized) return;
    
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }
    const queryString = params.toString();
    router.replace(`/${locale}/people${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [searchQuery, isInitialized, locale, router]);

  // Search people when query changes (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      if (isInitialized) setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      try {
        const response = await peopleAPI.search(searchQuery.trim(), 50);
        // Sort alphabetically
        const sorted = (response.people || []).sort((a: Person, b: Person) => {
          const nameA = a.name?.[locale] || a.name?.en || '';
          const nameB = b.name?.[locale] || b.name?.en || '';
          return nameA.localeCompare(nameB, locale);
        });
        setSearchResults(sorted);
      } catch (err) {
        console.error('Failed to search people:', err);
        setError('network');
      } finally {
        setLoading(false);
        setIsRetrying(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, locale, isInitialized]);

  const handleRetry = () => {
    setIsRetrying(true);
    setSearchQuery(searchQuery); // Trigger re-search
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header variant="dark" />
      <SubHeader variant="dark" activePage="people" />

      <main className="container mx-auto px-4 py-8 flex-grow">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('movies.peopleSection')}
          </h2>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('movies.searchForPeople')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* People Results */}
        <section>
          {loading ? (
            <div className="py-20" />
          ) : error ? (
            <APIError 
              type={error} 
              onRetry={handleRetry} 
              isRetrying={isRetrying} 
            />
          ) : !hasSearched ? (
            <div className="text-center py-20">
              <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {t('movies.searchForPeople')}
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                {t('movies.searchForPeopleDescription')}
              </p>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <p className="text-sm text-gray-400 mb-6">
                {searchResults.length} {t('admin.people')} {t('admin.matching')} "{searchQuery}"
              </p>

              <div className="space-y-3">
                {searchResults.map((person) => {
                  const personName = person.name?.[locale] || person.name?.en || 'Unknown';
                  const imageUrl = getProfileUrl(person.profile_path, 'medium');

                  return (
                    <Link
                      key={person.id}
                      href={`/people/${person.id}`}
                      className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all"
                    >
                      {/* Profile Photo */}
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                        {imageUrl ? (
                          <img 
                            src={imageUrl}
                            alt={personName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                      </div>
                      
                      {/* Name and Credits */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {personName}
                        </h3>
                        {person.movie_credits && person.movie_credits.length > 0 && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                            {person.movie_credits.map((credit) => {
                              const movieTitle = credit.movie_title?.[locale] || credit.movie_title?.en || '';
                              const role = credit.role?.[locale] || credit.role?.en;
                              return (
                                <div key={`${credit.movie_id}-${credit.type}`}>
                                  <span>{movieTitle}</span>
                                  {role && (
                                    <span className="text-gray-400 dark:text-gray-500"> · {role}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {t('admin.noResultsFound')}
              </h3>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
