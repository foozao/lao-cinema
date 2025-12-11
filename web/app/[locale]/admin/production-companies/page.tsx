'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Edit, Plus, Trash2, Building2, X } from 'lucide-react';
import { productionCompaniesAPI } from '@/lib/api/client';

interface ProductionCompany {
  id: number;
  name: { en?: string; lo?: string } | string;
  logo_path?: string;
  origin_country?: string;
}

export default function ProductionCompaniesAdminPage() {
  const locale = useLocale() as 'en' | 'lo';
  const [companies, setCompanies] = useState<ProductionCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<ProductionCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit modal state
  const [editingCompany, setEditingCompany] = useState<ProductionCompany | null>(null);
  const [editForm, setEditForm] = useState({ nameEn: '', nameLo: '', originCountry: '' });
  const [saving, setSaving] = useState(false);
  
  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ nameEn: '', nameLo: '', originCountry: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await productionCompaniesAPI.getAll();
      setCompanies(response.companies);
      setFilteredCompanies(response.companies);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter companies based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCompanies(companies);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = companies.filter((company) => {
      const nameEn = typeof company.name === 'string' ? company.name : company.name?.en || '';
      const nameLo = typeof company.name === 'string' ? '' : company.name?.lo || '';
      return nameEn.toLowerCase().includes(query) || nameLo.toLowerCase().includes(query);
    });
    setFilteredCompanies(filtered);
  }, [searchQuery, companies]);

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
      });
      await loadCompanies();
      setShowAddModal(false);
      setAddForm({ nameEn: '', nameLo: '', originCountry: '' });
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
        <h2 className="text-3xl font-bold text-gray-900">Production Companies</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-600 mt-2">
            Showing {filteredCompanies.length} of {companies.length} companies
          </p>
        )}
      </div>

      {/* Companies List */}
      {filteredCompanies.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">
            {searchQuery ? 'No companies found matching your search.' : 'No production companies yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {company.logo_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${company.logo_path}`}
                        alt={getCompanyName(company)}
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {getCompanyName(company)}
                    </h3>
                    {typeof company.name !== 'string' && company.name?.lo && (
                      <p className="text-sm text-gray-500 truncate">{company.name.lo}</p>
                    )}
                    {company.origin_country && (
                      <p className="text-xs text-gray-400 mt-1">{company.origin_country}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editingCompany} onOpenChange={() => setEditingCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Production Company</DialogTitle>
            <DialogDescription>Update the company details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Name (English) *</Label>
              <Input
                value={editForm.nameEn}
                onChange={(e) => setEditForm(prev => ({ ...prev, nameEn: e.target.value }))}
                placeholder="Company name in English"
              />
            </div>
            <div>
              <Label>Name (Lao)</Label>
              <Input
                value={editForm.nameLo}
                onChange={(e) => setEditForm(prev => ({ ...prev, nameLo: e.target.value }))}
                placeholder="ຊື່ບໍລິສັດເປັນພາສາລາວ"
              />
            </div>
            <div>
              <Label>Country Code</Label>
              <Input
                value={editForm.originCountry}
                onChange={(e) => setEditForm(prev => ({ ...prev, originCountry: e.target.value.toUpperCase() }))}
                placeholder="e.g., LA, US, SG"
                maxLength={2}
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
            <DialogTitle>Add Production Company</DialogTitle>
            <DialogDescription>Add a new production company to the database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Name (English) *</Label>
              <Input
                value={addForm.nameEn}
                onChange={(e) => setAddForm(prev => ({ ...prev, nameEn: e.target.value }))}
                placeholder="Company name in English"
              />
            </div>
            <div>
              <Label>Name (Lao)</Label>
              <Input
                value={addForm.nameLo}
                onChange={(e) => setAddForm(prev => ({ ...prev, nameLo: e.target.value }))}
                placeholder="ຊື່ບໍລິສັດເປັນພາສາລາວ"
              />
            </div>
            <div>
              <Label>Country Code</Label>
              <Input
                value={addForm.originCountry}
                onChange={(e) => setAddForm(prev => ({ ...prev, originCountry: e.target.value.toUpperCase() }))}
                placeholder="e.g., LA, US, SG"
                maxLength={2}
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
