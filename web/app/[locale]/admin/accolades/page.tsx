'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { awardsAPI } from '@/lib/api/client';
import { getAwardShowLocation } from '@/lib/i18n/get-country-name';
import { Plus, Pencil, Trash2, ChevronRight, Trophy, Calendar, Globe, ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { CountrySelect } from '@/components/admin/country-select';
import type { AwardShow } from '@/lib/types';

export default function AdminAwardsPage() {
  const [shows, setShows] = useState<AwardShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingShow, setEditingShow] = useState<AwardShow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    slug: '',
    nameEn: '',
    nameLo: '',
    descriptionEn: '',
    descriptionLo: '',
    country: '',
    city: '',
    websiteUrl: '',
  });

  useEffect(() => {
    loadShows();
  }, []);

  const loadShows = async () => {
    try {
      setLoading(true);
      const response = await awardsAPI.getShows();
      setShows(response.shows);
    } catch (error) {
      console.error('Failed to load award shows:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      slug: '',
      nameEn: '',
      nameLo: '',
      descriptionEn: '',
      descriptionLo: '',
      country: '',
      city: '',
      websiteUrl: '',
    });
    setEditingShow(null);
    setShowCreateForm(false);
  };

  const handleEdit = (show: AwardShow) => {
    setEditingShow(show);
    setFormData({
      slug: show.slug || '',
      nameEn: show.name.en || '',
      nameLo: show.name.lo || '',
      descriptionEn: show.description?.en || '',
      descriptionLo: show.description?.lo || '',
      country: show.country || '',
      city: show.city || '',
      websiteUrl: show.website_url || '',
    });
    setShowCreateForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameEn) return;

    try {
      setSaving(true);
      const data = {
        slug: formData.slug || undefined,
        name: { en: formData.nameEn, lo: formData.nameLo || undefined },
        description: formData.descriptionEn || formData.descriptionLo
          ? { en: formData.descriptionEn || undefined, lo: formData.descriptionLo || undefined }
          : undefined,
        country: formData.country || undefined,
        city: formData.city || undefined,
        website_url: formData.websiteUrl || undefined,
      };

      if (editingShow) {
        await awardsAPI.updateShow(editingShow.id, data);
      } else {
        await awardsAPI.createShow(data);
      }

      await loadShows();
      resetForm();
    } catch (error) {
      console.error('Failed to save award show:', error);
      alert('Failed to save award show');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (show: AwardShow) => {
    if (!confirm(`Delete "${show.name.en || show.name.lo}"? This will also delete all editions, categories, and nominations.`)) {
      return;
    }

    try {
      await awardsAPI.deleteShow(show.id);
      await loadShows();
    } catch (error) {
      console.error('Failed to delete award show:', error);
      alert('Failed to delete award show');
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Accolade Events
          </h1>
          <p className="text-gray-600 mt-1">Manage film accolades and recognition events</p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Accolade Event
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingShow ? 'Edit Accolade Event' : 'Create Accolade Event'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name (English) *</Label>
                  <Input
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder="e.g., Luang Prabang Film Festival"
                    required
                  />
                </div>
                <div>
                  <Label>Name (Lao)</Label>
                  <Input
                    value={formData.nameLo}
                    onChange={(e) => setFormData({ ...formData, nameLo: e.target.value })}
                    placeholder="ຊື່ເປັນພາສາລາວ"
                  />
                </div>
              </div>

              <div>
                <Label>URL Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g., lpff"
                />
                <p className="text-xs text-gray-500 mt-1">Used in URLs, leave blank to auto-generate</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Description (English)</Label>
                  <textarea
                    value={formData.descriptionEn}
                    onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                    placeholder="Brief description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Description (Lao)</Label>
                  <textarea
                    value={formData.descriptionLo}
                    onChange={(e) => setFormData({ ...formData, descriptionLo: e.target.value })}
                    placeholder="ຄຳອະທິບາຍ..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Country</Label>
                  <CountrySelect
                    value={formData.country}
                    onChange={(value) => setFormData({ ...formData, country: value })}
                    existingCountryCodes={shows.map(s => s.country).filter((c): c is string => !!c)}
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g., Luang Prabang"
                  />
                </div>
                <div>
                  <Label>Website URL</Label>
                  <Input
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !formData.nameEn}>
                  {saving ? 'Saving...' : editingShow ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Shows List */}
      {shows.length === 0 && !showCreateForm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Accolade Events</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first accolade event.</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Accolade Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {shows.map((show) => (
            <Card key={show.id} className="hover:shadow-md transition-shadow py-0">
              <CardContent className="px-4 py-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">
                        {show.name.en || show.name.lo || 'Untitled'}
                      </h3>
                      {show.website_url && (
                        <a
                          href={show.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {show.website_url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {show.name.lo && show.name.en && (
                      <p className="text-sm text-gray-600 mt-0.5">{show.name.lo}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                      {(show.city || show.country) && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-4 h-4" />
                          {getAwardShowLocation(show.city, show.country)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {show.edition_count || 0} edition{show.edition_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/accolades/${show.id}`}>
                      <Button variant="outline" size="sm">
                        Manage
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(show)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(show)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
