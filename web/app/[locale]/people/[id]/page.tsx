'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Header } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { Film, Circle, User, Share2 } from 'lucide-react';
import { Footer } from '@/components/footer';
import { peopleAPI } from '@/lib/api/client';
import { getLocalizedText, getBilingualName } from '@/lib/i18n';
import { getPosterUrl, getProfileUrl } from '@/lib/images';
import { getMovieUrl } from '@/lib/movie-url';
import type { Movie, CastMember, CrewMember } from '@/lib/types';

interface PersonCredit {
  movie: Movie;
  role: string; // Character name or job title
  type: 'cast' | 'crew';
}

export default function PersonPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const personId = parseInt(params.id as string);
  
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadPerson = async () => {
      try {
        const personData = await peopleAPI.getById(personId);
        setPerson(personData);
      } catch (error) {
        console.error('Failed to load person:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadPerson();
  }, [personId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <Header variant="dark" />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-gray-400">Person not found</p>
        </div>
      </div>
    );
  }

  const personNameEn = getLocalizedText(person.name, 'en');
  const personNameLo = getLocalizedText(person.name, 'lo');
  const hasLaoName = personNameLo && personNameLo !== personNameEn;
  const personPhoto = person.profile_path;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <Header variant="dark" />

      {/* Main Content - Two Column Layout */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar - Photo & Personal Info */}
          <aside className="md:w-64 flex-shrink-0">
            {personPhoto ? (
              <img
                src={getProfileUrl(personPhoto, 'large') || ''}
                alt={personNameEn}
                className="w-full max-w-[250px] mx-auto md:mx-0 rounded-lg object-cover shadow-lg"
              />
            ) : (
              <div className="w-full max-w-[250px] mx-auto md:mx-0 aspect-[2/3] bg-gray-800 rounded-lg flex items-center justify-center">
                <User className="w-24 h-24 text-gray-600" />
              </div>
            )}
            
            {/* Personal Info */}
            <div className="mt-6 space-y-4">
              {person.birthday && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Born</h3>
                  <p className="text-white">{new Date(person.birthday).toLocaleDateString()}</p>
                </div>
              )}
              {person.place_of_birth && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Place of Birth</h3>
                  <p className="text-white">{person.place_of_birth}</p>
                </div>
              )}
            </div>
          </aside>

          {/* Right Content - Name, Bio, Filmography */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <h1 className="text-4xl md:text-5xl font-bold mb-1">{personNameEn}</h1>
            {hasLaoName && (
              <p className="text-xl md:text-2xl text-gray-300 mb-4">{personNameLo}</p>
            )}
            
            {/* Share Button */}
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: personNameEn,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors mb-8"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            
            {/* Biography */}
            {person.biography && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3">Biography</h2>
                <p className="text-gray-300 leading-relaxed">
                  {getLocalizedText(person.biography, locale)}
                </p>
              </div>
            )}

            {/* Credits Section */}
            {((person.cast && person.cast.length > 0) || (person.crew && person.crew.length > 0)) && (() => {
          // Combine all credits and group by movie
          const movieCredits = new Map<string, {
            movie: any;
            castRoles: string[];
            crewRoles: string[];
          }>();

          // Add cast credits
          if (person.cast) {
            person.cast.forEach((credit: any) => {
              const movieId = credit.movie.id;
              if (!movieCredits.has(movieId)) {
                movieCredits.set(movieId, {
                  movie: credit.movie,
                  castRoles: [],
                  crewRoles: []
                });
              }
              const characterName = getLocalizedText(credit.character, locale);
              movieCredits.get(movieId)!.castRoles.push(characterName);
            });
          }

          // Add crew credits
          if (person.crew) {
            person.crew.forEach((credit: any) => {
              const movieId = credit.movie.id;
              if (!movieCredits.has(movieId)) {
                movieCredits.set(movieId, {
                  movie: credit.movie,
                  castRoles: [],
                  crewRoles: []
                });
              }
              const jobName = getLocalizedText(credit.job, locale);
              movieCredits.get(movieId)!.crewRoles.push(jobName);
            });
          }

          // Convert to array and sort by release date (newest first)
          const sortedCredits = Array.from(movieCredits.values()).sort((a, b) => {
            const dateA = a.movie.release_date ? new Date(a.movie.release_date).getTime() : 0;
            const dateB = b.movie.release_date ? new Date(b.movie.release_date).getTime() : 0;
            return dateB - dateA;
          });

          // Separate acting credits from crew credits for the filmography list
          const actingCredits = sortedCredits.filter(c => c.castRoles.length > 0);
          const crewCredits = sortedCredits.filter(c => c.crewRoles.length > 0);

          return (
            <>
              {/* Known For - Poster Strip */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4">{t('people.movies')}</h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  {sortedCredits.slice(0, 8).map((credit) => {
                    const posterUrl = getPosterUrl(credit.movie.poster_path, 'small');
                    return (
                      <Link
                        key={credit.movie.id}
                        href={getMovieUrl(credit.movie)}
                        className="group flex-shrink-0 w-[130px]"
                      >
                        <div className="rounded-lg overflow-hidden shadow-lg">
                          {posterUrl ? (
                            <img
                              src={posterUrl}
                              alt={getLocalizedText(credit.movie.title, locale)}
                              className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center">
                              <Film className="w-10 h-10 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-center line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {getLocalizedText(credit.movie.title, locale)}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Acting Filmography */}
              {actingCredits.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-2xl font-bold mb-4">{t('people.acting')}</h2>
                  <div className="bg-gray-800/30 rounded-lg divide-y divide-gray-700/50">
                    {actingCredits.map((credit) => {
                      const year = credit.movie.release_date 
                        ? new Date(credit.movie.release_date).getFullYear() 
                        : '—';
                      return (
                        <div key={credit.movie.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-700/30 transition-colors">
                          <span className="text-gray-400 w-12 text-sm">{year}</span>
                          <Circle className="w-2 h-2 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <Link 
                              href={getMovieUrl(credit.movie)}
                              className="font-medium hover:text-blue-400 transition-colors"
                            >
                              {getLocalizedText(credit.movie.title, locale)}
                            </Link>
                            {credit.castRoles.length > 0 && (
                              <span className="text-gray-400 ml-2">
                                {t('people.asRole', { role: credit.castRoles.join(', ') })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Crew Filmography */}
              {crewCredits.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-2xl font-bold mb-4">{t('people.crew')}</h2>
                  <div className="bg-gray-800/30 rounded-lg divide-y divide-gray-700/50">
                    {crewCredits.map((credit) => {
                      const year = credit.movie.release_date 
                        ? new Date(credit.movie.release_date).getFullYear() 
                        : '—';
                      return (
                        <div key={credit.movie.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-700/30 transition-colors">
                          <span className="text-gray-400 w-12 text-sm">{year}</span>
                          <Circle className="w-2 h-2 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <Link 
                              href={getMovieUrl(credit.movie)}
                              className="font-medium hover:text-blue-400 transition-colors"
                            >
                              {getLocalizedText(credit.movie.title, locale)}
                            </Link>
                            {credit.crewRoles.length > 0 && (
                              <span className="text-gray-400 ml-2">
                                ... {credit.crewRoles.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          );
        })()}
          </div>
        </div>
      </main>
      
      <Footer variant="dark" />
    </div>
  );
}
