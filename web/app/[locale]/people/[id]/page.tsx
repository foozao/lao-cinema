'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Film } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl, getProfileUrl } from '@/lib/images';
import type { Movie, CastMember, CrewMember } from '@/lib/types';

interface PersonCredit {
  movie: Movie;
  role: string; // Character name or job title
  type: 'cast' | 'crew';
}

export default function PersonPage() {
  const params = useParams();
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const personId = parseInt(params.id as string);
  
  const [credits, setCredits] = useState<PersonCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [personName, setPersonName] = useState('');
  const [personPhoto, setPersonPhoto] = useState<string | null>(null);

  useEffect(() => {
    const loadPersonCredits = async () => {
      try {
        // Fetch all movies
        const response = await movieAPI.getAll();
        const allMovies = response.movies;

        // Find all movies this person appears in
        const personCredits: PersonCredit[] = [];
        let foundName = '';
        let foundPhoto: string | null = null;

        allMovies.forEach((movie) => {
          // Check cast
          const castMember = movie.cast.find((c: CastMember) => c.id === personId);
          if (castMember) {
            personCredits.push({
              movie,
              role: getLocalizedText(castMember.character, 'en'),
              type: 'cast',
            });
            if (!foundName) {
              foundName = getLocalizedText(castMember.name, 'en');
              foundPhoto = castMember.profile_path || null;
            }
          }

          // Check crew
          const crewMember = movie.crew.find((c: CrewMember) => c.id === personId);
          if (crewMember) {
            personCredits.push({
              movie,
              role: getLocalizedText(crewMember.job, 'en'),
              type: 'crew',
            });
            if (!foundName) {
              foundName = getLocalizedText(crewMember.name, 'en');
              foundPhoto = crewMember.profile_path || null;
            }
          }
        });

        setCredits(personCredits);
        setPersonName(foundName);
        setPersonPhoto(foundPhoto);
      } catch (error) {
        console.error('Failed to load person credits:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPersonCredits();
  }, [personId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (credits.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                {t('nav.home')}
              </Button>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-gray-400">Person not found</p>
        </div>
      </div>
    );
  }

  const castCredits = credits.filter((c) => c.type === 'cast');
  const crewCredits = credits.filter((c) => c.type === 'crew');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

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
            <div className="flex gap-6 text-lg text-gray-400">
              {castCredits.length > 0 && (
                <div>
                  <span className="font-semibold text-white">{castCredits.length}</span> {castCredits.length === 1 ? 'Movie' : 'Movies'} as Actor
                </div>
              )}
              {crewCredits.length > 0 && (
                <div>
                  <span className="font-semibold text-white">{crewCredits.length}</span> {crewCredits.length === 1 ? 'Movie' : 'Movies'} as Crew
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acting Credits */}
        {castCredits.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Film className="w-8 h-8" />
              Acting
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {castCredits.map((credit, index) => {
                const posterUrl = getPosterUrl(credit.movie.poster_path, 'medium');
                return (
                  <Link
                    key={`${credit.movie.id}-${index}`}
                    href={`/movies/${credit.movie.id}`}
                  >
                    <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 transition-colors h-full">
                      <CardContent className="p-4">
                        {posterUrl && (
                          <img
                            src={posterUrl}
                            alt={getLocalizedText(credit.movie.title, 'en')}
                            className="w-full aspect-[2/3] object-cover rounded-lg mb-4"
                          />
                        )}
                      <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                        {getLocalizedText(credit.movie.title, 'en')}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">
                        {credit.movie.release_date && new Date(credit.movie.release_date).getFullYear()}
                      </p>
                      <p className="text-sm text-gray-300">
                        as <span className="font-medium">{credit.role}</span>
                      </p>
                    </CardContent>
                  </Card>
                </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Crew Credits */}
        {crewCredits.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold mb-6">Crew</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {crewCredits.map((credit, index) => {
                const posterUrl = getPosterUrl(credit.movie.poster_path, 'medium');
                return (
                  <Link
                    key={`${credit.movie.id}-${index}`}
                    href={`/movies/${credit.movie.id}`}
                  >
                    <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 transition-colors h-full">
                      <CardContent className="p-4">
                        {posterUrl && (
                          <img
                            src={posterUrl}
                            alt={getLocalizedText(credit.movie.title, 'en')}
                            className="w-full aspect-[2/3] object-cover rounded-lg mb-4"
                          />
                        )}
                      <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                        {getLocalizedText(credit.movie.title, 'en')}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">
                        {credit.movie.release_date && new Date(credit.movie.release_date).getFullYear()}
                      </p>
                      <p className="text-sm text-gray-300 font-medium">
                        {credit.role}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
