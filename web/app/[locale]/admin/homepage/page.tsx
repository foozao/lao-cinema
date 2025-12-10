'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, GripVertical, Save } from 'lucide-react';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl } from '@/lib/images';

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

interface Movie {
  id: string;
  title: { en: string; lo?: string };
  poster_path?: string;
  release_date?: string;
}

export default function HomepageAdminPage() {
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations();
  
  const [featured, setFeatured] = useState<FeaturedMovie[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
        headers: { 'Content-Type': 'application/json' },
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
    if (!confirm('Remove this film from featured?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/homepage/featured/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to remove featured film:', error);
    }
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const items = featured.map((f, index) => ({
        id: f.id,
        order: index,
      }));

      const res = await fetch(`${API_BASE_URL}/homepage/featured/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        alert('Order saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save order:', error);
      alert('Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFeatured = [...featured];
    const draggedItem = newFeatured[draggedIndex];
    newFeatured.splice(draggedIndex, 1);
    newFeatured.splice(index, 0, draggedItem);
    
    setFeatured(newFeatured);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Touch event handlers for mobile drag and drop
  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    setDraggedIndex(index);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null || touchStartY === null) return;
    
    e.preventDefault();
    const touchY = e.touches[0].clientY;
    
    // Find which element the touch is over
    const elements = document.elementsFromPoint(e.touches[0].clientX, touchY);
    const featuredItem = elements.find(el => el.hasAttribute('data-featured-index'));
    
    if (featuredItem) {
      const overIndex = parseInt(featuredItem.getAttribute('data-featured-index') || '0');
      
      if (overIndex !== draggedIndex) {
        const newFeatured = [...featured];
        const draggedItem = newFeatured[draggedIndex];
        newFeatured.splice(draggedIndex, 1);
        newFeatured.splice(overIndex, 0, draggedItem);
        
        setFeatured(newFeatured);
        setDraggedIndex(overIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedIndex(null);
    setTouchStartY(null);
  };

  const availableMovies = allMovies.filter(
    movie => !featured.some(f => f.movieId === movie.id)
  );

  if (loading) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Homepage Featured Films</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Film
          </Button>
          <Button onClick={saveOrder} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Order'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Featured Films ({featured.length}/5 recommended)</CardTitle>
            <p className="text-sm text-gray-600">Drag to reorder, then click Save Order</p>
          </CardHeader>
          <CardContent>
            {featured.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No featured films yet. Add some!</p>
            ) : (
              <div className="space-y-3">
                {featured.map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    data-featured-index={index}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(index, e)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-move hover:bg-gray-100 transition-colors ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <GripVertical className="w-5 h-5 text-gray-400" />
                    <span className="text-2xl font-bold text-gray-400 w-8">{index + 1}</span>
                    {item.movie.poster_path && (
                      <img
                        src={getPosterUrl(item.movie.poster_path, 'small') || ''}
                        alt={getLocalizedText(item.movie.title, locale)}
                        className="w-16 h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {getLocalizedText(item.movie.title, locale)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {item.movie.release_date && new Date(item.movie.release_date).getFullYear()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeatured(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Film Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle>Add Featured Film</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              {availableMovies.length === 0 ? (
                <p className="text-gray-500 text-center py-8">All movies are already featured!</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {availableMovies.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => addFeatured(movie.id)}
                      className="text-left bg-gray-50 border border-gray-200 rounded-lg overflow-hidden hover:bg-gray-100 hover:border-gray-300 transition-colors"
                    >
                      {movie.poster_path ? (
                        <img
                          src={getPosterUrl(movie.poster_path, 'small') || ''}
                          alt={getLocalizedText(movie.title, locale)}
                          className="w-full aspect-[2/3] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center">
                          <span className="text-4xl">🎬</span>
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-2 text-gray-900">
                          {getLocalizedText(movie.title, locale)}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {movie.release_date && new Date(movie.release_date).getFullYear()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
