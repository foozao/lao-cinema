'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Building2, Film } from 'lucide-react';
import { productionCompaniesAPI } from '@/lib/api/client';
import { getLocalizedText } from '@/lib/i18n';
import { getCountryName } from '@/lib/i18n/get-country-name';
import { getPosterUrl, getProductionCompanyLogoUrl } from '@/lib/images';
import { getMoviePath } from '@/lib/movie-url';

interface ProductionCompany {
  id: number;
  name: { en?: string; lo?: string };
  logo_path?: string;
  custom_logo_url?: string;
  origin_country?: string;
  movies: Array<{
    id: string;
    title: { en?: string; lo?: string };
    poster_path?: string;
    release_date?: string;
  }>;
}

export default function ProductionCompanyPage() {
  const params = useParams();
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const companyId = parseInt(params.id as string);
  
  const [company, setCompany] = useState<ProductionCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    const loadCompany = async () => {
      try {
        const companyData = await productionCompaniesAPI.getById(companyId);
        setCompany(companyData);
      } catch (error) {
        console.error('Failed to load production company:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [companyId]);

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black" />;
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <Header variant="dark" />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-gray-400">Production company not found</p>
        </div>
      </div>
    );
  }

  const companyName = typeof company.name === 'string' 
    ? company.name 
    : (company.name[locale] || company.name.en || company.name.lo || 'Unknown');
  const companyNameEn = typeof company.name === 'string' 
    ? company.name 
    : (company.name.en || company.name.lo || 'Unknown');
  const companyNameLo = typeof company.name === 'string' 
    ? '' 
    : (company.name.lo || '');
  const hasLaoName = companyNameLo && companyNameLo !== companyNameEn;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col">
      <Header variant="dark" />

      <main className="container mx-auto px-4 pt-8 pb-8 flex-1">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar - Logo & Info */}
          <aside className="md:w-64 flex-shrink-0">
            {getProductionCompanyLogoUrl(company, 'w500') ? (
              <div className="w-full max-w-[250px] mx-auto md:mx-0 bg-white rounded-lg p-6 shadow-lg">
                <img
                  src={getProductionCompanyLogoUrl(company, 'w500')!}
                  alt={companyName}
                  className="w-full h-auto object-contain"
                />
              </div>
            ) : (
              <div className="w-full max-w-[250px] mx-auto md:mx-0 aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
                <Building2 className="w-24 h-24 text-gray-600" />
              </div>
            )}
            
            {/* Company Info */}
            <div className="mt-6 space-y-4">
              {/* Desktop: Stacked layout */}
              <div className="hidden md:block space-y-4">
                {company.origin_country && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-1">Country</h3>
                    <p className="text-base">{getCountryName(company.origin_country)}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-1">Total Films</h3>
                  <p className="text-base">{company.movies.length}</p>
                </div>
              </div>
              
              {/* Mobile: Inline layout */}
              <div className="md:hidden flex gap-6">
                {company.origin_country && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-1">Country</h3>
                    <p className="text-base">{getCountryName(company.origin_country)}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-1">Total Films</h3>
                  <p className="text-base">{company.movies.length}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content - Name & Movies */}
          <div className="flex-1">
            {/* Company Name */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{companyName}</h1>
              {hasLaoName && locale === 'en' && (
                <p className="text-xl text-gray-400">{companyNameLo}</p>
              )}
              {hasLaoName && locale === 'lo' && (
                <p className="text-xl text-gray-400">{companyNameEn}</p>
              )}
            </div>

            {/* Movies Section */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Film className="w-6 h-6" />
                {t('movie.filmography')} ({company.movies.length})
              </h2>

              {company.movies.length === 0 ? (
                <p className="text-gray-400">No movies found for this production company.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                  {company.movies
                    .sort((a, b) => {
                      // Sort by release date descending (newest first)
                      if (!a.release_date) return 1;
                      if (!b.release_date) return -1;
                      return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
                    })
                    .map((movie) => {
                      const movieTitle = typeof movie.title === 'string'
                        ? movie.title
                        : (movie.title[locale] || movie.title.en || movie.title.lo || 'Unknown');
                      const posterUrl = getPosterUrl(movie.poster_path, 'medium');
                      const releaseYear = movie.release_date 
                        ? new Date(movie.release_date).getFullYear() 
                        : null;

                      return (
                        <Link
                          key={movie.id}
                          href={`/movies/${movie.id}`}
                          className="group"
                        >
                          <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 mb-2 shadow-lg group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                            {posterUrl ? (
                              <img
                                src={posterUrl}
                                alt={movieTitle}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Film className="w-12 h-12 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <h3 className="text-sm font-medium line-clamp-2 group-hover:text-blue-400 transition-colors">
                            {movieTitle}
                          </h3>
                          {releaseYear && (
                            <p className="text-xs text-gray-400 mt-1">{releaseYear}</p>
                          )}
                        </Link>
                      );
                    })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer variant="dark" />
    </div>
  );
}
