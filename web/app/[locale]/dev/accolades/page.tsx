'use client';

import { useState, useEffect } from 'react';
import { awardsAPI } from '@/lib/api/client';
import { useLocale } from 'next-intl';
import { getLocalizedText, getLocalizedName } from '@/lib/i18n';
import { getAwardShowLocation } from '@/lib/i18n/get-country-name';
import { getProfileUrl, getPosterUrl } from '@/lib/images';
import { Trophy, Calendar, Globe, ExternalLink, ChevronRight, User, Film, Award } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { AwardShow, AwardEditionDetail } from '@/lib/types';

export default function DevAwardsPage() {
  const locale = useLocale() as 'en' | 'lo';
  const [shows, setShows] = useState<AwardShow[]>([]);
  const [selectedShow, setSelectedShow] = useState<AwardShow | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<AwardEditionDetail | null>(null);
  const [editions, setEditions] = useState<{ id: string; year: number; edition_number?: number }[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [selections, setSelections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShows();
    loadWinners();
  }, []);

  const loadShows = async () => {
    try {
      setLoading(true);
      const response = await awardsAPI.getShows();
      setShows(response.shows);
    } catch (error) {
      console.error('Failed to load shows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWinners = async () => {
    try {
      const response = await awardsAPI.getWinners();
      setWinners(response.winners);
      setSelections(response.selections || []);
    } catch (error) {
      console.error('Failed to load winners:', error);
    }
  };

  const clearSelection = () => {
    setSelectedShow(null);
    setSelectedEdition(null);
    setEditions([]);
  };

  const selectShow = async (show: AwardShow) => {
    // Toggle off if clicking the same show
    if (selectedShow?.id === show.id) {
      clearSelection();
      return;
    }
    
    try {
      setSelectedShow(show);
      setSelectedEdition(null);
      
      const detail = await awardsAPI.getShow(show.id);
      setEditions(detail.editions || []);
      
      // Auto-select most recent edition
      if (detail.editions && detail.editions.length > 0) {
        await loadEdition(detail.editions[0].id);
      }
    } catch (error) {
      console.error('Failed to load show:', error);
    }
  };

  const loadEdition = async (editionId: string) => {
    try {
      const response = await awardsAPI.getEdition(editionId);
      setSelectedEdition(response);
    } catch (error) {
      console.error('Failed to load edition:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-800 rounded w-1/3"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Dev Banner */}
      <div className="bg-yellow-500 text-black text-center py-2 text-sm font-medium">
        🚧 Development Preview - This page is hidden from public navigation
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Trophy className="w-10 h-10 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold">Film Accolades</h1>
            <p className="text-gray-400">Celebrating excellence and recognition in Lao cinema</p>
          </div>
        </div>

        {shows.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-400">No Accolade Events Yet</h2>
            <p className="text-gray-500 mt-2">Accolade events will appear here once created in the admin panel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar - Shows and Editions */}
            <div className="space-y-6">
              {/* Shows */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold flex items-center gap-2 text-gray-300">
                    <Award className="w-5 h-5" />
                    Accolade Events
                  </h2>
                  {selectedShow && (
                    <button
                      onClick={clearSelection}
                      className="text-xs text-gray-400 hover:text-yellow-500 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {/* Lao Awards */}
                  {(() => {
                    const laoShows = shows.filter(s => s.country === 'LA');
                    const internationalShows = shows.filter(s => s.country !== 'LA');
                    
                    return (
                      <>
                        {laoShows.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-yellow-500 uppercase tracking-wider px-1">
                              Lao Accolades
                            </div>
                            {laoShows.map((show) => (
                              <button
                                key={show.id}
                                onClick={() => selectShow(show)}
                                className={`w-full text-left p-3 rounded-lg transition-colors ${
                                  selectedShow?.id === show.id
                                    ? 'bg-yellow-500/20 border border-yellow-500/50'
                                    : 'bg-gray-700/50 hover:bg-gray-700'
                                }`}
                              >
                                <div className="font-medium">
                                  {getLocalizedText(show.name as { en: string; lo?: string }, locale)}
                                </div>
                                {(show.city || show.country) && (
                                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    {getAwardShowLocation(show.city, show.country)}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* Separator */}
                        {laoShows.length > 0 && internationalShows.length > 0 && (
                          <div className="border-t border-gray-700/50" />
                        )}
                        
                        {/* International Awards */}
                        {internationalShows.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                              International Recognition
                            </div>
                            {internationalShows.map((show) => (
                              <button
                                key={show.id}
                                onClick={() => selectShow(show)}
                                className={`w-full text-left p-3 rounded-lg transition-colors ${
                                  selectedShow?.id === show.id
                                    ? 'bg-yellow-500/20 border border-yellow-500/50'
                                    : 'bg-gray-700/50 hover:bg-gray-700'
                                }`}
                              >
                                <div className="font-medium">
                                  {getLocalizedText(show.name as { en: string; lo?: string }, locale)}
                                </div>
                                {(show.city || show.country) && (
                                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    {getAwardShowLocation(show.city, show.country)}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Editions */}
              {selectedShow && editions.length > 0 && (
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <h2 className="font-semibold mb-4 flex items-center gap-2 text-gray-300">
                    <Calendar className="w-5 h-5" />
                    Editions
                  </h2>
                  <div className="space-y-2">
                    {editions.map((edition) => (
                      <button
                        key={edition.id}
                        onClick={() => loadEdition(edition.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedEdition?.id === edition.id
                            ? 'bg-yellow-500/20 border border-yellow-500/50'
                            : 'bg-gray-700/50 hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-medium">{edition.year}</div>
                        {edition.edition_number && (
                          <div className="text-xs text-gray-400">
                            {edition.edition_number}th Edition
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Show Info */}
              {selectedShow && (
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <h3 className="font-semibold mb-2 text-gray-300">About</h3>
                  {selectedShow.description && (
                    <p className="text-sm text-gray-400 mb-4">
                      {getLocalizedText(selectedShow.description as { en: string; lo?: string }, locale)}
                    </p>
                  )}
                  {selectedShow.website_url && (
                    <a
                      href={selectedShow.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-yellow-500 hover:text-yellow-400"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Official Website
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Main Content - Awards */}
            <div className="lg:col-span-3">
              {!selectedEdition ? (
                <div className="space-y-6">
                  <div className="bg-gray-800/30 rounded-xl p-6 text-center">
                    <h2 className="text-xl font-semibold text-gray-300 flex items-center justify-center gap-3">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      Select an Accolade Event
                    </h2>
                    <p className="text-gray-500 mt-2">Choose an accolade event and edition from the left to view all nominations and winners.</p>
                  </div>
                  
                  {/* Winners, Nominees, and Festival Selections Showcase */}
                  {(winners.length > 0 || selections.length > 0) && (
                    <div className="bg-gray-800/30 rounded-xl p-6">
                      <h3 className="text-base font-medium text-gray-400 mb-4">
                        Featured accolades and festival selections
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Combine winners and selections, shuffle, deduplicate by nominee, take 8 */}
                        {(() => {
                          const shuffled = [...winners, ...selections].sort(() => Math.random() - 0.5);
                          const seenMovies = new Set<string>();
                          const seenPeople = new Set<string>();
                          const deduplicated: typeof shuffled = [];
                          
                          for (const item of shuffled) {
                            const nomineeId = item.nominee?.id;
                            const nomineeType = item.nominee?.type;
                            
                            if (!nomineeId) {
                              deduplicated.push(item);
                              continue;
                            }
                            
                            // Check if we've already seen this entity
                            if (nomineeType === 'movie') {
                              if (seenMovies.has(nomineeId)) continue;
                              seenMovies.add(nomineeId);
                            } else if (nomineeType === 'person') {
                              if (seenPeople.has(nomineeId)) continue;
                              seenPeople.add(nomineeId);
                            }
                            
                            deduplicated.push(item);
                            if (deduplicated.length >= 8) break;
                          }
                          
                          return deduplicated;
                        })().map((item) => {
                          const isSelection = item.type === 'selection';
                          const winner = item;
                          // Determine the link destination
                          let href = '';
                          if (winner.nominee?.type === 'person' && winner.nominee.id) {
                            href = `/people/${winner.nominee.id}`;
                          } else if (winner.nominee?.type === 'movie' && winner.nominee.id) {
                            href = `/movies/${winner.nominee.id}`;
                          }
                          
                          return (
                            <Link
                              key={winner.id}
                              href={href}
                              className="bg-gray-700/30 rounded-lg p-4 hover:bg-gray-700/50 transition-colors block"
                            >
                              <div className="flex items-center gap-3">
                              {/* Image */}
                              {winner.nominee?.type === 'person' && winner.nominee.profile_path ? (
                                <img
                                  src={getProfileUrl(winner.nominee.profile_path, 'small')!}
                                  alt=""
                                  className="w-12 h-12 rounded-full object-cover ring-2 ring-yellow-500"
                                />
                              ) : winner.nominee?.type === 'movie' && winner.nominee.poster_path ? (
                                <img
                                  src={getPosterUrl(winner.nominee.poster_path, 'small')!}
                                  alt=""
                                  className="w-9 h-12 rounded object-cover ring-2 ring-yellow-500"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center ring-2 ring-yellow-500">
                                  {winner.nominee?.type === 'person' ? (
                                    <User className="w-5 h-5 text-gray-500" />
                                  ) : (
                                    <Film className="w-5 h-5 text-gray-500" />
                                  )}
                                </div>
                              )}
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-medium text-sm text-yellow-400 truncate">
                                    {winner.nominee?.type === 'person'
                                      ? getLocalizedName(winner.nominee.name, locale)
                                      : getLocalizedName(winner.nominee?.title, locale, 'Untitled')}
                                  </div>
                                  {/* Status Badge */}
                                  {isSelection ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 uppercase tracking-wide">
                                      <Film className="w-2.5 h-2.5" />
                                      Selection
                                    </span>
                                  ) : winner.is_winner ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/20 text-yellow-300 uppercase tracking-wide">
                                      <Trophy className="w-2.5 h-2.5" />
                                      Winner
                                    </span>
                                  ) : winner.recognition_type && (getLocalizedText(winner.recognition_type as { en: string; lo?: string }, locale)) ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 uppercase tracking-wide">
                                      {getLocalizedText(winner.recognition_type as { en: string; lo?: string }, locale)}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-500/20 text-gray-400 uppercase tracking-wide">
                                      Nominee
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                  {isSelection ? (
                                    winner.section && getLocalizedText((winner.section.name || { en: '' }) as { en: string; lo?: string }, locale)
                                  ) : (
                                    <>
                                      {getLocalizedText((winner.category?.name || { en: '' }) as { en: string; lo?: string }, locale)}
                                      {winner.category?.section && (
                                        <span className="text-blue-400"> · {getLocalizedText((winner.category.section.name || { en: '' }) as { en: string; lo?: string }, locale)}</span>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  {winner.show && (
                                    <>
                                      {getLocalizedText((winner.show.name || { en: '' }) as { en: string; lo?: string }, locale)}
                                      {winner.edition?.year && ` ${winner.edition.year}`}
                                    </>
                                  )}
                                </div>
                                {winner.for_movie && (
                                  <div className="text-xs text-gray-500 truncate">
                                    for "{getLocalizedText(winner.for_movie.title as { en: string; lo?: string }, locale)}"
                                  </div>
                                )}
                              </div>
                            </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Edition Header */}
                  <div className="bg-gradient-to-r from-yellow-500/20 to-transparent rounded-xl p-6">
                    <div className="flex items-center gap-4">
                      <Trophy className="w-12 h-12 text-yellow-500" />
                      <div>
                        <h2 className="text-2xl font-bold">
                          {selectedEdition.year} {getLocalizedText(selectedEdition.show.name as { en: string; lo?: string }, locale)}
                        </h2>
                        {selectedEdition.edition_number && (
                          <p className="text-gray-400">
                            {selectedEdition.edition_number}th Edition
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Categories and Nominations */}
                  {selectedEdition.categories.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No categories for this edition yet.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Festival Sections with Film Selections */}
                      {selectedEdition.sections && selectedEdition.sections.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                            <Film className="w-4 h-4" />
                            Official Selection
                          </h3>
                          {selectedEdition.sections.map((section) => (
                            <div key={section.id} className="bg-gray-800/50 rounded-xl overflow-hidden">
                              <div className="bg-blue-900/30 px-6 py-4">
                                <h4 className="font-semibold text-lg text-blue-300">
                                  {getLocalizedText(section.name as { en: string; lo?: string }, locale)}
                                </h4>
                                {section.description?.en && (
                                  <p className="text-sm text-gray-400 mt-1">
                                    {getLocalizedText(section.description as { en: string; lo?: string }, locale)}
                                  </p>
                                )}
                              </div>
                              {section.selections && section.selections.length > 0 ? (
                                <div className="divide-y divide-gray-700/50">
                                  {section.selections.map((sel) => (
                                    <Link
                                      key={sel.id}
                                      href={`/movies/${sel.movie_id}`}
                                      className="p-4 flex items-center gap-4 hover:bg-gray-700/30 transition-colors"
                                    >
                                      {sel.movie?.poster_path ? (
                                        <img
                                          src={getPosterUrl(sel.movie.poster_path, 'small')!}
                                          alt=""
                                          className="w-10 h-14 rounded object-cover"
                                        />
                                      ) : (
                                        <div className="w-10 h-14 rounded bg-gray-700 flex items-center justify-center">
                                          <Film className="w-5 h-5 text-gray-500" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium">
                                          {getLocalizedName(sel.movie?.title, locale, 'Untitled')}
                                        </div>
                                        {sel.movie?.release_date && (
                                          <div className="text-sm text-gray-500">
                                            {new Date(sel.movie.release_date).getFullYear()}
                                          </div>
                                        )}
                                      </div>
                                      <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </Link>
                                  ))}
                                </div>
                              ) : (
                                <p className="p-6 text-gray-500 text-center">No films in this section</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Award Categories */}
                      {selectedEdition.categories.length > 0 && (
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2 mt-8">
                          <Award className="w-4 h-4" />
                          Awards
                        </h3>
                      )}
                      {selectedEdition.categories.map((category) => (
                        <div key={category.id} className="bg-gray-800/50 rounded-xl overflow-hidden">
                          <div className="bg-gray-700/50 px-6 py-4 flex items-center gap-3">
                            {category.nominee_type === 'person' ? (
                              <User className="w-5 h-5 text-gray-400" />
                            ) : (
                              <Film className="w-5 h-5 text-gray-400" />
                            )}
                            <h3 className="font-semibold text-lg">
                              {getLocalizedText(category.name as { en: string; lo?: string }, locale)}
                            </h3>
                          </div>

                          {category.nominations.length === 0 ? (
                            <p className="p-6 text-gray-500 text-center">No nominations</p>
                          ) : (
                            <div className="divide-y divide-gray-700/50">
                              {/* Winner first, then others */}
                              {[...category.nominations]
                                .sort((a, b) => (b.is_winner ? 1 : 0) - (a.is_winner ? 1 : 0))
                                .map((nom) => (
                                  <div
                                    key={nom.id}
                                    className={`p-4 flex items-center gap-4 ${
                                      nom.is_winner
                                        ? 'bg-yellow-500/10'
                                        : 'hover:bg-gray-700/30'
                                    }`}
                                  >
                                    {/* Image */}
                                    {nom.nominee?.type === 'person' && nom.nominee.profile_path ? (
                                      <img
                                        src={getProfileUrl(nom.nominee.profile_path, 'small')!}
                                        alt=""
                                        className={`w-14 h-14 rounded-full object-cover ${
                                          nom.is_winner ? 'ring-2 ring-yellow-500' : ''
                                        }`}
                                      />
                                    ) : nom.nominee?.type === 'movie' && nom.nominee.poster_path ? (
                                      <img
                                        src={getPosterUrl(nom.nominee.poster_path, 'small')!}
                                        alt=""
                                        className={`w-10 h-14 rounded object-cover ${
                                          nom.is_winner ? 'ring-2 ring-yellow-500' : ''
                                        }`}
                                      />
                                    ) : (
                                      <div
                                        className={`w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center ${
                                          nom.is_winner ? 'ring-2 ring-yellow-500' : ''
                                        }`}
                                      >
                                        {nom.nominee?.type === 'person' ? (
                                          <User className="w-6 h-6 text-gray-500" />
                                        ) : (
                                          <Film className="w-6 h-6 text-gray-500" />
                                        )}
                                      </div>
                                    )}

                                    {/* Info */}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`font-medium ${nom.is_winner ? 'text-yellow-400' : ''}`}>
                                          {nom.nominee?.type === 'person'
                                            ? getLocalizedName(nom.nominee.name, locale)
                                            : getLocalizedName(nom.nominee?.title, locale, 'Untitled')}
                                        </span>
                                        {nom.is_winner ? (
                                          <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                            <Trophy className="w-3 h-3" />
                                            WINNER
                                          </span>
                                        ) : (
                                          <span className="bg-gray-600 text-gray-300 text-xs px-2 py-0.5 rounded-full font-medium">
                                            NOMINEE
                                          </span>
                                        )}
                                        {!nom.is_winner && nom.recognition_type && (
                                          <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full font-medium">
                                            {getLocalizedText(nom.recognition_type as { en: string; lo?: string }, locale)}
                                          </span>
                                        )}
                                      </div>
                                      {nom.for_movie && (
                                        <p className="text-sm text-gray-400 mt-1">
                                          for "{getLocalizedText(nom.for_movie.title as { en: string; lo?: string }, locale)}"
                                        </p>
                                      )}
                                    </div>

                                    {/* Link to person/movie */}
                                    {nom.nominee && (
                                      <Link
                                        href={
                                          nom.nominee.type === 'person'
                                            ? `/people/${nom.nominee.id}`
                                            : `/movies/${nom.nominee.id}`
                                        }
                                        className="text-gray-400 hover:text-white transition-colors"
                                      >
                                        <ChevronRight className="w-5 h-5" />
                                      </Link>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
