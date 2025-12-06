'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Header } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { Film } from 'lucide-react';
import { peopleAPI } from '@/lib/api/client';
import { getLocalizedText, getBilingualName } from '@/lib/i18n';
import { getPosterUrl, getProfileUrl } from '@/lib/images';
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

  const personName = getBilingualName(person.name, locale);
  const personPhoto = person.profile_path;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <Header variant="dark" />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Person Info */}
        <div className="flex items-start gap-8 mb-12">
          {personPhoto && (
            <img
              src={getProfileUrl(personPhoto, 'large') || ''}
              alt={personName}
              className="w-48 h-48 rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="text-5xl font-bold mb-4">{personName}</h1>
            {person.biography && (
              <p className="text-gray-300 max-w-3xl">
                {getLocalizedText(person.biography, locale)}
              </p>
            )}
            {person.birthday && (
              <p className="text-gray-400 mt-4">
                Born: {new Date(person.birthday).toLocaleDateString()}
              </p>
            )}
            {person.place_of_birth && (
              <p className="text-gray-400">
                Place of Birth: {person.place_of_birth}
              </p>
            )}
          </div>
        </div>

        {/* Combined Credits - Group by Movie */}
        {((person.cast && person.cast.length > 0) || (person.crew && person.crew.length > 0)) && (() => {
          // Combine all credits and group by movie
          const movieCredits = new Map<string, {
            movie: any;
            roles: string[];
          }>();

          // Add cast credits
          if (person.cast) {
            person.cast.forEach((credit: any) => {
              const movieId = credit.movie.id;
              if (!movieCredits.has(movieId)) {
                movieCredits.set(movieId, {
                  movie: credit.movie,
                  roles: []
                });
              }
              const characterName = getLocalizedText(credit.character, locale);
              movieCredits.get(movieId)!.roles.push(characterName);
            });
          }

          // Add crew credits
          if (person.crew) {
            person.crew.forEach((credit: any) => {
              const movieId = credit.movie.id;
              if (!movieCredits.has(movieId)) {
                movieCredits.set(movieId, {
                  movie: credit.movie,
                  roles: []
                });
              }
              const jobName = getLocalizedText(credit.job, locale);
              movieCredits.get(movieId)!.roles.push(jobName);
            });
          }

          // Convert to array and sort by release date (newest first)
          const sortedCredits = Array.from(movieCredits.values()).sort((a, b) => {
            const dateA = a.movie.release_date ? new Date(a.movie.release_date).getTime() : 0;
            const dateB = b.movie.release_date ? new Date(b.movie.release_date).getTime() : 0;
            return dateB - dateA;
          });

          return (
            <section>
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
                <Film className="w-8 h-8" />
                Known For
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {sortedCredits.map((credit) => {
                  const posterUrl = getPosterUrl(credit.movie.poster_path, 'small');
                  const moviePath = credit.movie.slug || credit.movie.id;
                  return (
                    <Link
                      key={credit.movie.id}
                      href={`/movies/${moviePath}`}
                      className="group"
                    >
                      <div className="bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-700/50 transition-colors">
                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={getLocalizedText(credit.movie.title, locale)}
                            className="w-full aspect-[2/3] object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center">
                            <Film className="w-12 h-12 text-gray-500" />
                          </div>
                        )}
                        <div className="p-3">
                          <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
                            {getLocalizedText(credit.movie.title, locale)}
                          </h3>
                          <p className="text-xs text-gray-400 mb-2">
                            {credit.movie.release_date && new Date(credit.movie.release_date).getFullYear()}
                          </p>
                          <div className="text-xs text-gray-300 space-y-0.5">
                            {credit.roles.map((role, idx) => (
                              <p key={idx} className="line-clamp-1">{role}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })()}
      </main>
    </div>
  );
}
