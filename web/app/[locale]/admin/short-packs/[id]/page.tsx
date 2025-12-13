'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Save, Plus, Trash2, GripVertical, Search, Film, Clock, X 
} from 'lucide-react';
import { shortPacksAPI, movieAPI } from '@/lib/api/client';
import { Link } from '@/i18n/routing';
import type { ShortPack, Movie } from '@/lib/types';
import { getLocalizedText } from '@/lib/i18n';
import { SHORT_FILM_THRESHOLD_MINUTES } from '@/lib/constants';

interface ShortInPack {
  movie: {
    id: string;
    slug?: string;
    type?: string;
    original_title: string;
    poster_path?: string;
    runtime?: number;
    title: { en: string; lo?: string };
    overview: { en: string; lo?: string };
  };
  order: number;
}

export default function ShortPackEditPage() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === 'new';
  const packId = isNew ? null : (params.id as string);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [slug, setSlug] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleLo, setTitleLo] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionLo, setDescriptionLo] = useState('');
  const [taglineEn, setTaglineEn] = useState('');
  const [taglineLo, setTaglineLo] = useState('');
  const [priceUsd, setPriceUsd] = useState(499);
  const [isPublished, setIsPublished] = useState(false);
  const [shorts, setShorts] = useState<ShortInPack[]>([]);

  // Search state for adding shorts
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Load pack data
  useEffect(() => {
    if (packId) {
      loadPack();
    }
  }, [packId]);

  const loadPack = async () => {
    try {
      setLoading(true);
      const pack = await shortPacksAPI.getById(packId!);
      setSlug(pack.slug || '');
      setTitleEn(pack.title?.en || '');
      setTitleLo(pack.title?.lo || '');
      setDescriptionEn(pack.description?.en || '');
      setDescriptionLo(pack.description?.lo || '');
      setTaglineEn(pack.tagline?.en || '');
      setTaglineLo(pack.tagline?.lo || '');
      setPriceUsd(pack.price_usd || 499);
      setIsPublished(pack.is_published || false);
      setShorts(pack.shorts || []);
    } catch (err) {
      console.error('Failed to load pack:', err);
      setError('Failed to load pack');
    } finally {
      setLoading(false);
    }
  };

  // Search for shorts to add
  const searchShorts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await movieAPI.getAll();
      // Filter to only shorts (runtime <= 40min) that match the query and aren't already in the pack
      const existingIds = new Set(shorts.map(s => s.movie.id));
      const filtered = response.movies.filter((m: Movie) => {
        // Short films are those with runtime <= threshold (or no runtime set)
        const isShort = m.runtime && m.runtime <= SHORT_FILM_THRESHOLD_MINUTES;
        if (!isShort) return false;
        if (existingIds.has(m.id)) return false;
        const title = m.title?.en?.toLowerCase() || m.original_title?.toLowerCase() || '';
        return title.includes(query.toLowerCase());
      });
      setSearchResults(filtered.slice(0, 10));
    } catch (err) {
      console.error('Failed to search shorts:', err);
    } finally {
      setSearching(false);
    }
  }, [shorts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showSearch) {
        searchShorts(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showSearch, searchShorts]);

  // Add short to pack
  const addShort = async (movie: Movie) => {
    if (!packId) {
      // For new packs, just add to local state
      const newShort: ShortInPack = {
        movie: {
          id: movie.id,
          slug: movie.slug,
          type: movie.type,
          original_title: movie.original_title || '',
          poster_path: movie.poster_path,
          runtime: movie.runtime,
          title: movie.title,
          overview: movie.overview,
        },
        order: shorts.length,
      };
      setShorts([...shorts, newShort]);
    } else {
      // For existing packs, call API
      try {
        const updatedPack = await shortPacksAPI.addShort(packId, movie.id);
        setShorts(updatedPack.shorts || []);
      } catch (err) {
        console.error('Failed to add short:', err);
        alert('Failed to add short to pack');
      }
    }
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  // Remove short from pack
  const removeShort = async (movieId: string) => {
    if (!packId) {
      // For new packs, just remove from local state
      setShorts(shorts.filter(s => s.movie.id !== movieId));
    } else {
      // For existing packs, call API
      try {
        const updatedPack = await shortPacksAPI.removeShort(packId, movieId);
        setShorts(updatedPack.shorts || []);
      } catch (err) {
        console.error('Failed to remove short:', err);
        alert('Failed to remove short from pack');
      }
    }
  };

  // Move short up/down
  const moveShort = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= shorts.length) return;

    const newShorts = [...shorts];
    const temp = newShorts[index];
    newShorts[index] = newShorts[newIndex];
    newShorts[newIndex] = temp;

    // Update order values
    const reordered = newShorts.map((s, i) => ({ ...s, order: i }));
    setShorts(reordered);

    // If editing existing pack, save the reorder
    if (packId) {
      try {
        await shortPacksAPI.reorderShorts(
          packId,
          reordered.map(s => ({ movie_id: s.movie.id, order: s.order }))
        );
      } catch (err) {
        console.error('Failed to reorder shorts:', err);
      }
    }
  };

  // Save pack
  const handleSave = async () => {
    if (!titleEn.trim()) {
      setError('English title is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const data = {
        slug: slug.trim() || undefined,
        title: { en: titleEn, lo: titleLo || undefined },
        description: descriptionEn || descriptionLo ? { en: descriptionEn, lo: descriptionLo || undefined } : undefined,
        tagline: taglineEn || taglineLo ? { en: taglineEn, lo: taglineLo || undefined } : undefined,
        price_usd: priceUsd,
        is_published: isPublished,
      };

      if (isNew) {
        const newPack = await shortPacksAPI.create(data);
        // Add shorts to the new pack
        for (const short of shorts) {
          await shortPacksAPI.addShort(newPack.id, short.movie.id, short.order);
        }
        router.push(`/en/admin/short-packs/${newPack.id}`);
      } else {
        await shortPacksAPI.update(packId!, data);
        await loadPack(); // Reload to get fresh data
      }
    } catch (err) {
      console.error('Failed to save pack:', err);
      setError('Failed to save pack');
    } finally {
      setSaving(false);
    }
  };

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const totalRuntime = shorts.reduce((sum, s) => sum + (s.movie.runtime || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/short-packs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-gray-900">
            {isNew ? 'Create Short Pack' : 'Edit Short Pack'}
          </h2>
          <p className="text-gray-600">
            {isNew ? 'Create a new curated collection of short films' : 'Manage this short film collection'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Pack details and metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titleEn">Title (English) *</Label>
                <Input
                  id="titleEn"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="e.g., Lao Voices 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleLo">Title (Lao)</Label>
                <Input
                  id="titleLo"
                  value={titleLo}
                  onChange={(e) => setTitleLo(e.target.value)}
                  placeholder="ຊື່ພາສາລາວ"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., lao-voices-2024"
              />
              <p className="text-sm text-gray-500">
                Leave empty to auto-generate. Used in the URL: /short-packs/{slug || 'auto-generated'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taglineEn">Tagline (English)</Label>
                <Input
                  id="taglineEn"
                  value={taglineEn}
                  onChange={(e) => setTaglineEn(e.target.value)}
                  placeholder="Short promotional text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taglineLo">Tagline (Lao)</Label>
                <Input
                  id="taglineLo"
                  value={taglineLo}
                  onChange={(e) => setTaglineLo(e.target.value)}
                  placeholder="ຄຳໂຄສະນາ"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">Description (English)</Label>
                <Textarea
                  id="descriptionEn"
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  placeholder="Describe this collection..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionLo">Description (Lao)</Label>
                <Textarea
                  id="descriptionLo"
                  value={descriptionLo}
                  onChange={(e) => setDescriptionLo(e.target.value)}
                  placeholder="ຄຳອະທິບາຍ..."
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Status */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={(priceUsd / 100).toFixed(2)}
                    onChange={(e) => setPriceUsd(Math.round(parseFloat(e.target.value || '0') * 100))}
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 pt-8">
                <Switch
                  id="published"
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
                <Label htmlFor="published" className="cursor-pointer">
                  Published
                  <span className="block text-sm text-gray-500 font-normal">
                    Make this pack visible to users
                  </span>
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shorts in Pack */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Shorts in Pack</CardTitle>
                <CardDescription>
                  {shorts.length} shorts • {formatRuntime(totalRuntime)} total runtime
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setShowSearch(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Short
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search Modal */}
            {showSearch && (
              <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for short films..."
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowSearch(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {searching && (
                  <p className="text-sm text-gray-500">Searching...</p>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((movie) => (
                      <div
                        key={movie.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
                        onClick={() => addShort(movie)}
                      >
                        <div className="flex items-center gap-3">
                          {movie.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                              alt=""
                              className="w-10 h-14 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center">
                              <Film className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{movie.title?.en || movie.original_title}</p>
                            <p className="text-sm text-gray-500">
                              {movie.runtime ? `${movie.runtime}m` : 'No runtime'}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery && !searching && searchResults.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No short films found. Short films have runtime ≤ {SHORT_FILM_THRESHOLD_MINUTES} minutes.
                  </p>
                )}
              </div>
            )}

            {/* Shorts List */}
            {shorts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Film className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No shorts in this pack yet</p>
                <p className="text-sm">Click "Add Short" to add short films</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shorts.map((short, index) => (
                  <div
                    key={short.movie.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveShort(index, 'up')}
                        disabled={index === 0}
                      >
                        <span className="text-xs">▲</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveShort(index, 'down')}
                        disabled={index === shorts.length - 1}
                      >
                        <span className="text-xs">▼</span>
                      </Button>
                    </div>
                    <Badge variant="outline" className="w-8 justify-center">
                      {index + 1}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium">
                        {short.movie.title?.en || short.movie.original_title}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {short.movie.runtime ? `${short.movie.runtime}m` : 'No runtime'}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeShort(short.movie.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
