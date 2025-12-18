'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Edit, Plus, Trash2, Building2, X, ArrowUpDown, Upload, Loader2 } from 'lucide-react';
import { productionCompaniesAPI } from '@/lib/api/client';
import { getProductionCompanyLogoUrl } from '@/lib/images';
import { API_BASE_URL } from '@/lib/config';
import { useAdminList } from '@/hooks/use-admin-list';

interface ProductionCompany {
  id: number;
  name: { en?: string; lo?: string } | string;
  slug?: string;
  logo_path?: string;
  custom_logo_url?: string;
  website_url?: string;
  origin_country?: string;
  movies?: Array<{
    id: string;
    title: { en?: string; lo?: string };
  }>;
}

type SortOption = 'movies-desc' | 'movies-asc' | 'name-asc' | 'name-desc';

export default function ProductionCompaniesAdminPage() {
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations('admin');
  
  const { 
    filteredItems: filteredCompanies, 
    loading, 
    searchQuery, 
    setSearchQuery, 
    sortBy, 
    setSortBy,
    reload: loadCompanies 
  } = useAdminList<ProductionCompany>({
    fetchFn: productionCompaniesAPI.getAll,
    dataKey: 'companies',
    searchFields: (company) => {
      const nameEn = typeof company.name === 'string' ? company.name : company.name?.en || '';
      const nameLo = typeof company.name === 'string' ? '' : company.name?.lo || '';
      return [nameEn, nameLo];
    },
    sortFn: (a, b, sort) => {
      const aMovieCount = a.movies?.length || 0;
      const bMovieCount = b.movies?.length || 0;
      const aName = typeof a.name === 'string' ? a.name : a.name?.en || '';
      const bName = typeof b.name === 'string' ? b.name : b.name?.en || '';
      
      switch (sort) {
        case 'movies-desc':
          if (bMovieCount !== aMovieCount) return bMovieCount - aMovieCount;
          return aName.localeCompare(bName);
        case 'movies-asc':
          if (aMovieCount !== bMovieCount) return aMovieCount - bMovieCount;
          return aName.localeCompare(bName);
        case 'name-asc':
          return aName.localeCompare(bName);
        case 'name-desc':
          return bName.localeCompare(aName);
        default:
          return 0;
      }
    },
    initialSort: 'movies-desc',
  });
  
  // Edit modal state
  const [editingCompany, setEditingCompany] = useState<ProductionCompany | null>(null);
  const [editForm, setEditForm] = useState({ nameEn: '', nameLo: '', originCountry: '', slug: '', customLogoUrl: '', websiteUrl: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingEditLogo, setUploadingEditLogo] = useState(false);
  
  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ nameEn: '', nameLo: '', originCountry: '', slug: '', customLogoUrl: '', websiteUrl: '' });
  const [adding, setAdding] = useState(false);
  const [uploadingAddLogo, setUploadingAddLogo] = useState(false);

  // Handle logo upload
  const handleLogoUpload = async (file: File, isEdit: boolean) => {
    if (isEdit) {
      setUploadingEditLogo(true);
    } else {
      setUploadingAddLogo(true);
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE_URL}/upload/image`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      
      if (isEdit) {
        setEditForm(prev => ({ ...prev, customLogoUrl: data.url }));
      } else {
        setAddForm(prev => ({ ...prev, customLogoUrl: data.url }));
      }
    } catch (error) {
      console.error('Failed to upload logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      if (isEdit) {
        setUploadingEditLogo(false);
      } else {
        setUploadingAddLogo(false);
      }
    }
  };


  const getCompanyName = (company: ProductionCompany) => {
    if (typeof company.name === 'string') return company.name;
    return company.name?.en || company.name?.lo || 'Unknown';
  };

  const handleEdit = (company: ProductionCompany) => {
    setEditingCompany(company);
    setEditForm({
      nameEn: typeof company.name === 'string' ? company.name : company.name?.en || '',
      nameLo: typeof company.name === 'string' ? '' : company.name?.lo || '',
      originCountry: company.origin_country || '',
      slug: company.slug || '',
      customLogoUrl: company.custom_logo_url || '',
      websiteUrl: company.website_url || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCompany || !editForm.nameEn.trim()) return;
    
    setSaving(true);
    try {
      await productionCompaniesAPI.update(editingCompany.id, {
        name: {
          en: editForm.nameEn.trim(),
          lo: editForm.nameLo.trim() || undefined,
        },
        origin_country: editForm.originCountry.trim() || undefined,
        slug: editForm.slug.trim() || undefined,
        custom_logo_url: editForm.customLogoUrl.trim() || undefined,
        website_url: editForm.websiteUrl.trim() || undefined,
      });
      await loadCompanies();
      setEditingCompany(null);
    } catch (error) {
      console.error('Failed to update company:', error);
      alert('Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!addForm.nameEn.trim()) return;
    
    setAdding(true);
    try {
      await productionCompaniesAPI.create({
        name: {
          en: addForm.nameEn.trim(),
          lo: addForm.nameLo.trim() || undefined,
        },
        origin_country: addForm.originCountry.trim() || undefined,
        slug: addForm.slug.trim() || undefined,
        custom_logo_url: addForm.customLogoUrl.trim() || undefined,
        website_url: addForm.websiteUrl.trim() || undefined,
      });
      await loadCompanies();
      setShowAddModal(false);
      setAddForm({ nameEn: '', nameLo: '', originCountry: '', slug: '', customLogoUrl: '', websiteUrl: '' });
    } catch (error) {
      console.error('Failed to add company:', error);
      alert('Failed to add company');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (company: ProductionCompany) => {
    if (!confirm(`Delete "${getCompanyName(company)}"? This will remove it from all movies.`)) return;
    
    try {
      await productionCompaniesAPI.delete(company.id);
      await loadCompanies();
    } catch (error) {
      console.error('Failed to delete company:', error);
      alert('Failed to delete company');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">{t('productionCompanies')}</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addCompany')}
        </Button>
      </div>

      {/* Search and Sort */}
      <div className="mb-6 flex gap-4 items-start">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder={t('searchCompanies')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && filteredCompanies.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {t('showingResults', { count: filteredCompanies.length })}
            </p>
          )}
        </div>
        
        <div className="w-64">
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full h-10 pl-9 pr-4 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="movies-desc">{t('mostMoviesFirst')}</option>
              <option value="movies-asc">{t('fewestMoviesFirst')}</option>
              <option value="name-asc">{t('nameAZ')}</option>
              <option value="name-desc">{t('nameZA')}</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Companies List */}
      {filteredCompanies.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">
            {searchQuery ? t('noCompaniesFound') : t('noCompaniesYet')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCompanies.map((company) => (
            <div 
              key={company.id} 
              className="bg-white rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {getProductionCompanyLogoUrl(company, 'w92') ? (
                    <img
                      src={getProductionCompanyLogoUrl(company, 'w92')!}
                      alt={getCompanyName(company)}
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {getCompanyName(company)}
                        {company.origin_country && (
                          <span className="text-gray-400 font-normal ml-2">({company.origin_country})</span>
                        )}
                      </h3>
                      {typeof company.name !== 'string' && company.name?.lo && (
                        <p className="text-sm text-gray-500 truncate">{company.name.lo}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(company)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(company)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Movies List */}
                  {company.movies && company.movies.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-medium text-gray-500">
                          {t('moviesCount', { count: company.movies.length })}
                        </span>
                        {company.movies.map((movie) => (
                          <Link
                            key={movie.id}
                            href={`/admin/edit/${movie.id}`}
                            className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 hover:bg-blue-100 text-sm text-gray-700 hover:text-blue-700 transition-colors"
                          >
                            {typeof movie.title === 'string' ? movie.title : movie.title[locale] || movie.title.en}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editingCompany} onOpenChange={() => setEditingCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editProductionCompany')}</DialogTitle>
            <DialogDescription>{t('updateCompanyDetails')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>{t('nameEnglish')} *</Label>
              <Input
                value={editForm.nameEn}
                onChange={(e) => setEditForm(prev => ({ ...prev, nameEn: e.target.value }))}
                placeholder="Company name in English"
              />
            </div>
            <div>
              <Label>{t('nameLao')}</Label>
              <Input
                value={editForm.nameLo}
                onChange={(e) => setEditForm(prev => ({ ...prev, nameLo: e.target.value }))}
                placeholder="ຊື່ບໍລິສັດເປັນພາສາລາວ"
              />
            </div>
            <div>
              <Label>{t('countryCode')}</Label>
              <Input
                value={editForm.originCountry}
                onChange={(e) => setEditForm(prev => ({ ...prev, originCountry: e.target.value.toUpperCase() }))}
                placeholder="e.g., LA, US, SG"
                maxLength={2}
              />
            </div>
            <div>
              <Label>{t('vanityUrl')}</Label>
              <Input
                value={editForm.slug}
                onChange={(e) => setEditForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                placeholder="e.g., hoppin-film"
              />
              <p className="text-xs text-gray-500 mt-1">Used in URL: /production/{editForm.slug || 'slug'}</p>
            </div>
            <div>
              <Label>{t('logo')}</Label>
              <div className="space-y-2">
                {editForm.customLogoUrl && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={editForm.customLogoUrl} 
                      alt="Logo preview" 
                      className="w-16 h-16 object-contain bg-gray-100 rounded border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditForm(prev => ({ ...prev, customLogoUrl: '' }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, true);
                      }}
                      disabled={uploadingEditLogo}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full cursor-pointer"
                      disabled={uploadingEditLogo}
                      asChild
                    >
                      <span>
                        {uploadingEditLogo ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" />Upload Logo</>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
                <Input
                  value={editForm.customLogoUrl}
                  onChange={(e) => setEditForm(prev => ({ ...prev, customLogoUrl: e.target.value }))}
                  placeholder="Or paste URL: https://example.com/logo.png"
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <Label>{t('website')}</Label>
              <Input
                value={editForm.websiteUrl}
                onChange={(e) => setEditForm(prev => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder="https://company-website.com"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setEditingCompany(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving || !editForm.nameEn.trim()}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addProductionCompany')}</DialogTitle>
            <DialogDescription>{t('addCompanyToDatabase')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>{t('nameEnglish')} *</Label>
              <Input
                value={addForm.nameEn}
                onChange={(e) => setAddForm(prev => ({ ...prev, nameEn: e.target.value }))}
                placeholder="Company name in English"
              />
            </div>
            <div>
              <Label>{t('nameLao')}</Label>
              <Input
                value={addForm.nameLo}
                onChange={(e) => setAddForm(prev => ({ ...prev, nameLo: e.target.value }))}
                placeholder="ຊື່ບໍລິສັດເປັນພາສາລາວ"
              />
            </div>
            <div>
              <Label>{t('countryCode')}</Label>
              <Input
                value={addForm.originCountry}
                onChange={(e) => setAddForm(prev => ({ ...prev, originCountry: e.target.value.toUpperCase() }))}
                placeholder="e.g., LA, US, SG"
                maxLength={2}
              />
            </div>
            <div>
              <Label>{t('vanityUrl')}</Label>
              <Input
                value={addForm.slug}
                onChange={(e) => setAddForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                placeholder="e.g., hoppin-film"
              />
              <p className="text-xs text-gray-500 mt-1">Used in URL: /production/{addForm.slug || 'slug'}</p>
            </div>
            <div>
              <Label>{t('logo')}</Label>
              <div className="space-y-2">
                {addForm.customLogoUrl && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={addForm.customLogoUrl} 
                      alt="Logo preview" 
                      className="w-16 h-16 object-contain bg-gray-100 rounded border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddForm(prev => ({ ...prev, customLogoUrl: '' }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, false);
                      }}
                      disabled={uploadingAddLogo}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full cursor-pointer"
                      disabled={uploadingAddLogo}
                      asChild
                    >
                      <span>
                        {uploadingAddLogo ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" />Upload Logo</>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
                <Input
                  value={addForm.customLogoUrl}
                  onChange={(e) => setAddForm(prev => ({ ...prev, customLogoUrl: e.target.value }))}
                  placeholder="Or paste URL: https://example.com/logo.png"
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <Label>{t('website')}</Label>
              <Input
                value={addForm.websiteUrl}
                onChange={(e) => setAddForm(prev => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder="https://company-website.com"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={adding || !addForm.nameEn.trim()}>
                {adding ? 'Adding...' : 'Add Company'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
