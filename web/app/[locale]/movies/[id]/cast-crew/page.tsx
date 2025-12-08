'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { translateCrewJob } from '@/lib/i18n/translate-crew-job';
import { getProfileUrl } from '@/lib/images';
import { getDepartmentKey } from '@/lib/crew';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Users } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';
import type { Movie } from '@/lib/types';

export default function CastCrewPage() {
  const params = useParams();
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const movieId = params.id as string;
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMovie = async () => {
      try {
        const data = await movieAPI.getById(movieId);
        setMovie(data);
      } catch (error) {
        console.error('Failed to load movie:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
  }, [movieId]);

  // Show blank page during loading
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black" />;
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <Header variant="dark" />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <p>{t('common.error')}</p>
        </div>
      </div>
    );
  }

  const title = getLocalizedText(movie.title, locale);
  const sortedCast = [...movie.cast].sort((a, b) => a.order - b.order);

  // Group crew by department
  const crewByDepartment = movie.crew.reduce((acc, member) => {
    const dept = member.department || 'Other';
    if (!acc[dept]) {
      acc[dept] = [];
    }
    acc[dept].push(member);
    return acc;
  }, {} as Record<string, typeof movie.crew>);

  // Sort departments by importance
  const departmentOrder = ['Directing', 'Writing', 'Production', 'Camera', 'Editing', 'Sound', 'Art', 'Costume & Make-Up', 'Visual Effects'];
  const sortedDepartments = Object.keys(crewByDepartment).sort((a, b) => {
    const indexA = departmentOrder.indexOf(a);
    const indexB = departmentOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <Header variant="dark" />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <p className="text-xl text-gray-400 mb-8">{t('movie.cast')} & {t('movie.crew')}</p>

        {/* Cast Section */}
        {sortedCast.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Users className="w-8 h-8" />
              {t('movie.cast')} ({sortedCast.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedCast.map((member, index) => {
                const profileUrl = getProfileUrl(member.person.profile_path, 'medium');
                const memberName = getLocalizedText(member.person.name, 'en');
                return (
                  <Link
                    key={`cast-${member.person.id}-${index}`}
                    href={`/people/${member.person.id}`}
                    className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    {profileUrl ? (
                      <img
                        src={profileUrl}
                        alt={memberName}
                        className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl font-bold text-gray-400">
                          {memberName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base line-clamp-2">
                        {getLocalizedText(member.person.name, locale)}
                      </p>
                      <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                        {getLocalizedText(member.character, locale)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Crew Section */}
        {sortedDepartments.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold mb-6">
              {t('movie.crew')} ({movie.crew.length})
            </h2>
            <div className="space-y-8">
              {sortedDepartments.map((department) => {
                const deptKey = getDepartmentKey(department);
                const deptName = deptKey.startsWith('departments.') ? t(deptKey) : department;
                return (
                <div key={department}>
                  <h3 className="text-2xl font-semibold mb-4 text-gray-300">
                    {deptName}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {crewByDepartment[department].map((member, index) => {
                      const profileUrl = getProfileUrl(member.person.profile_path, 'medium');
                      const memberName = getLocalizedText(member.person.name, 'en');
                      return (
                        <Link
                          key={`crew-${member.person.id}-${index}`}
                          href={`/people/${member.person.id}`}
                          className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors"
                        >
                          {profileUrl ? (
                            <img
                              src={profileUrl}
                              alt={memberName}
                              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-xl font-bold text-gray-400">
                                {memberName.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base line-clamp-2">
                              {getLocalizedText(member.person.name, locale)}
                            </p>
                            <p className="text-sm text-gray-400 line-clamp-1 mt-1">
                              {translateCrewJob(getLocalizedText(member.job, 'en'), t)}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
      
      <Footer variant="dark" />
    </div>
  );
}
