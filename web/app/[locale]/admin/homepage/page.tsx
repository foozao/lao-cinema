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
      <div>
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
