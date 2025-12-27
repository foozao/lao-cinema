'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { awardsAPI, movieAPI } from '@/lib/api/client';
import { PersonSearch } from '@/components/admin/person-search';
import { 
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, Trophy, Calendar, 
  User, Film, Award, ArrowLeft, Check, X
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { getProfileUrl, getPosterUrl } from '@/lib/images';
import { getOrdinal } from '@/lib/utils/ordinals';

interface AwardShow {
  id: string;
  slug?: string;
  name: { en?: string; lo?: string };
  description?: { en?: string; lo?: string };
  country?: string;
  city?: string;
  website_url?: string;
  editions: AwardEdition[];
  categories: AwardCategory[];
}

interface AwardEdition {
  id: string;
  year: number;
  edition_number?: number;
  name?: { en?: string; lo?: string };
  theme?: { en?: string; lo?: string };
  start_date?: string;
  end_date?: string;
}

interface AwardCategory {
  id: string;
  name: { en?: string; lo?: string };
  description?: { en?: string; lo?: string };
  nominee_type: 'person' | 'movie';
  sort_order: number;
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
  sort_order: number;
}

interface CategoryWithNominations extends AwardCategory {
  nominations: Nomination[];
}

interface EditionDetail {
  id: string;
  show: { id: string; name: { en?: string; lo?: string } };
  year: number;
  edition_number?: number;
  name?: { en?: string; lo?: string };
  categories: CategoryWithNominations[];
}

export default function AdminAwardShowPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [show, setShow] = useState<AwardShow | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<EditionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [movies, setMovies] = useState<any[]>([]);

  // Form states
  const [showEditionForm, setShowEditionForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingEdition, setEditingEdition] = useState<AwardEdition | null>(null);
  const [editingCategory, setEditingCategory] = useState<AwardCategory | null>(null);
  const [saving, setSaving] = useState(false);

  // Edition form
  const [editionForm, setEditionForm] = useState({
    year: new Date().getFullYear(),
    edition_number: '',
    nameEn: '',
    nameLo: '',
    start_date: '',
    end_date: '',
  });

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    nameEn: '',
    nameLo: '',
    descriptionEn: '',
    descriptionLo: '',
    nominee_type: 'person' as 'person' | 'movie',
    sort_order: 0,
  });

  // Nomination form
  const [addingNominationTo, setAddingNominationTo] = useState<string | null>(null);
  const [nominationForm, setNominationForm] = useState({
    person: null as { id: number; name: { en?: string; lo?: string } } | null,
    movie_id: '',
    for_movie_id: '',
    is_winner: false,
  });

  useEffect(() => {
    loadShow();
    loadMovies();
  }, [resolvedParams.id]);

  const loadShow = async () => {
    try {
      setLoading(true);
      const response = await awardsAPI.getShow(resolvedParams.id);
      setShow(response);
    } catch (error) {
      console.error('Failed to load award show:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovies = async () => {
    try {
      const response = await movieAPI.getAll();
      setMovies(response.movies || []);
    } catch (error) {
      console.error('Failed to load movies:', error);
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

  // Edition handlers
  const resetEditionForm = () => {
    setEditionForm({
      year: new Date().getFullYear(),
      edition_number: '',
      nameEn: '',
      nameLo: '',
      start_date: '',
      end_date: '',
    });
    setEditingEdition(null);
    setShowEditionForm(false);
  };

  const handleEditEdition = (edition: AwardEdition) => {
    setEditingEdition(edition);
    setEditionForm({
      year: edition.year,
      edition_number: edition.edition_number?.toString() || '',
      nameEn: edition.name?.en || '',
      nameLo: edition.name?.lo || '',
      start_date: edition.start_date || '',
      end_date: edition.end_date || '',
    });
    setShowEditionForm(true);
  };

  const handleSubmitEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!show) return;

    try {
      setSaving(true);
      const data = {
        show_id: show.id,
        year: editionForm.year,
        edition_number: editionForm.edition_number ? parseInt(editionForm.edition_number) : undefined,
        name: editionForm.nameEn || editionForm.nameLo
          ? { en: editionForm.nameEn || undefined, lo: editionForm.nameLo || undefined }
          : undefined,
        start_date: editionForm.start_date || undefined,
        end_date: editionForm.end_date || undefined,
      };

      if (editingEdition) {
        await awardsAPI.updateEdition(editingEdition.id, data);
      } else {
        await awardsAPI.createEdition(data);
      }

      await loadShow();
      resetEditionForm();
    } catch (error) {
      console.error('Failed to save edition:', error);
      alert('Failed to save edition');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEdition = async (edition: AwardEdition) => {
    if (!confirm(`Delete ${edition.year} edition? This will delete all nominations.`)) return;

    try {
      await awardsAPI.deleteEdition(edition.id);
      await loadShow();
      if (selectedEdition?.id === edition.id) {
        setSelectedEdition(null);
      }
    } catch (error) {
      console.error('Failed to delete edition:', error);
      alert('Failed to delete edition');
    }
  };

  // Category handlers
  const resetCategoryForm = () => {
    setCategoryForm({
      nameEn: '',
      nameLo: '',
      descriptionEn: '',
      descriptionLo: '',
      nominee_type: 'person',
      sort_order: 0,
    });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const handleEditCategory = (category: AwardCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      nameEn: category.name.en || '',
      nameLo: category.name.lo || '',
      descriptionEn: category.description?.en || '',
      descriptionLo: category.description?.lo || '',
      nominee_type: category.nominee_type,
      sort_order: category.sort_order,
    });
    setShowCategoryForm(true);
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!show || !categoryForm.nameEn) return;

    try {
      setSaving(true);
      const data = {
        show_id: show.id,
        name: { en: categoryForm.nameEn, lo: categoryForm.nameLo || undefined },
        description: categoryForm.descriptionEn || categoryForm.descriptionLo
          ? { en: categoryForm.descriptionEn || undefined, lo: categoryForm.descriptionLo || undefined }
          : undefined,
        nominee_type: categoryForm.nominee_type,
        sort_order: categoryForm.sort_order,
      };

      if (editingCategory) {
        await awardsAPI.updateCategory(editingCategory.id, data);
      } else {
        await awardsAPI.createCategory(data);
      }

      await loadShow();
      if (selectedEdition) {
        await loadEdition(selectedEdition.id);
      }
      resetCategoryForm();
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (category: AwardCategory) => {
    if (!confirm(`Delete "${category.name.en}"? This will delete all nominations in this category.`)) return;

    try {
      await awardsAPI.deleteCategory(category.id);
      await loadShow();
      if (selectedEdition) {
        await loadEdition(selectedEdition.id);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category');
    }
  };

  // Nomination handlers
  const resetNominationForm = () => {
    setNominationForm({
      person: null,
      movie_id: '',
      for_movie_id: '',
      is_winner: false,
    });
    setAddingNominationTo(null);
  };

  const handleSubmitNomination = async (categoryId: string, nomineeType: 'person' | 'movie') => {
    if (!selectedEdition) return;

    try {
      setSaving(true);
      const data = {
        edition_id: selectedEdition.id,
        category_id: categoryId,
        person_id: nomineeType === 'person' && nominationForm.person ? nominationForm.person.id : undefined,
        movie_id: nomineeType === 'movie' && nominationForm.movie_id ? nominationForm.movie_id : undefined,
        for_movie_id: nominationForm.for_movie_id || undefined,
        is_winner: nominationForm.is_winner,
      };

      await awardsAPI.createNomination(data);
      await loadEdition(selectedEdition.id);
      resetNominationForm();
    } catch (error) {
      console.error('Failed to create nomination:', error);
      alert('Failed to create nomination');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNomination = async (nominationId: string) => {
    if (!confirm('Delete this nomination?')) return;

    try {
      await awardsAPI.deleteNomination(nominationId);
      if (selectedEdition) {
        await loadEdition(selectedEdition.id);
      }
    } catch (error) {
      console.error('Failed to delete nomination:', error);
      alert('Failed to delete nomination');
    }
  };

  const handleSetWinner = async (nominationId: string) => {
    try {
      await awardsAPI.setWinner(nominationId);
      if (selectedEdition) {
        await loadEdition(selectedEdition.id);
      }
    } catch (error) {
      console.error('Failed to set winner:', error);
      alert('Failed to set winner');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="p-6">
        <p className="text-red-600">Award show not found</p>
        <Link href="/admin/awards">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Awards
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6" />
          {show.name.en || show.name.lo}
        </h1>
        {show.name.lo && show.name.en && (
          <p className="text-gray-600">{show.name.lo}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left sidebar - Editions & Categories */}
        <div className="space-y-6">
          {/* Editions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Editions
              </CardTitle>
              <Button size="sm" onClick={() => setShowEditionForm(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {showEditionForm && (
                <form onSubmit={handleSubmitEdition} className="p-3 bg-gray-50 rounded-lg space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Year *</Label>
                      <Input
                        type="number"
                        value={editionForm.year}
                        onChange={(e) => setEditionForm({ ...editionForm, year: parseInt(e.target.value) })}
                        required
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Edition #</Label>
                      <Input
                        type="number"
                        value={editionForm.edition_number}
                        onChange={(e) => setEditionForm({ ...editionForm, edition_number: e.target.value })}
                        placeholder="e.g., 14"
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Custom Name (Optional)</Label>
                    <Input
                      value={editionForm.nameEn}
                      onChange={(e) => setEditionForm({ ...editionForm, nameEn: e.target.value })}
                      placeholder="e.g., Special Anniversary Edition"
                      className="h-8"
                    />
                    <p className="text-xs text-gray-500 mt-1">Override default &quot;{show.name.en || show.name.lo} {editionForm.year}&quot;</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={saving}>
                      {saving ? 'Saving...' : editingEdition ? 'Update' : 'Add'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={resetEditionForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {show.editions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No editions yet</p>
              ) : (
                show.editions.map((edition) => (
                  <div
                    key={edition.id}
                    className={`w-full text-left p-3 rounded-lg cursor-pointer transition-all ${
                      selectedEdition?.id === edition.id
                        ? 'bg-blue-100 border-2 border-blue-500 shadow-sm'
                        : 'bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border-2 border-transparent'
                    }`}
                    onClick={() => loadEdition(edition.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{edition.year}</span>
                        {edition.edition_number && (
                          <span className="text-gray-500 text-sm ml-2">
                            ({getOrdinal(edition.edition_number)})
                          </span>
                        )}
                        {edition.name?.en && (
                          <p className="text-xs text-gray-600">{edition.name.en}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEdition(edition);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEdition(edition);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5" />
                Categories
              </CardTitle>
              <Button size="sm" onClick={() => setShowCategoryForm(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {showCategoryForm && (
                <form onSubmit={handleSubmitCategory} className="p-3 bg-gray-50 rounded-lg space-y-3 mb-4">
                  <div>
                    <Label className="text-xs">Name (English) *</Label>
                    <Input
                      value={categoryForm.nameEn}
                      onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
                      placeholder="e.g., Best Director"
                      className="h-8"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Name (Lao)</Label>
                    <Input
                      value={categoryForm.nameLo}
                      onChange={(e) => setCategoryForm({ ...categoryForm, nameLo: e.target.value })}
                      placeholder="ຊື່ລາງວັນ"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nominee Type</Label>
                    <select
                      value={categoryForm.nominee_type}
                      onChange={(e) => setCategoryForm({ ...categoryForm, nominee_type: e.target.value as 'person' | 'movie' })}
                      className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="person">Person (Actor, Director, etc.)</option>
                      <option value="movie">Movie (Best Film, etc.)</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={saving || !categoryForm.nameEn}>
                      {saving ? 'Saving...' : editingCategory ? 'Update' : 'Add'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={resetCategoryForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {show.categories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No categories yet</p>
              ) : (
                show.categories.map((category) => (
                  <div key={category.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {category.nominee_type === 'person' ? (
                          <User className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Film className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="font-medium text-sm">{category.name.en}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteCategory(category)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {category.name.lo && (
                      <p className="text-xs text-gray-600 mt-1 ml-6">{category.name.lo}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main content - Edition detail */}
        <div className="md:col-span-2">
          {!selectedEdition ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {show.editions.length === 0 ? 'No Editions Yet' : 'Select an Edition'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {show.editions.length === 0 
                    ? 'Create your first edition to start adding nominations.'
                    : 'Choose an edition from the sidebar to manage nominations.'}
                </p>
                {show.editions.length === 0 && (
                  <Button onClick={() => setShowEditionForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Edition
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  {selectedEdition.year} {selectedEdition.show.name.en}
                  {selectedEdition.edition_number && (
                    <span className="text-gray-500 font-normal">
                      ({getOrdinal(selectedEdition.edition_number)} Edition)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedEdition.categories.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No categories defined. Add categories in the sidebar first.
                  </p>
                ) : (
                  selectedEdition.categories.map((category) => (
                    <div key={category.id} className="border rounded-lg">
                      <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {category.nominee_type === 'person' ? (
                            <User className="w-5 h-5 text-gray-600" />
                          ) : (
                            <Film className="w-5 h-5 text-gray-600" />
                          )}
                          <h3 className="font-semibold">{category.name.en}</h3>
                          <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                            {category.nominations.length} nominee{category.nominations.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAddingNominationTo(
                            addingNominationTo === category.id ? null : category.id
                          )}
                        >
                          {addingNominationTo === category.id ? (
                            <>
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Add Nominee
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Add nomination form */}
                      {addingNominationTo === category.id && (
                        <div className="p-4 bg-blue-50 border-b space-y-3">
                          {category.nominee_type === 'person' ? (
                            <>
                              <div>
                                <Label className="text-sm">Select Person</Label>
                                <PersonSearch
                                  onSelect={(person) => setNominationForm({ ...nominationForm, person })}
                                  placeholder="Search for a person..."
                                />
                                {nominationForm.person && (
                                  <div className="mt-2 p-2 bg-white rounded border flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium">
                                      {nominationForm.person.name.en || nominationForm.person.name.lo}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="ml-auto h-6 w-6 p-0"
                                      onClick={() => setNominationForm({ ...nominationForm, person: null })}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div>
                                <Label className="text-sm">For Movie (optional)</Label>
                                <select
                                  value={nominationForm.for_movie_id}
                                  onChange={(e) => setNominationForm({ ...nominationForm, for_movie_id: e.target.value })}
                                  className="w-full h-9 px-3 border border-gray-300 rounded-md text-sm"
                                >
                                  <option value="">Select a movie...</option>
                                  {movies.map((movie) => (
                                    <option key={movie.id} value={movie.id}>
                                      {movie.title?.en || movie.title?.lo || movie.original_title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </>
                          ) : (
                            <div>
                              <Label className="text-sm">Select Movie</Label>
                              <select
                                value={nominationForm.movie_id}
                                onChange={(e) => setNominationForm({ ...nominationForm, movie_id: e.target.value })}
                                className="w-full h-9 px-3 border border-gray-300 rounded-md text-sm"
                              >
                                <option value="">Select a movie...</option>
                                {movies.map((movie) => (
                                  <option key={movie.id} value={movie.id}>
                                    {movie.title?.en || movie.title?.lo || movie.original_title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={nominationForm.is_winner}
                                onChange={(e) => setNominationForm({ ...nominationForm, is_winner: e.target.checked })}
                                className="rounded"
                              />
                              <span className="text-sm">Winner</span>
                            </label>
                            <Button
                              size="sm"
                              onClick={() => handleSubmitNomination(category.id, category.nominee_type)}
                              disabled={
                                saving ||
                                (category.nominee_type === 'person' && !nominationForm.person) ||
                                (category.nominee_type === 'movie' && !nominationForm.movie_id)
                              }
                            >
                              {saving ? 'Adding...' : 'Add Nomination'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Nominations list */}
                      <div className="divide-y">
                        {category.nominations.length === 0 ? (
                          <p className="p-4 text-sm text-gray-500 text-center">
                            No nominations yet
                          </p>
                        ) : (
                          category.nominations.map((nom) => (
                            <div
                              key={nom.id}
                              className={`p-4 flex items-center gap-4 ${
                                nom.is_winner ? 'bg-yellow-50' : ''
                              }`}
                            >
                              {/* Nominee image */}
                              {nom.nominee?.type === 'person' && nom.nominee.profile_path ? (
                                <img
                                  src={getProfileUrl(nom.nominee.profile_path, 'small')!}
                                  alt=""
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : nom.nominee?.type === 'movie' && nom.nominee.poster_path ? (
                                <img
                                  src={getPosterUrl(nom.nominee.poster_path, 'small')!}
                                  alt=""
                                  className="w-10 h-14 rounded object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                  {nom.nominee?.type === 'person' ? (
                                    <User className="w-6 h-6 text-gray-400" />
                                  ) : (
                                    <Film className="w-6 h-6 text-gray-400" />
                                  )}
                                </div>
                              )}

                              {/* Nominee info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {nom.nominee?.type === 'person'
                                      ? (nom.nominee.name?.en || nom.nominee.name?.lo)
                                      : (nom.nominee?.title?.en || nom.nominee?.title?.lo)}
                                  </span>
                                  {nom.is_winner && (
                                    <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <Trophy className="w-3 h-3" />
                                      Winner
                                    </span>
                                  )}
                                </div>
                                {nom.for_movie && (
                                  <p className="text-sm text-gray-600">
                                    for "{nom.for_movie.title?.en || nom.for_movie.title?.lo}"
                                  </p>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex gap-1">
                                {!nom.is_winner && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                    onClick={() => handleSetWinner(nom.id)}
                                    title="Set as winner"
                                  >
                                    <Trophy className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteNomination(nom.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
