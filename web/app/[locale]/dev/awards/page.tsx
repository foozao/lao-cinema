'use client';

import { useState, useEffect } from 'react';
import { awardsAPI } from '@/lib/api/client';
import { useLocale } from 'next-intl';
import { getLocalizedText } from '@/lib/i18n';
import { getProfileUrl, getPosterUrl } from '@/lib/images';
import { Trophy, Calendar, Globe, ExternalLink, ChevronRight, User, Film, Award } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface AwardShow {
  id: string;
  slug?: string;
  name: { en?: string; lo?: string };
  description?: { en?: string; lo?: string };
  country?: string;
  city?: string;
  website_url?: string;
  logo_path?: string;
  edition_count?: number;
}

interface AwardEdition {
  id: string;
  show: { id: string; slug?: string; name: { en?: string; lo?: string } };
  year: number;
  edition_number?: number;
  name?: { en?: string; lo?: string };
  categories: CategoryWithNominations[];
}

interface CategoryWithNominations {
  id: string;
  name: { en?: string; lo?: string };
  nominee_type: 'person' | 'movie';
  nominations: Nomination[];
}

interface Nomination {
  id: string;
  nominee: {
    type: 'person' | 'movie';
    id: number | string;
    name?: { en?: string; lo?: string };
    title?: { en?: string; lo?: string };
    profile_path?: string;
    poster_path?: string;
  } | null;
  for_movie?: {
    id: string;
    title: { en?: string; lo?: string };
    poster_path?: string;
  } | null;
  is_winner: boolean;
}

export default function DevAwardsPage() {
  const locale = useLocale() as 'en' | 'lo';
  const [shows, setShows] = useState<AwardShow[]>([]);
  const [selectedShow, setSelectedShow] = useState<AwardShow | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<AwardEdition | null>(null);
  const [editions, setEditions] = useState<{ id: string; year: number; edition_number?: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShows();
  }, []);

  const loadShows = async () => {
    try {
      setLoading(true);
      const response = await awardsAPI.getShows();
      setShows(response.shows);
      
      // Auto-select first show if available
      if (response.shows.length > 0) {
        await selectShow(response.shows[0]);
      }
    } catch (error) {
      console.error('Failed to load shows:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectShow = async (show: AwardShow) => {
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
            <h1 className="text-3xl font-bold">Film Awards</h1>
            <p className="text-gray-400">Celebrating excellence in Lao cinema</p>
          </div>
        </div>

        {shows.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-400">No Award Shows Yet</h2>
            <p className="text-gray-500 mt-2">Award shows will appear here once created in the admin panel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar - Shows and Editions */}
            <div className="space-y-6">
              {/* Shows */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h2 className="font-semibold mb-4 flex items-center gap-2 text-gray-300">
                  <Award className="w-5 h-5" />
                  Award Shows
                </h2>
                <div className="space-y-2">
                  {shows.map((show) => (
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
                          {[show.city, show.country].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </button>
                  ))}
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
                <div className="bg-gray-800/30 rounded-xl p-12 text-center">
                  <Trophy className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                  <h2 className="text-xl font-semibold text-gray-400">Select an Edition</h2>
                  <p className="text-gray-500 mt-2">Choose an award show and edition to view nominations and winners.</p>
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
                                      <div className="flex items-center gap-3">
                                        <span className={`font-medium ${nom.is_winner ? 'text-yellow-400' : ''}`}>
                                          {nom.nominee?.type === 'person'
                                            ? getLocalizedText((nom.nominee.name || { en: 'Unknown' }) as { en: string; lo?: string }, locale)
                                            : getLocalizedText((nom.nominee?.title || { en: 'Unknown' }) as { en: string; lo?: string }, locale)}
                                        </span>
                                        {nom.is_winner && (
                                          <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                            <Trophy className="w-3 h-3" />
                                            WINNER
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
