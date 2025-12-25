'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Plus, X, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { getAuthHeaders } from '@/lib/api/auth-headers';
import { getLocalizedText } from '@/lib/i18n';
import { getGenreKey } from '@/lib/genres';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/auth-context';
import type { Genre } from '@/lib/types';

interface GenreWithVisibility extends Genre {
  isVisible: boolean;
  movieCount?: number;
}

export default function GenresPage() {
  const t = useTranslations();
  const tGenres = useTranslations('genres');
  const locale = useLocale() as 'en' | 'lo';
  const router = useRouter();
  const { user } = useAuth();
  
  const [genres, setGenres] = useState<GenreWithVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  
  // Create genre form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameLo, setNameLo] = useState('');

  useEffect(() => {
    // Check if user is admin
    if (user === null) {
      // Still loading auth
      return;
    }
    
    if (!user || user.role !== 'admin') {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }
    
    loadGenres();
  }, [user]);

  const loadGenres = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/genres`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        setError('Unauthorized. Please log in as an admin.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load genres');
      }

      const data = await response.json();
      setGenres(data.genres || []);
      setError(null);
    } catch (error) {
      console.error('Failed to load genres:', error);
      setError('Failed to load genres. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createGenre = async () => {
    if (!nameEn.trim()) {
      alert('English name is required');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/genres`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nameEn: nameEn.trim(),
          nameLo: nameLo.trim() || undefined,
          isVisible: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create genre');
      }

      const data = await response.json();
      
      // Add new genre to list
      setGenres(prev => [...prev, data.genre]);
      
      // Reset form
      setNameEn('');
      setNameLo('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create genre:', error);
      alert('Failed to create genre');
    } finally {
      setCreating(false);
    }
  };

  const toggleVisibility = async (genreId: number, currentVisibility: boolean) => {
    setUpdatingId(genreId);
    try {
      const response = await fetch(`${API_BASE_URL}/genres/${genreId}/visibility`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isVisible: !currentVisibility }),
      });

      if (!response.ok) {
        throw new Error('Failed to update genre visibility');
      }

      const data = await response.json();
      
      // Update local state
      setGenres(prev =>
        prev.map(genre =>
          genre.id === genreId ? { ...genre, isVisible: data.genre.isVisible } : genre
        )
      );
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
      alert('Failed to update genre visibility');
    } finally {
      setUpdatingId(null);
    }
  };

  // Sort genres: visible first, then alphabetically
  const sortedGenres = [...genres].sort((a, b) => {
    if (a.isVisible !== b.isVisible) {
      return a.isVisible ? -1 : 1;
    }
    const nameA = getLocalizedText(a.name, locale);
    const nameB = getLocalizedText(b.name, locale);
    return nameA.localeCompare(nameB, locale);
  });

  const visibleCount = genres.filter(g => g.isVisible).length;
  const hiddenCount = genres.filter(g => !g.isVisible).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {t('admin.manageGenres')}
            </h1>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              disabled={!!error}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {showCreateForm ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  {t('admin.cancel')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('admin.createGenre')}
                </>
              )}
            </Button>
          </div>
          <p className="text-gray-600">
            {t('admin.genresDescription')}
          </p>
        </div>

        {/* Create Genre Form */}
        {showCreateForm && (
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('admin.createNewGenre')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="nameEn" className="mb-2">
                  {t('admin.nameEnglish')} *
                </Label>
                <Input
                  id="nameEn"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g., Lao Comedy"
                  disabled={creating}
                />
              </div>
              <div>
                <Label htmlFor="nameLo" className="mb-2">
                  {t('admin.nameLao')}
                </Label>
                <Input
                  id="nameLo"
                  value={nameLo}
                  onChange={(e) => setNameLo(e.target.value)}
                  placeholder="ເຊັ່ນ: ຕະຫຼົກລາວ"
                  disabled={creating}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={createGenre}
                disabled={creating || !nameEn.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('admin.creating')}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('admin.createGenre')}
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowCreateForm(false);
                  setNameEn('');
                  setNameLo('');
                }}
                variant="outline"
                disabled={creating}
              >
                {t('admin.cancel')}
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">{t('admin.totalGenres')}</p>
            <p className="text-2xl font-bold text-gray-900">{genres.length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">{t('admin.visibleGenres')}</p>
            <p className="text-2xl font-bold text-green-600">{visibleCount}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">{t('admin.hiddenGenres')}</p>
            <p className="text-2xl font-bold text-gray-600">{hiddenCount}</p>
          </div>
        </div>

        {/* Genre List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">
                      {t('admin.genreName')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">
                      {t('admin.movies')}
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-700">
                      {t('admin.visibility')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGenres.map((genre) => {
                    const genreName = getLocalizedText(genre.name, 'en');
                    const genreKey = getGenreKey(genreName);
                    const localizedName = tGenres(genreKey);
                    const isUpdating = updatingId === genre.id;

                    return (
                      <tr
                        key={genre.id}
                        className={`border-b hover:bg-gray-50 transition-colors ${
                          !genre.isVisible ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 font-medium">{localizedName}</span>
                            {locale === 'en' && genre.name.lo && (
                              <span className="text-sm text-gray-500">
                                ({genre.name.lo})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {genre.movieCount || 0}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => toggleVisibility(genre.id, genre.isVisible)}
                            disabled={isUpdating}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                              genre.isVisible
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isUpdating ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('admin.updating')}
                              </>
                            ) : genre.isVisible ? (
                              <>
                                <Eye className="w-4 h-4" />
                                {t('admin.visible')}
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-4 h-4" />
                                {t('admin.hidden')}
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>{t('admin.note')}:</strong> {t('admin.genresHelpText')}
          </p>
        </div>
      </main>
    </div>
  );
}
