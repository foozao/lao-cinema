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
  User, Film, Award, ArrowLeft, Check, X, Layers
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { getProfileUrl, getPosterUrl } from '@/lib/images';
import { getOrdinal } from '@/lib/utils/ordinals';
import type { 
  AwardShow, 
  AwardEdition, 
  AwardCategory, 
  AwardNomination,
  AwardCategoryWithNominations,
  AwardEditionDetail,
  AccoladeSection
} from '@/lib/types';

export default function AdminAwardShowPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [show, setShow] = useState<AwardShow | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<AwardEditionDetail | null>(null);
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

  // Section form (for festival program tracks)
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSection, setEditingSection] = useState<AccoladeSection | null>(null);
  const [sectionForm, setSectionForm] = useState({
    nameEn: '',
    nameLo: '',
    descriptionEn: '',
    descriptionLo: '',
    sort_order: 0,
  });

  // Section selection state (adding movies to sections)
  const [addingSelectionTo, setAddingSelectionTo] = useState<string | null>(null);
  const [selectionMovieId, setSelectionMovieId] = useState('');

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    nameEn: '',
    nameLo: '',
    descriptionEn: '',
    descriptionLo: '',
    nominee_type: 'person' as 'person' | 'movie',
    section_id: '' as string, // Empty string = event-wide, otherwise section-specific
    sort_order: 0,
  });

  // Nomination form
  const [addingNominationTo, setAddingNominationTo] = useState<string | null>(null);
  const [editingNomination, setEditingNomination] = useState<AwardNomination | null>(null);
  const [nominationForm, setNominationForm] = useState({
    person: null as { id: number; name: { en?: string; lo?: string } } | null,
    movie_id: '',
    for_movie_id: '',
    recognition_type_en: '',
    recognition_type_lo: '',
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
        event_id: show.id,
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
      section_id: '',
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
      section_id: category.section_id || '',
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
        event_id: show.id,
        section_id: categoryForm.section_id || undefined, // Empty string becomes undefined (event-wide)
        name: { en: categoryForm.nameEn, lo: categoryForm.nameLo || undefined },
        description: categoryForm.descriptionEn || categoryForm.descriptionLo
          ? { en: categoryForm.descriptionEn || undefined, lo: categoryForm.descriptionLo || undefined }
          : undefined,
        nominee_type: categoryForm.nominee_type,
        sort_order: categoryForm.sort_order,
      };

      if (editingCategory) {
        await awardsAPI.updateCategory(editingCategory.id, {
          ...data,
          section_id: categoryForm.section_id || null, // For update, null = event-wide
        });
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

  // Section handlers (for festival program tracks)
  const resetSectionForm = () => {
    setSectionForm({
      nameEn: '',
      nameLo: '',
      descriptionEn: '',
      descriptionLo: '',
      sort_order: 0,
    });
    setEditingSection(null);
    setShowSectionForm(false);
  };

  const handleEditSection = (section: AccoladeSection) => {
    setEditingSection(section);
    setSectionForm({
      nameEn: section.name.en || '',
      nameLo: section.name.lo || '',
      descriptionEn: section.description?.en || '',
      descriptionLo: section.description?.lo || '',
      sort_order: section.sort_order,
    });
    setShowSectionForm(true);
  };

  const handleSubmitSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!show || !sectionForm.nameEn) return;

    try {
      setSaving(true);
      const data = {
        event_id: show.id,
        name: { en: sectionForm.nameEn, lo: sectionForm.nameLo || undefined },
        description: sectionForm.descriptionEn || sectionForm.descriptionLo
          ? { en: sectionForm.descriptionEn || undefined, lo: sectionForm.descriptionLo || undefined }
          : undefined,
        sort_order: sectionForm.sort_order,
      };

      if (editingSection) {
        await awardsAPI.updateSection(editingSection.id, data);
      } else {
        await awardsAPI.createSection(data);
      }

      await loadShow();
      resetSectionForm();
    } catch (error) {
      console.error('Failed to save section:', error);
      alert('Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (section: AccoladeSection) => {
    if (!confirm(`Delete "${section.name.en}"? This will delete all selections in this section.`)) return;

    try {
      await awardsAPI.deleteSection(section.id);
      await loadShow();
    } catch (error) {
      console.error('Failed to delete section:', error);
      alert('Failed to delete section');
    }
  };

  // Section selection handlers (adding movies to sections)
  const handleAddMovieToSection = async (sectionId: string) => {
    if (!selectedEdition || !selectionMovieId) return;
    
    try {
      setSaving(true);
      await awardsAPI.addMovieToSection({
        section_id: sectionId,
        edition_id: selectedEdition.id,
        movie_id: selectionMovieId,
      });
      await loadEdition(selectedEdition.id);
      setAddingSelectionTo(null);
      setSelectionMovieId('');
    } catch (error) {
      console.error('Failed to add movie to section:', error);
      alert('Failed to add movie to section');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMovieFromSection = async (selectionId: string) => {
    if (!confirm('Remove this film from the section?')) return;
    
    try {
      await awardsAPI.removeMovieFromSection(selectionId);
      if (selectedEdition) {
        await loadEdition(selectedEdition.id);
      }
    } catch (error) {
      console.error('Failed to remove movie from section:', error);
      alert('Failed to remove movie from section');
    }
  };

  // Nomination handlers
  const resetNominationForm = () => {
    setNominationForm({
      person: null,
      movie_id: '',
      for_movie_id: '',
      recognition_type_en: '',
      recognition_type_lo: '',
      is_winner: false,
    });
    setAddingNominationTo(null);
    setEditingNomination(null);
  };

  const handleEditNomination = (nomination: AwardNomination, categoryId: string) => {
    setEditingNomination(nomination);
    setAddingNominationTo(categoryId);
    setNominationForm({
      person: nomination.nominee?.type === 'person' && nomination.nominee.id
        ? { id: nomination.nominee.id as number, name: nomination.nominee.name || {} }
        : null,
      movie_id: nomination.nominee?.type === 'movie' ? String(nomination.nominee.id) : '',
      for_movie_id: nomination.for_movie?.id || '',
      recognition_type_en: nomination.recognition_type?.en || '',
      recognition_type_lo: nomination.recognition_type?.lo || '',
      is_winner: nomination.is_winner,
    });
  };

  const handleSubmitNomination = async (categoryId: string, nomineeType: 'person' | 'movie') => {
    if (!selectedEdition) return;

    try {
      setSaving(true);
      
      const recognitionType = nominationForm.recognition_type_en || nominationForm.recognition_type_lo
        ? { en: nominationForm.recognition_type_en || undefined, lo: nominationForm.recognition_type_lo || undefined }
        : undefined;
      
      if (editingNomination) {
        const updateData = {
          person_id: nomineeType === 'person' && nominationForm.person ? nominationForm.person.id : undefined,
          movie_id: nomineeType === 'movie' && nominationForm.movie_id ? nominationForm.movie_id : undefined,
          for_movie_id: nominationForm.for_movie_id || undefined,
          recognition_type: recognitionType,
          is_winner: nominationForm.is_winner,
        };
        await awardsAPI.updateNomination(editingNomination.id, updateData);
      } else {
        const data = {
          edition_id: selectedEdition.id,
          category_id: categoryId,
          person_id: nomineeType === 'person' && nominationForm.person ? nominationForm.person.id : undefined,
          movie_id: nomineeType === 'movie' && nominationForm.movie_id ? nominationForm.movie_id : undefined,
          for_movie_id: nominationForm.for_movie_id || undefined,
          recognition_type: recognitionType,
          is_winner: nominationForm.is_winner,
        };
        await awardsAPI.createNomination(data);
      }
      
      await loadEdition(selectedEdition.id);
      resetNominationForm();
    } catch (error) {
      console.error(`Failed to ${editingNomination ? 'update' : 'create'} nomination:`, error);
      alert(`Failed to ${editingNomination ? 'update' : 'create'} nomination`);
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
        <p className="text-red-600">Accolade event not found</p>
        <Link href="/admin/accolades">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Accolades
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

              {(show.editions?.length ?? 0) === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No editions yet</p>
              ) : (
                show.editions?.map((edition) => (
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
                  <div>
                    <Label className="text-xs">Scope</Label>
                    <select
                      value={categoryForm.section_id}
                      onChange={(e) => setCategoryForm({ ...categoryForm, section_id: e.target.value })}
                      className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Event-wide (General)</option>
                      {show.sections?.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name.en} (Section)
                        </option>
                      ))}
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

              {(show.categories?.length ?? 0) === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No categories yet</p>
              ) : (
                show.categories?.map((category) => {
                  const section = category.section_id 
                    ? show.sections?.find(s => s.id === category.section_id) 
                    : null;
                  return (
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
                      {section && (
                        <p className="text-xs text-amber-700 mt-1 ml-6 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {section.name.en}
                        </p>
                      )}
                      {!section && category.name.lo && (
                        <p className="text-xs text-gray-600 mt-1 ml-6">{category.name.lo}</p>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Sections (Festival Program Tracks) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Sections
              </CardTitle>
              <Button size="sm" onClick={() => setShowSectionForm(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">
                Optional: For festival program tracks like &quot;Official Selection&quot;, &quot;Panorama&quot;, etc.
              </p>
              {showSectionForm && (
                <form onSubmit={handleSubmitSection} className="p-3 bg-gray-50 rounded-lg space-y-3 mb-4">
                  <div>
                    <Label className="text-xs">Name (English) *</Label>
                    <Input
                      value={sectionForm.nameEn}
                      onChange={(e) => setSectionForm({ ...sectionForm, nameEn: e.target.value })}
                      placeholder="e.g., Official Selection"
                      className="h-8"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Name (Lao)</Label>
                    <Input
                      value={sectionForm.nameLo}
                      onChange={(e) => setSectionForm({ ...sectionForm, nameLo: e.target.value })}
                      placeholder="ຊື່ພາກ"
                      className="h-8"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={saving || !sectionForm.nameEn}>
                      {saving ? 'Saving...' : editingSection ? 'Update' : 'Add'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={resetSectionForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {(show.sections?.length ?? 0) === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">No sections yet</p>
              ) : (
                show.sections?.map((section: AccoladeSection) => (
                  <div key={section.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-sm">{section.name.en}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEditSection(section)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteSection(section)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {section.name.lo && (
                      <p className="text-xs text-gray-600 mt-1 ml-6">{section.name.lo}</p>
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
                  {(show.editions?.length ?? 0) === 0 ? 'No Editions Yet' : 'Select an Edition'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {(show.editions?.length ?? 0) === 0 
                    ? 'Create your first edition to start adding nominations.'
                    : 'Choose an edition from the sidebar to manage nominations.'}
                </p>
                {(show.editions?.length ?? 0) === 0 && (
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
                {/* Sections (Festival Program Tracks) */}
                {(selectedEdition.sections?.length ?? 0) > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Festival Sections
                    </h3>
                    {selectedEdition.sections?.map((section) => (
                      <div key={section.id} className="border rounded-lg">
                        <div className="p-4 bg-blue-50 border-b flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold">{section.name.en}</h4>
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                              {section.selections.length} film{section.selections.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAddingSelectionTo(
                              addingSelectionTo === section.id ? null : section.id
                            )}
                          >
                            {addingSelectionTo === section.id ? (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" />
                                Add Film
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Add movie to section form */}
                        {addingSelectionTo === section.id && (
                          <div className="p-4 border-b bg-blue-50/50 space-y-3">
                            <div>
                              <Label className="text-sm">Select Movie</Label>
                              <select
                                value={selectionMovieId}
                                onChange={(e) => setSelectionMovieId(e.target.value)}
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
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                disabled={saving || !selectionMovieId}
                                onClick={() => handleAddMovieToSection(section.id)}
                              >
                                {saving ? 'Adding...' : 'Add Film'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  setAddingSelectionTo(null);
                                  setSelectionMovieId('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Selection list */}
                        <div className="divide-y">
                          {section.selections.length === 0 ? (
                            <p className="p-4 text-sm text-gray-500 text-center">
                              No films in this section yet
                            </p>
                          ) : (
                            section.selections.map((sel) => (
                              <div key={sel.id} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                                {(() => {
                                  const posterUrl = sel.movie?.poster_path ? getPosterUrl(sel.movie.poster_path) : null;
                                  return posterUrl ? (
                                    <img src={posterUrl} alt="" className="w-10 h-14 object-cover rounded" />
                                  ) : (
                                    <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center">
                                      <Film className="w-4 h-4 text-gray-400" />
                                    </div>
                                  );
                                })()}
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium">
                                    {sel.movie?.title?.en || sel.movie?.title?.lo || 'Unknown'}
                                  </span>
                                  {sel.movie?.release_date && (
                                    <span className="text-gray-500 text-sm ml-2">
                                      ({new Date(sel.movie.release_date).getFullYear()})
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleRemoveMovieFromSection(sel.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Section-specific categories/awards */}
                        {selectedEdition.categories.filter(c => c.section_id === section.id).length > 0 && (
                          <div className="border-t">
                            <div className="p-3 bg-amber-50 border-b">
                              <h5 className="text-sm font-medium text-amber-800 flex items-center gap-2">
                                <Award className="w-4 h-4" />
                                Awards in this Section
                              </h5>
                            </div>
                            {selectedEdition.categories
                              .filter(c => c.section_id === section.id)
                              .map((category) => (
                                <div key={category.id} className="p-3 border-b last:border-b-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">{category.name.en}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7"
                                      onClick={() => setAddingNominationTo(
                                        addingNominationTo === category.id ? null : category.id
                                      )}
                                    >
                                      {addingNominationTo === category.id ? (
                                        <><X className="w-3 h-3 mr-1" />Cancel</>
                                      ) : (
                                        <><Plus className="w-3 h-3 mr-1" />Add</>
                                      )}
                                    </Button>
                                  </div>
                                  
                                  {/* Nomination form for section-specific category */}
                                  {addingNominationTo === category.id && (
                                    <div className="p-3 mb-3 bg-amber-50/50 rounded space-y-2">
                                      {category.nominee_type === 'person' ? (
                                        <>
                                          <div>
                                            <Label className="text-xs">Select Person</Label>
                                            <PersonSearch
                                              onSelect={(person) => setNominationForm({ ...nominationForm, person })}
                                              placeholder="Search for a person..."
                                            />
                                            {nominationForm.person && (
                                              <div className="mt-1 p-2 bg-white rounded border flex items-center gap-2 text-sm">
                                                <Check className="w-3 h-3 text-green-600" />
                                                <span>{nominationForm.person.name.en || nominationForm.person.name.lo}</span>
                                                <Button variant="ghost" size="sm" className="ml-auto h-5 w-5 p-0" onClick={() => setNominationForm({ ...nominationForm, person: null })}>
                                                  <X className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                          <div>
                                            <Label className="text-xs">For Movie (optional)</Label>
                                            <select
                                              value={nominationForm.for_movie_id}
                                              onChange={(e) => setNominationForm({ ...nominationForm, for_movie_id: e.target.value })}
                                              className="w-full h-8 px-2 border border-gray-300 rounded-md text-xs"
                                            >
                                              <option value="">Select a movie...</option>
                                              {movies.map((movie) => (
                                                <option key={movie.id} value={movie.id}>{movie.title?.en || movie.title?.lo || movie.original_title}</option>
                                              ))}
                                            </select>
                                          </div>
                                        </>
                                      ) : (
                                        <div>
                                          <Label className="text-xs">Select Movie</Label>
                                          <select
                                            value={nominationForm.movie_id}
                                            onChange={(e) => setNominationForm({ ...nominationForm, movie_id: e.target.value })}
                                            className="w-full h-8 px-2 border border-gray-300 rounded-md text-xs"
                                          >
                                            <option value="">Select a movie...</option>
                                            {movies.map((movie) => (
                                              <option key={movie.id} value={movie.id}>{movie.title?.en || movie.title?.lo || movie.original_title}</option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                      <div className="flex gap-2 pt-1">
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs"
                                          disabled={saving || (category.nominee_type === 'person' ? !nominationForm.person : !nominationForm.movie_id)}
                                          onClick={() => handleSubmitNomination(category.id, category.nominee_type)}
                                        >
                                          {saving ? 'Saving...' : 'Add Nomination'}
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={resetNominationForm}>
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {category.nominations.length === 0 && addingNominationTo !== category.id ? (
                                    <p className="text-xs text-gray-500">No nominations yet</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {category.nominations.map((nom) => (
                                        <div key={nom.id} className="text-sm flex items-center gap-2">
                                          {nom.is_winner && <Trophy className="w-3 h-3 text-yellow-500" />}
                                          <span>{nom.nominee?.name?.en || nom.nominee?.title?.en || 'Unknown'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Event-wide Categories (Awards/Nominations) - excludes section-specific ones */}
                {(() => {
                  const eventWideCategories = selectedEdition.categories.filter(c => !c.section_id);
                  const hasAnySections = (selectedEdition.sections?.length ?? 0) > 0;
                  
                  if (eventWideCategories.length === 0 && !hasAnySections) {
                    return (
                      <p className="text-center text-gray-500 py-8">
                        No categories or sections defined. Add them in the sidebar first.
                      </p>
                    );
                  }
                  
                  if (eventWideCategories.length === 0) return null;
                  
                  return (
                    <div className="space-y-4">
                      {hasAnySections && (
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mt-6">
                          <Award className="w-4 h-4" />
                          General Awards
                        </h3>
                      )}
                      {eventWideCategories.map((category) => (
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

                      {/* Add/Edit nomination form */}
                      {addingNominationTo === category.id && (
                        <div className={`p-4 border-b space-y-3 ${editingNomination ? 'bg-amber-50' : 'bg-blue-50'}`}>
                          {editingNomination && (
                            <div className="flex items-center gap-2 text-sm font-medium text-amber-700 mb-2">
                              <Pencil className="w-4 h-4" />
                              Editing Nomination
                            </div>
                          )}
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
                          <div>
                            <Label className="text-sm">Recognition Type (optional)</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                value={nominationForm.recognition_type_en}
                                onChange={(e) => setNominationForm({ ...nominationForm, recognition_type_en: e.target.value })}
                                placeholder="e.g., Special Mention"
                                className="h-9"
                              />
                              <Input
                                value={nominationForm.recognition_type_lo}
                                onChange={(e) => setNominationForm({ ...nominationForm, recognition_type_lo: e.target.value })}
                                placeholder="ພາສາລາວ"
                                className="h-9"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">For non-winner recognitions like &quot;Special Mention&quot;, &quot;Honorable Mention&quot;, etc.</p>
                          </div>
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
                              {saving ? (editingNomination ? 'Updating...' : 'Adding...') : (editingNomination ? 'Update Nomination' : 'Add Nomination')}
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
                                <div className="flex items-center gap-2 flex-wrap">
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
                                  {!nom.is_winner && nom.recognition_type?.en && (
                                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">
                                      {nom.recognition_type.en}
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
                                  className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleEditNomination(nom, category.id)}
                                  title="Edit nomination"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
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
                  ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
