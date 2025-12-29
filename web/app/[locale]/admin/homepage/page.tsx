'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Save, Film } from 'lucide-react';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl } from '@/lib/images';
import { getAuthHeaders } from '@/lib/api/auth-headers';
import { API_BASE_URL } from '@/lib/config';
import { useDragAndDrop } from '@/hooks/use-drag-and-drop';
import { DraggableItemList } from '@/components/admin/draggable-item-list';
import { MovieSelectionModal } from '@/components/admin/movie-selection-modal';

import type { Movie } from '@/lib/types';

interface FeaturedMovie {
  id: string;
  movieId: string;
  order: number;
  movie: {
    id: string;
    title: { en: string; lo?: string };
    poster_path?: string;
    release_date?: string;
  };
}

export default function HomepageAdminPage() {
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations('admin');
  
  const [featured, setFeatured] = useState<FeaturedMovie[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [randomizeFeatured, setRandomizeFeatured] = useState(false);
  const [heroType, setHeroType] = useState<'disabled' | 'video' | 'image'>('video');
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load featured films
      const featuredRes = await fetch(`${API_BASE_URL}/homepage/featured/admin`);
      const featuredData = await featuredRes.json();
      setFeatured(featuredData.featured || []);

      // Load all movies
      const moviesRes = await fetch(`${API_BASE_URL}/movies`);
      const moviesData = await moviesRes.json();
      setAllMovies(moviesData.movies || []);

      // Load homepage settings
      const settingsRes = await fetch(`${API_BASE_URL}/homepage/settings`);
      const settingsData = await settingsRes.json();
      setRandomizeFeatured(settingsData.settings?.randomizeFeatured || false);
      setHeroType(settingsData.settings?.heroType || 'video');
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFeatured = async (movieId: string) => {
    try {
      const nextOrder = featured.length;
      const res = await fetch(`${API_BASE_URL}/homepage/featured`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ movieId, order: nextOrder }),
      });

      if (res.ok) {
        await loadData();
        setShowAddModal(false);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add featured film');
      }
    } catch (error) {
      console.error('Failed to add featured film:', error);
      alert('Failed to add featured film');
    }
  };

  const removeFeatured = async (id: string) => {
    if (!confirm(t('removeFromFeatured'))) return;

    try {
      const res = await fetch(`${API_BASE_URL}/homepage/featured/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to remove featured film:', error);
    }
  };

  // Drag and drop hook
  const dragAndDrop = useDragAndDrop({
    items: featured,
    onReorder: setFeatured,
    onReorderComplete: async (reorderedFeatured) => {
      setSaving(true);
      try {
        const items = reorderedFeatured.map((f, index) => ({
          id: f.id,
          order: index,
        }));

        await fetch(`${API_BASE_URL}/homepage/featured/reorder`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ items }),
        });
      } catch (error) {
        console.error('Failed to save order:', error);
        alert('Failed to save order');
      } finally {
        setSaving(false);
      }
    },
  });

  const handleAddMovie = async (movie: Movie) => {
    await addFeatured(movie.id);
  };

  const toggleRandomize = async () => {
    setUpdatingSettings(true);
    try {
      const res = await fetch(`${API_BASE_URL}/homepage/settings`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ randomizeFeatured: !randomizeFeatured }),
      });

      if (res.ok) {
        const data = await res.json();
        setRandomizeFeatured(data.settings.randomizeFeatured);
      } else {
        alert('Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      alert('Failed to update settings');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const updateHeroType = async (newHeroType: 'disabled' | 'video' | 'image') => {
    setUpdatingSettings(true);
    try {
      const res = await fetch(`${API_BASE_URL}/homepage/settings`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ heroType: newHeroType }),
      });

      if (res.ok) {
        const data = await res.json();
        setHeroType(data.settings.heroType);
      } else {
        alert('Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      alert('Failed to update settings');
    } finally {
      setUpdatingSettings(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('homepageFeaturedFilms')}</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('addFilm')}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Homepage Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Hero Type Setting */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hero Section Style
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Choose how the first featured film is displayed on the homepage
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => updateHeroType('video')}
                  disabled={updatingSettings}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                    heroType === 'video'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Auto-play Video
                </button>
                <button
                  onClick={() => updateHeroType('image')}
                  disabled={updatingSettings}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                    heroType === 'image'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Static Image
                </button>
                <button
                  onClick={() => updateHeroType('disabled')}
                  disabled={updatingSettings}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                    heroType === 'disabled'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Disabled
                </button>
              </div>
            </div>

            {/* Randomize Setting */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('randomizeFeatured')}
                </label>
                <p className="text-sm text-gray-600">
                  {t('randomizeFeaturedDescription')}
                </p>
              </div>
              <button
                onClick={toggleRandomize}
                disabled={updatingSettings}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                  randomizeFeatured ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    randomizeFeatured ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Featured Films Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('featuredFilms')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <DraggableItemList
              items={featured}
              draggedIndex={dragAndDrop.draggedIndex}
              dataAttribute="data-featured-index"
              onDragStart={dragAndDrop.handleDragStart}
              onDragOver={dragAndDrop.handleDragOver}
              onDragEnd={dragAndDrop.handleDragEnd}
              onTouchStart={dragAndDrop.handleTouchStart}
              onTouchMove={(e) => dragAndDrop.handleTouchMove(e, 'data-featured-index')}
              onTouchEnd={dragAndDrop.handleTouchEnd}
              onRemove={(item) => removeFeatured(item.id)}
              renderItem={(item) => {
                const posterUrl = getPosterUrl(item.movie.poster_path, 'small');
                return (
                  <>
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={getLocalizedText(item.movie.title, locale)}
                        className="w-16 h-24 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                        <Film className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg">
                        {getLocalizedText(item.movie.title, locale)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {item.movie.release_date || t('noReleaseDate')}
                      </p>
                    </div>
                  </>
                );
              }}
              emptyMessage={`${t('noFeaturedFilms')}. ${t('clickAddToStart')}`}
              showInstructions={false}
            />
          </CardContent>
        </Card>
      </div>

      <MovieSelectionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        allMovies={allMovies}
        excludeMovieIds={featured.map(f => f.movieId)}
        onSelectMovie={handleAddMovie}
        loading={loading}
        title={t('addFeaturedFilm')}
      />
    </div>
  );
}
