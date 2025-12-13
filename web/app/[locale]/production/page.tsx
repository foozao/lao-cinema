'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Header } from '@/components/header';
import { SubHeader } from '@/components/sub-header';
import { Footer } from '@/components/footer';
import { Search, Building2 } from 'lucide-react';
import { APIError } from '@/components/api-error';
import { productionCompaniesAPI } from '@/lib/api/client';
import { getCountryName } from '@/lib/i18n/get-country-name';
import { getProductionCompanyLogoUrl } from '@/lib/images';

interface ProductionCompany {
  id: number;
  name: { en?: string; lo?: string };
  logo_path?: string;
  custom_logo_url?: string;
  origin_country?: string;
  movie_count?: number;
}

export default function ProductionCompaniesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [companies, setCompanies] = useState<ProductionCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'network' | 'server' | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'movies'>('movies');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from URL params
  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchQuery(query);
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
    router.replace(`/${locale}/production${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [searchQuery, isInitialized, locale, router]);

  const loadCompanies = useCallback(async () => {
    try {
      setError(null);
      const response = await productionCompaniesAPI.getAll();
      setCompanies(response.companies || []);
    } catch (err) {
      console.error('Failed to load production companies:', err);
      setError('network');
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleRetry = () => {
    setIsRetrying(true);
    setLoading(true);
    loadCompanies();
  };

  // Filter and sort companies
  const filteredCompanies = companies
    .filter((company) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const nameEn = company.name?.en?.toLowerCase() || '';
      const nameLo = company.name?.lo?.toLowerCase() || '';
      return nameEn.includes(q) || nameLo.includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'movies') {
        const aCount = (a as any).movies?.length || a.movie_count || 0;
        const bCount = (b as any).movies?.length || b.movie_count || 0;
        return bCount - aCount;
      }
      const nameA = a.name?.[locale as 'en' | 'lo'] || a.name?.en || '';
      const nameB = b.name?.[locale as 'en' | 'lo'] || b.name?.en || '';
      return nameA.localeCompare(nameB, locale);
    });

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header variant="dark" />
      <SubHeader variant="dark" activePage="production" />

      <main className="container mx-auto px-4 py-8 flex-grow">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('movies.productionSection')}
          </h2>

          {/* Search and Sort */}
          <div className="flex gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('movies.searchForProduction')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'movies')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="movies">{t('admin.sortByMovies')}</option>
              <option value="name">{t('admin.sortByName')}</option>
            </select>
          </div>
        </div>

        {/* Companies Grid */}
        <section>
          {loading ? (
            <div className="py-20" />
          ) : error ? (
            <APIError 
              type={error} 
              onRetry={handleRetry} 
              isRetrying={isRetrying} 
            />
          ) : filteredCompanies.length > 0 ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {t('admin.showing')} {filteredCompanies.length} {t('admin.of')} {companies.length} {t('admin.productionCompanies').toLowerCase()}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCompanies.map((company) => {
                  const companyName = company.name?.[locale as 'en' | 'lo'] || company.name?.en || 'Unknown';
                  const logoUrl = getProductionCompanyLogoUrl(company);
                  const movieCount = (company as any).movies?.length || company.movie_count || 0;

                  return (
                    <Link
                      key={company.id}
                      href={`/production/${company.id}`}
                      className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {logoUrl ? (
                          <div className="w-12 h-12 rounded bg-white flex items-center justify-center p-1 flex-shrink-0 border border-gray-100">
                            <img 
                              src={logoUrl}
                              alt={companyName}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {companyName}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            {company.origin_country && (
                              <span>{getCountryName(company.origin_country)}</span>
                            )}
                            {company.origin_country && movieCount > 0 && (
                              <span>•</span>
                            )}
                            {movieCount > 0 && (
                              <span>{movieCount} {movieCount === 1 ? 'film' : 'films'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : searchQuery ? (
            <div className="text-center py-20">
              <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {t('admin.noResultsFound')}
              </h3>
            </div>
          ) : (
            <div className="text-center py-20">
              <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {t('admin.noProductionCompanies')}
              </h3>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
