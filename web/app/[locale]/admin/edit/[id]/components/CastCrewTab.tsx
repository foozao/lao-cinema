'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, CheckCircle, X, Trash2, ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getLocalizedText } from '@/lib/i18n';
import { getProfileUrl } from '@/lib/images';
import { PersonSearch } from '@/components/admin/person-search';
import { ProductionCompanySearch } from '@/components/admin/production-company-search';
import type { Movie } from '@/lib/types';
import type { CastTranslations, CrewTranslations } from './types';

interface CastCrewTabProps {
  currentMovie: Movie | null;
  castTranslations: CastTranslations;
  crewTranslations: CrewTranslations;
  onCastTranslationsChange: (translations: CastTranslations) => void;
  onCrewTranslationsChange: (translations: CrewTranslations) => void;
  onAddCast: (person: { id: number; name: { en?: string; lo?: string } }, characterEn: string, characterLo: string) => Promise<void>;
  onAddCrew: (person: { id: number; name: { en?: string; lo?: string } }, department: string, jobEn: string, jobLo: string) => Promise<void>;
  onRemoveCast: (personId: number) => Promise<void>;
  onRemoveCrew: (personId: number, department: string) => Promise<void>;
  onCreatePersonForCast: (name: string) => Promise<{ id: number; name: { en?: string; lo?: string } }>;
  onCreatePersonForCrew: (name: string, department: string) => Promise<{ id: number; name: { en?: string; lo?: string } }>;
  onAddProductionCompany: (company: { id: number; name: { en?: string; lo?: string } }) => Promise<void>;
  onCreateProductionCompany: (name: string) => Promise<void>;
  onRemoveProductionCompany: (companyId: number) => Promise<void>;
  onSaveCastCrewUpdates: () => Promise<void>;
}

export function CastCrewTab({
  currentMovie,
  castTranslations,
  crewTranslations,
  onCastTranslationsChange,
  onCrewTranslationsChange,
  onAddCast,
  onAddCrew,
  onRemoveCast,
  onRemoveCrew,
  onCreatePersonForCast,
  onCreatePersonForCrew,
  onAddProductionCompany,
  onCreateProductionCompany,
  onRemoveProductionCompany,
  onSaveCastCrewUpdates,
}: CastCrewTabProps) {
  // Local state for add cast/crew forms
  const [showAddCast, setShowAddCast] = useState(false);
  const [showAddCrew, setShowAddCrew] = useState(false);
  const [showAddProductionCompany, setShowAddProductionCompany] = useState(false);
  
  const [selectedCastPerson, setSelectedCastPerson] = useState<{ id: number; name: { en?: string; lo?: string } } | null>(null);
  const [selectedCrewPerson, setSelectedCrewPerson] = useState<{ id: number; name: { en?: string; lo?: string } } | null>(null);
  
  const [newCastCharacterEn, setNewCastCharacterEn] = useState('');
  const [newCastCharacterLo, setNewCastCharacterLo] = useState('');
  const [newCrewDepartment, setNewCrewDepartment] = useState('Directing');
  const [newCrewJobEn, setNewCrewJobEn] = useState('');
  const [newCrewJobLo, setNewCrewJobLo] = useState('');
  
  const [addingCast, setAddingCast] = useState(false);
  const [addingCrew, setAddingCrew] = useState(false);
  const [addingProductionCompany, setAddingProductionCompany] = useState(false);
  
  const [editingCast, setEditingCast] = useState<string | null>(null);
  const [editingCrew, setEditingCrew] = useState<string | null>(null);

  const handleSubmitCast = async () => {
    if (!selectedCastPerson) return;
    
    try {
      setAddingCast(true);
      await onAddCast(selectedCastPerson, newCastCharacterEn, newCastCharacterLo);
      
      // Reset form
      setSelectedCastPerson(null);
      setNewCastCharacterEn('');
      setNewCastCharacterLo('');
    } catch (error) {
      console.error('Failed to add cast member:', error);
      alert('Failed to add cast member');
    } finally {
      setAddingCast(false);
    }
  };

  const handleSubmitCrew = async () => {
    if (!selectedCrewPerson) return;
    
    try {
      setAddingCrew(true);
      await onAddCrew(selectedCrewPerson, newCrewDepartment, newCrewJobEn, newCrewJobLo);
      
      // Reset form
      setSelectedCrewPerson(null);
      setNewCrewJobEn('');
      setNewCrewJobLo('');
    } catch (error) {
      console.error('Failed to add crew member:', error);
      alert('Failed to add crew member');
    } finally {
      setAddingCrew(false);
    }
  };

  const handleCreatePersonForCast = async (name: string) => {
    const newPerson = await onCreatePersonForCast(name);
    setSelectedCastPerson(newPerson);
  };

  const handleCreatePersonForCrew = async (name: string) => {
    const newPerson = await onCreatePersonForCrew(name, newCrewDepartment);
    setSelectedCrewPerson(newPerson);
  };

  const handleAddProductionCompany = async (company: { id: number; name: { en?: string; lo?: string } }) => {
    try {
      setAddingProductionCompany(true);
      await onAddProductionCompany(company);
      setShowAddProductionCompany(false);
    } catch (error) {
      console.error('Failed to add production company:', error);
      alert('Failed to add production company');
    } finally {
      setAddingProductionCompany(false);
    }
  };

  const handleCreateProductionCompany = async (name: string) => {
    try {
      setAddingProductionCompany(true);
      await onCreateProductionCompany(name);
      setShowAddProductionCompany(false);
    } catch (error) {
      console.error('Failed to create production company:', error);
      alert('Failed to create production company');
    } finally {
      setAddingProductionCompany(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Cast Member - Collapsible */}
      <Card>
        <CardHeader 
          className="cursor-pointer select-none" 
          onClick={() => setShowAddCast(!showAddCast)}
        >
          <CardTitle className="flex items-center gap-2">
            {showAddCast ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            Add Cast Member
          </CardTitle>
        </CardHeader>
        {showAddCast && (
          <CardContent className="space-y-4">
            <div>
              <Label>Search for Person</Label>
              <PersonSearch
                onSelect={setSelectedCastPerson}
                onCreateNew={handleCreatePersonForCast}
                placeholder="Search for an actor..."
              />
            </div>
            {selectedCastPerson && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="flex-1 font-medium text-blue-900">
                  Selected: {selectedCastPerson.name.en || selectedCastPerson.name.lo || 'Unknown'}
                </span>
                <button
                  onClick={() => setSelectedCastPerson(null)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Character Name (English)</Label>
                <Input
                  value={newCastCharacterEn}
                  onChange={(e) => setNewCastCharacterEn(e.target.value)}
                  placeholder="e.g., John Smith"
                />
              </div>
              <div>
                <Label>Character Name (Lao)</Label>
                <Input
                  value={newCastCharacterLo}
                  onChange={(e) => setNewCastCharacterLo(e.target.value)}
                  placeholder="ຊື່ຕົວລະຄອນ"
                />
              </div>
            </div>
            <Button
              onClick={handleSubmitCast}
              disabled={!selectedCastPerson || addingCast}
              size="sm"
            >
              {addingCast ? 'Adding...' : 'Add Cast Member'}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Add Crew Member - Collapsible */}
      <Card>
        <CardHeader 
          className="cursor-pointer select-none" 
          onClick={() => setShowAddCrew(!showAddCrew)}
        >
          <CardTitle className="flex items-center gap-2">
            {showAddCrew ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            Add Crew Member
          </CardTitle>
        </CardHeader>
        {showAddCrew && (
          <CardContent className="space-y-4">
            <div>
              <Label>Search for Person</Label>
              <PersonSearch
                onSelect={setSelectedCrewPerson}
                onCreateNew={handleCreatePersonForCrew}
                placeholder="Search for a crew member..."
              />
            </div>
            {selectedCrewPerson && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="flex-1 font-medium text-blue-900">
                  Selected: {selectedCrewPerson.name.en || selectedCrewPerson.name.lo || 'Unknown'}
                </span>
                <button
                  onClick={() => setSelectedCrewPerson(null)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Department</Label>
                <select
                  value={newCrewDepartment}
                  onChange={(e) => setNewCrewDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Directing">Directing</option>
                  <option value="Writing">Writing</option>
                  <option value="Production">Production</option>
                  <option value="Camera">Camera</option>
                  <option value="Editing">Editing</option>
                  <option value="Sound">Sound</option>
                  <option value="Art">Art</option>
                  <option value="Costume & Make-Up">Costume & Make-Up</option>
                  <option value="Visual Effects">Visual Effects</option>
                  <option value="Crew">Crew</option>
                </select>
              </div>
              <div>
                <Label>Job Title (English)</Label>
                <Input
                  value={newCrewJobEn}
                  onChange={(e) => setNewCrewJobEn(e.target.value)}
                  placeholder="e.g., Director"
                />
              </div>
              <div>
                <Label>Job Title (Lao)</Label>
                <Input
                  value={newCrewJobLo}
                  onChange={(e) => setNewCrewJobLo(e.target.value)}
                  placeholder="ຕຳແໜ່ງ"
                />
              </div>
            </div>
            <Button
              onClick={handleSubmitCrew}
              disabled={!selectedCrewPerson || addingCrew}
              size="sm"
            >
              {addingCrew ? 'Adding...' : 'Add Crew Member'}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Existing Cast & Crew */}
      {currentMovie && (currentMovie.cast.length > 0 || currentMovie.crew.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Current Cast & Crew</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cast */}
            {currentMovie.cast.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Cast ({currentMovie.cast.length})</h3>
                <div className="space-y-3">
                  {currentMovie.cast.map((member, index) => {
                    const key = `${member.person.id}`;
                    const isEditing = editingCast === key;
                    const trans = castTranslations[key] || { character_en: member.character.en || '', character_lo: member.character.lo || '' };
                    
                    return (
                      <div key={`cast-${member.person.id}-${index}`} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          {member.person.profile_path && (
                            <img
                              src={getProfileUrl(member.person.profile_path, 'small')!}
                              alt={getLocalizedText(member.person.name, 'en')}
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm mb-1">
                              {getLocalizedText(member.person.name, 'en')}
                            </p>
                            {!isEditing ? (
                              <div className="space-y-1">
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">EN:</span> {trans.character_en || '(not set)'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">LO:</span> {trans.character_lo || '(not set)'}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2 mt-2">
                                <div>
                                  <Label className="text-xs">Character (English)</Label>
                                  <Input
                                    value={trans.character_en}
                                    onChange={(e) => {
                                      onCastTranslationsChange({
                                        ...castTranslations,
                                        [key]: { ...castTranslations[key], character_en: e.target.value }
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        setEditingCast(null);
                                        onSaveCastCrewUpdates();
                                      }
                                    }}
                                    placeholder="Character name in English"
                                    className="text-xs h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Character (Lao)</Label>
                                  <Input
                                    value={trans.character_lo}
                                    onChange={(e) => {
                                      onCastTranslationsChange({
                                        ...castTranslations,
                                        [key]: { ...castTranslations[key], character_lo: e.target.value }
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        setEditingCast(null);
                                        onSaveCastCrewUpdates();
                                      }
                                    }}
                                    placeholder="ຊື່ຕົວລະຄອນເປັນພາສາລາວ"
                                    className="text-xs h-8"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col md:flex-row gap-2 flex-shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (isEditing) {
                                  onSaveCastCrewUpdates();
                                }
                                setEditingCast(isEditing ? null : key);
                              }}
                            >
                              {isEditing ? 'Done' : (
                                <>
                                  <span className="hidden md:inline">Edit Role</span>
                                  <span className="md:hidden">Role</span>
                                </>
                              )}
                            </Button>
                            <Link href={`/admin/people/${member.person.id}`} target="_blank" rel="noopener noreferrer">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                              >
                                <ExternalLink className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">View Person</span>
                                <span className="md:hidden">Person</span>
                              </Button>
                            </Link>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => onRemoveCast(member.person.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Crew */}
            {currentMovie.crew.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Crew ({currentMovie.crew.length})</h3>
                <div className="space-y-3">
                  {currentMovie.crew.map((member, index) => {
                    const key = `${member.person.id}-${member.department}`;
                    const isEditing = editingCrew === key;
                    const trans = crewTranslations[key] || { job_en: member.job.en || '', job_lo: member.job.lo || '' };
                    
                    return (
                      <div key={`crew-${member.person.id}-${index}`} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          {member.person.profile_path && (
                            <img
                              src={getProfileUrl(member.person.profile_path, 'small')!}
                              alt={getLocalizedText(member.person.name, 'en')}
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm mb-1">
                              {getLocalizedText(member.person.name, 'en')}
                            </p>
                            <p className="text-xs text-gray-500 mb-1">
                              {member.department}
                            </p>
                            {!isEditing ? (
                              <div className="space-y-1">
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">EN:</span> {trans.job_en || '(not set)'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">LO:</span> {trans.job_lo || '(not set)'}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2 mt-2">
                                <div>
                                  <Label className="text-xs">Job Title (English)</Label>
                                  <Input
                                    value={trans.job_en}
                                    onChange={(e) => {
                                      onCrewTranslationsChange({
                                        ...crewTranslations,
                                        [key]: { ...crewTranslations[key], job_en: e.target.value }
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        setEditingCrew(null);
                                        onSaveCastCrewUpdates();
                                      }
                                    }}
                                    placeholder="Job title in English"
                                    className="text-xs h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Job Title (Lao)</Label>
                                  <Input
                                    value={trans.job_lo}
                                    onChange={(e) => {
                                      onCrewTranslationsChange({
                                        ...crewTranslations,
                                        [key]: { ...crewTranslations[key], job_lo: e.target.value }
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        setEditingCrew(null);
                                        onSaveCastCrewUpdates();
                                      }
                                    }}
                                    placeholder="ຊື່ຕຳແໜ່ງເປັນພາສາລາວ"
                                    className="text-xs h-8"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col md:flex-row gap-2 flex-shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (isEditing) {
                                  onSaveCastCrewUpdates();
                                }
                                setEditingCrew(isEditing ? null : key);
                              }}
                            >
                              {isEditing ? 'Done' : (
                                <>
                                  <span className="hidden md:inline">Edit Role</span>
                                  <span className="md:hidden">Role</span>
                                </>
                              )}
                            </Button>
                            <Link href={`/admin/people/${member.person.id}`} target="_blank" rel="noopener noreferrer">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                              >
                                <ExternalLink className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">View Person</span>
                                <span className="md:hidden">Person</span>
                              </Button>
                            </Link>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => onRemoveCrew(member.person.id, member.department)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Production Companies Section */}
      <Card>
        <CardHeader 
          className="cursor-pointer select-none" 
          onClick={() => setShowAddProductionCompany(!showAddProductionCompany)}
        >
          <CardTitle className="flex items-center gap-2">
            {showAddProductionCompany ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            Production Companies ({currentMovie?.production_companies?.length || 0})
          </CardTitle>
        </CardHeader>
        {showAddProductionCompany && (
          <CardContent className="space-y-4">
            <div>
              <Label>Add Production Company</Label>
              <ProductionCompanySearch
                onSelect={handleAddProductionCompany}
                onCreateNew={handleCreateProductionCompany}
                placeholder="Search for a production company..."
                excludeIds={currentMovie?.production_companies?.map(c => c.id) || []}
              />
              {addingProductionCompany && (
                <p className="text-sm text-gray-500 mt-2">Adding...</p>
              )}
            </div>

            {/* Current Production Companies */}
            {currentMovie?.production_companies && currentMovie.production_companies.length > 0 && (
              <div className="space-y-2">
                <Label>Current Production Companies</Label>
                <div className="space-y-2">
                  {currentMovie.production_companies.map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {company.logo_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${company.logo_path}`}
                              alt={typeof company.name === 'string' ? company.name : (company.name?.en || 'Company')}
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <span className="text-gray-400 text-xs">🏢</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {typeof company.name === 'string' ? company.name : (company.name?.en || company.name?.lo || 'Unknown')}
                          </p>
                          {company.origin_country && (
                            <p className="text-xs text-gray-500">{company.origin_country}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onRemoveProductionCompany(company.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
