'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { movieAPI } from '@/lib/api/client';
import type { MovieAccolade } from '@/lib/types';

interface MovieAccoladesProps {
  movieId: string;
}

interface GroupedAccolades {
  showName: string;
  year: number;
  editionId: string;
  accolades: MovieAccolade[];
}

export function MovieAccolades({ movieId }: MovieAccoladesProps) {
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  const [accolades, setAccolades] = useState<MovieAccolade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAccolades = async () => {
      try {
        const data = await movieAPI.getAccolades(movieId);
        // Combine all accolades into one list
        const allAccolades = [
          ...(data.film_accolades || []),
          ...(data.cast_crew_accolades || []),
        ];
        setAccolades(allAccolades);
      } catch (error) {
        console.error('Failed to load accolades:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAccolades();
  }, [movieId]);

  // Group accolades by event/edition, then by section
  const groupedAccolades = useMemo(() => {
    const groups = new Map<string, GroupedAccolades>();
    
    for (const accolade of accolades) {
      const editionId = accolade.edition?.id || 'unknown';
      const showName = accolade.show ? getLocalizedText(accolade.show.name, locale) : '';
      const year = accolade.edition?.year || 0;
      
      if (!groups.has(editionId)) {
        groups.set(editionId, {
          showName,
          year,
          editionId,
          accolades: [],
        });
      }
      groups.get(editionId)!.accolades.push(accolade);
    }
    
    // Sort groups by year (most recent first)
    const sortedGroups = Array.from(groups.values()).sort((a, b) => b.year - a.year);
    
    // Sort accolades within each group: selections first, then winners, then nominations
    for (const group of sortedGroups) {
      group.accolades.sort((a, b) => {
        // Selections first (they become the section header)
        if (a.type === 'selection' && b.type !== 'selection') return -1;
        if (a.type !== 'selection' && b.type === 'selection') return 1;
        // Then winners before non-winners
        if (a.is_winner !== b.is_winner) return a.is_winner ? -1 : 1;
        return 0;
      });
    }
    
    return sortedGroups;
  }, [accolades, locale]);

  if (loading) {
    return null;
  }

  if (accolades.length === 0) {
    return null;
  }

  const renderGroupContent = (group: GroupedAccolades) => {
    // Separate selections (section headers) from nominations
    const selections = group.accolades.filter(a => a.type === 'selection');
    const nominations = group.accolades.filter(a => a.type === 'nomination');
    
    // Get the section name from the first selection (if any)
    const sectionName = selections.length > 0 && selections[0].section
      ? getLocalizedText(selections[0].section.name, locale)
      : null;
    
    return (
      <>
        {/* Section sub-header (if there's a selection) */}
        {sectionName && (
          <div className="text-gray-300 pl-4 py-1">
            <span className="text-gray-400">{t('accolades.section')}</span> {sectionName}
          </div>
        )}
        
        {/* Nominations list */}
        <div className={sectionName ? 'pl-8' : 'pl-4'}>
          {nominations.map((accolade) => {
            const isWinner = accolade.is_winner;
            const categoryName = accolade.category 
              ? getLocalizedText(accolade.category.name, locale)
              : null;
            const personName = accolade.person 
              ? getLocalizedText(accolade.person.name, locale)
              : null;
            
            return (
              <div key={accolade.id} className="py-1 text-sm text-gray-300">
                {isWinner ? (
                  <span className="text-yellow-400 font-medium">{t('accolades.winner')}</span>
                ) : (
                  <span className="text-gray-400">{t('accolades.nominee')}</span>
                )}
                {' · '}
                {categoryName}
                {personName && (
                  <>
                    {' · '}
                    <Link
                      href={`/people/${accolade.person?.id}`}
                      className="hover:underline text-blue-400"
                    >
                      {personName}
                    </Link>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-3">
        {t('accolades.filmAccolades')}
      </h3>
      <div className="space-y-4">
        {groupedAccolades.map((group) => (
          <div key={group.editionId} className="p-3 bg-gray-800/50 rounded-lg">
            {/* Event header */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{group.showName}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-400">{group.year}</span>
            </div>
            {/* Section and nominations */}
            {renderGroupContent(group)}
          </div>
        ))}
      </div>
    </div>
  );
}
