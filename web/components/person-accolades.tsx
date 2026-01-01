'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { peopleAPI } from '@/lib/api/client';
import { Award } from 'lucide-react';

interface PersonAccoladesProps {
  personId: number;
  section?: 'personal' | 'film' | 'both';
}

interface PersonAccolade {
  id: string;
  type: 'nomination' | 'selection';
  is_winner: boolean;
  show: { id: string; slug: string | null; name: Record<string, string> } | null;
  edition: { id: string; year: number; edition_number: number | null } | null;
  category: { id: string; name: Record<string, string>; section?: { id: string; name: Record<string, string> } | null } | null;
  section: { id: string; name: Record<string, string> } | null;
  movie?: { id: string; title: Record<string, string>; poster_path: string | null };
  recognition_type?: Record<string, string>;
  notes?: Record<string, string>;
  award_body?: { id: string; abbreviation: string | null; name: Record<string, string> } | null;
}

interface GroupedFilmAccolades {
  movieId: string;
  movieTitle: string;
  events: Map<string, {
    showName: string;
    year: number;
    editionId: string;
    accolades: PersonAccolade[];
  }>;
}

export function PersonAccolades({ personId, section = 'both' }: PersonAccoladesProps) {
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const [personalAwards, setPersonalAwards] = useState<PersonAccolade[]>([]);
  const [filmAccolades, setFilmAccolades] = useState<PersonAccolade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAccolades = async () => {
      try {
        const data = await peopleAPI.getAccolades(personId);
        setPersonalAwards(data.personal_awards || []);
        setFilmAccolades(data.film_accolades || []);
      } catch (error) {
        console.error('Failed to load person accolades:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAccolades();
  }, [personId]);

  // Group film accolades by movie, then by event
  const groupedFilmAccolades = useMemo(() => {
    const groups = new Map<string, GroupedFilmAccolades>();
    
    for (const accolade of filmAccolades) {
      if (!accolade.movie) continue;
      
      const movieId = accolade.movie.id;
      const movieTitle = getLocalizedText(accolade.movie.title as any, locale);
      const editionId = accolade.edition?.id || 'unknown';
      const showName = accolade.show ? getLocalizedText(accolade.show.name as any, locale) : '';
      const year = accolade.edition?.year || 0;
      
      if (!groups.has(movieId)) {
        groups.set(movieId, {
          movieId,
          movieTitle,
          events: new Map(),
        });
      }
      
      const movieGroup = groups.get(movieId)!;
      if (!movieGroup.events.has(editionId)) {
        movieGroup.events.set(editionId, {
          showName,
          year,
          editionId,
          accolades: [],
        });
      }
      
      movieGroup.events.get(editionId)!.accolades.push(accolade);
    }
    
    // Convert to array and sort events by year (most recent first)
    const result = Array.from(groups.values()).map(group => ({
      ...group,
      events: Array.from(group.events.values()).sort((a, b) => b.year - a.year),
    }));
    
    return result;
  }, [filmAccolades, locale]);

  if (loading) {
    return null;
  }

  // Check what to show based on section prop
  const showPersonal = section === 'personal' || section === 'both';
  const showFilm = section === 'film' || section === 'both';

  if (personalAwards.length === 0 && filmAccolades.length === 0) {
    return null;
  }

  if (showPersonal && personalAwards.length === 0 && section === 'personal') {
    return null;
  }

  if (showFilm && filmAccolades.length === 0 && section === 'film') {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* PRIMARY: Personal Awards & Recognition */}
      {showPersonal && personalAwards.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">
            {t('accolades.awardsRecognition')}
          </h2>
          <div className="space-y-3">
            {personalAwards.map((award) => {
              const isWinner = award.is_winner;
              const categoryName = award.category 
                ? getLocalizedText(award.category.name as any, locale)
                : null;
              const sectionName = award.section
                ? getLocalizedText(award.section.name as any, locale)
                : null;
              const showName = award.show 
                ? getLocalizedText(award.show.name as any, locale)
                : '';
              const year = award.edition?.year || '';
              const movieTitle = award.movie 
                ? getLocalizedText(award.movie.title as any, locale)
                : null;
              
              return (
                <div 
                  key={award.id} 
                  className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon for personal awards */}
                    <div className={`flex-shrink-0 mt-0.5 ${isWinner ? 'text-yellow-400' : 'text-gray-400'}`}>
                      <Award className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Winner/Nominee badge with category and section */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${isWinner ? 'text-yellow-400' : 'text-gray-400'}`}>
                          {isWinner ? t('accolades.winner') : t('accolades.nominee')}
                        </span>
                        {categoryName && (
                          <>
                            <span className="text-gray-500">·</span>
                            <span className="text-base font-medium text-white">
                              {categoryName}
                            </span>
                          </>
                        )}
                        {sectionName && (
                          <>
                            <span className="text-gray-500">·</span>
                            <span className="text-base font-medium text-white">
                              {sectionName}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {/* Show and year */}
                      <div className="text-sm text-gray-300">
                        {showName}
                        {year && (
                          <>
                            {' '}
                            <span className="text-gray-500">({year})</span>
                          </>
                        )}
                      </div>
                      
                      {/* Movie title (if applicable) */}
                      {movieTitle && (
                        <div className="text-sm text-gray-400 mt-1">
                          {t('accolades.forFilm')}: {movieTitle}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECONDARY: Associated Film Accolades */}
      {showFilm && groupedFilmAccolades.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3 text-muted-foreground">
            {t('accolades.associatedFilmAccolades')}
          </h2>
          <div className="space-y-4">
            {groupedFilmAccolades.map((group) => (
              <div key={group.movieId} className="text-sm">
                {/* Film title */}
                <h3 className="font-medium mb-2 text-white">
                  {group.movieTitle}
                </h3>
                
                {/* Events grouped together */}
                <div className="space-y-3">
                  {group.events.map((event) => (
                    <div key={event.editionId}>
                      {/* Event header */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-muted-foreground">{event.showName}</span>
                        <span className="text-gray-600">·</span>
                        <span className="text-muted-foreground">{event.year}</span>
                      </div>
                      
                      {/* Accolades for this event - grouped by section */}
                      <ul className="space-y-1 text-muted-foreground pl-4">
                        {(() => {
                          // Group accolades: selections with their section nominations, then event-wide
                          const selections = event.accolades.filter(a => a.type === 'selection');
                          const nominations = event.accolades.filter(a => a.type === 'nomination');
                          
                          // Get section IDs from selections
                          const sectionIds = new Set(selections.map(s => s.section?.id).filter(Boolean));
                          
                          // Nominations that belong to a section (via category.section)
                          const sectionNominations = nominations.filter(n => 
                            n.category?.section?.id && sectionIds.has(n.category.section.id)
                          );
                          
                          // Event-wide nominations (no section association)
                          const eventWideNominations = nominations.filter(n => 
                            !n.category?.section?.id || !sectionIds.has(n.category.section.id)
                          );
                          
                          const renderNomination = (accolade: typeof nominations[0], indented = false) => {
                            const categoryName = accolade.category 
                              ? getLocalizedText(accolade.category.name as any, locale)
                              : null;
                            const awardBodyName = accolade.award_body
                              ? getLocalizedText(accolade.award_body.name as any, locale)
                              : null;
                            const categoryDisplay = awardBodyName && categoryName
                              ? `${awardBodyName} Award: ${categoryName}`
                              : categoryName;
                            const status = accolade.is_winner ? t('accolades.winner') : t('accolades.nominee');
                            
                            return (
                              <li key={accolade.id} className={`flex items-start gap-1 ${indented ? 'pl-4' : ''}`}>
                                <span className="text-gray-500">•</span>
                                <span className={accolade.is_winner ? 'text-yellow-400 font-medium' : 'text-gray-400'}>
                                  {status}
                                </span>
                                <span className="text-gray-500"> - </span>
                                <span className="text-gray-300">{categoryDisplay}</span>
                              </li>
                            );
                          };
                          
                          return (
                            <>
                              {/* Selections with their nested nominations */}
                              {selections.map((selection) => {
                                const sectionName = selection.section
                                  ? getLocalizedText(selection.section.name as any, locale)
                                  : null;
                                const sectionId = selection.section?.id;
                                const nestedNominations = sectionNominations.filter(n => 
                                  n.category?.section?.id === sectionId
                                );
                                
                                return (
                                  <li key={selection.id}>
                                    <div className="flex items-start gap-1">
                                      <span className="text-gray-500">•</span>
                                      <span className="text-amber-600">{t('accolades.selection')}</span>
                                      <span className="text-gray-500"> - </span>
                                      <span className="text-gray-300">{sectionName}</span>
                                    </div>
                                    {nestedNominations.length > 0 && (
                                      <ul className="space-y-1 mt-1">
                                        {nestedNominations.map(nom => renderNomination(nom, true))}
                                      </ul>
                                    )}
                                  </li>
                                );
                              })}
                              
                              {/* Event-wide nominations */}
                              {eventWideNominations.map(nom => renderNomination(nom, false))}
                            </>
                          );
                        })()}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
