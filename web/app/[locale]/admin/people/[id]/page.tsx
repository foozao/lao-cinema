'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Save, CheckCircle, Merge, Trash2, Plus, X } from 'lucide-react';
import { peopleAPI } from '@/lib/api/client';
import { getProfileUrl } from '@/lib/images';
import { getLocalizedText } from '@/lib/i18n';
import { MergePeopleDialog } from '@/components/admin/merge-people-dialog';
import { ProfileManager } from '@/components/admin/profile-manager';

export default function EditPersonPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations('admin');
  const personId = parseInt(params.id as string);

  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [nameEn, setNameEn] = useState('');
  const [nameLo, setNameLo] = useState('');
  const [nicknamesEn, setNicknamesEn] = useState<string[]>([]);
  const [nicknamesLo, setNicknamesLo] = useState<string[]>([]);
  const [biographyEn, setBiographyEn] = useState('');
  const [biographyLo, setBiographyLo] = useState('');
  const [birthday, setBirthday] = useState('');
  const [deathday, setDeathday] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [knownForDepartment, setKnownForDepartment] = useState('');
  const [homepage, setHomepage] = useState('');

  // Original values for change detection
  const [originalValues, setOriginalValues] = useState({
    nameEn: '',
    nameLo: '',
    nicknamesEn: [] as string[],
    nicknamesLo: [] as string[],
    biographyEn: '',
    biographyLo: '',
    birthday: '',
    deathday: '',
    placeOfBirth: '',
    knownForDepartment: '',
    homepage: '',
  });

  useEffect(() => {
    const loadPerson = async () => {
      try {
        const personData = await peopleAPI.getById(personId);
        setPerson(personData);

        // Populate form fields
        const initialValues = {
          nameEn: personData.name?.en || '',
          nameLo: personData.name?.lo || '',
          nicknamesEn: personData.nicknames?.en || [],
          nicknamesLo: personData.nicknames?.lo || [],
          biographyEn: personData.biography?.en || '',
          biographyLo: personData.biography?.lo || '',
          birthday: personData.birthday || '',
          deathday: personData.deathday || '',
          placeOfBirth: personData.place_of_birth || '',
          knownForDepartment: personData.known_for_department || '',
          homepage: personData.homepage || '',
        };
        
        setNameEn(initialValues.nameEn);
        setNameLo(initialValues.nameLo);
        setNicknamesEn(initialValues.nicknamesEn);
        setNicknamesLo(initialValues.nicknamesLo);
        setBiographyEn(initialValues.biographyEn);
        setBiographyLo(initialValues.biographyLo);
        setBirthday(initialValues.birthday);
        setDeathday(initialValues.deathday);
        setPlaceOfBirth(initialValues.placeOfBirth);
        setKnownForDepartment(initialValues.knownForDepartment);
        setHomepage(initialValues.homepage);
        
        // Store original values
        setOriginalValues(initialValues);
        setHasChanges(false);
      } catch (error) {
        console.error('Failed to load person:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadPerson();
  }, [personId]);

  // Detect changes by comparing current values to originals
  useEffect(() => {
    const currentValues = {
      nameEn,
      nameLo,
      nicknamesEn,
      nicknamesLo,
      biographyEn,
      biographyLo,
      birthday,
      deathday,
      placeOfBirth,
      knownForDepartment,
      homepage,
    };

    const changed = Object.keys(currentValues).some(
      (key) => currentValues[key as keyof typeof currentValues] !== originalValues[key as keyof typeof originalValues]
    );

    setHasChanges(changed);
  }, [nameEn, nameLo, nicknamesEn, nicknamesLo, biographyEn, biographyLo, birthday, deathday, placeOfBirth, knownForDepartment, homepage, originalValues]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedData = {
        name: {
          en: nameEn,
          lo: nameLo || undefined,
        },
        nicknames: {
          en: nicknamesEn.length > 0 ? nicknamesEn : undefined,
          lo: nicknamesLo.length > 0 ? nicknamesLo : undefined,
        },
        biography: {
          en: biographyEn || undefined,
          lo: biographyLo || undefined,
        },
        birthday: birthday || undefined,
        deathday: deathday || undefined,
        place_of_birth: placeOfBirth || undefined,
        known_for_department: knownForDepartment || undefined,
        homepage: homepage || undefined,
      };

      const updatedPerson = await peopleAPI.update(personId, updatedData);
      setPerson(updatedPerson);
      
      // Reset hasChanges after successful save
      setHasChanges(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to save person:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  if (error || !person) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => router.push('/admin/people')}>
            Cancel
          </Button>
        </div>
        <div className="text-center py-16">
          <p className="text-xl text-gray-500">Person not found</p>
        </div>
      </div>
    );
  }

  const profileUrl = getProfileUrl(person.profile_path, 'large');

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
  };

  const handleBackToList = () => {
    router.push('/admin/people');
  };

  const handleMergeComplete = () => {
    // Reload or redirect after merge completes
    router.push('/admin/people');
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await peopleAPI.delete(personId);
      // Redirect to people list after successful deletion
      router.push('/admin/people');
    } catch (error) {
      console.error('Failed to delete person:', error);
      alert('Failed to delete person. Please try again.');
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div>
      {/* Sticky Header */}
      <div className="sticky top-16 z-[5] bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-2 pb-4 border-b border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Editing: <span className="text-gray-700">{nameEn || 'Person'}</span>
          </h2>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="cursor-pointer gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete this person"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMergeDialog(true)}
              className="cursor-pointer gap-2"
              title="Merge this person with another"
            >
              <Merge className="w-4 h-4" />
              <span className="hidden sm:inline">Merge</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/people')}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <span title={!hasChanges ? 'No changes to save' : ''}>
              <Button 
                onClick={handleSave} 
                disabled={saving || !hasChanges}
                className={`gap-2 ${!hasChanges && !saving ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl">
        {/* Profile Photos */}
        <div className="mb-6">
          <ProfileManager
            images={person.images || []}
            personId={personId}
            tmdbProfilePath={person.profile_path}
            onImageAdded={async () => {
              const personData = await peopleAPI.getById(personId);
              setPerson(personData);
            }}
            onImageDeleted={async (imageId) => {
              await peopleAPI.deleteImage(personId, imageId);
              const personData = await peopleAPI.getById(personId);
              setPerson(personData);
            }}
            onPrimaryChanged={async () => {
              const personData = await peopleAPI.getById(personId);
              setPerson(personData);
            }}
          />
        </div>

        {/* Name Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Name</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name-en">English Name *</Label>
              <Input
                id="name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Enter English name"
              />
            </div>
            <div>
              <Label htmlFor="name-lo">Lao Name (ລາວ)</Label>
              <Input
                id="name-lo"
                value={nameLo}
                onChange={(e) => setNameLo(e.target.value)}
                placeholder="ປ້ອນຊື່ພາສາລາວ"
              />
            </div>

            {/* English Nicknames */}
            <div>
              <Label>English Nicknames</Label>
              <div className="space-y-2">
                {nicknamesEn.map((nickname, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={nickname}
                      onChange={(e) => {
                        const updated = [...nicknamesEn];
                        updated[index] = e.target.value;
                        setNicknamesEn(updated);
                      }}
                      placeholder="Enter nickname"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setNicknamesEn(nicknamesEn.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNicknamesEn([...nicknamesEn, ''])}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add English Nickname
                </Button>
              </div>
            </div>

            {/* Lao Nicknames */}
            <div>
              <Label>Lao Nicknames (ຊື່ຫຼິ້ນ)</Label>
              <div className="space-y-2">
                {nicknamesLo.map((nickname, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={nickname}
                      onChange={(e) => {
                        const updated = [...nicknamesLo];
                        updated[index] = e.target.value;
                        setNicknamesLo(updated);
                      }}
                      placeholder="ປ້ອນຊື່ຫຼິ້ນ"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setNicknamesLo(nicknamesLo.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNicknamesLo([...nicknamesLo, ''])}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Lao Nickname
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Biography Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Biography</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bio-en">English Biography</Label>
              <Textarea
                id="bio-en"
                value={biographyEn}
                onChange={(e) => setBiographyEn(e.target.value)}
                className="min-h-32"
                placeholder="Enter English biography"
              />
            </div>
            <div>
              <Label htmlFor="bio-lo">Lao Biography (ລາວ)</Label>
              <Textarea
                id="bio-lo"
                value={biographyLo}
                onChange={(e) => setBiographyLo(e.target.value)}
                className="min-h-32"
                placeholder="ປ້ອນຊີວະປະຫວັດພາສາລາວ"
              />
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="birthday">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="deathday">Deathday (if applicable)</Label>
                <Input
                  id="deathday"
                  type="date"
                  value={deathday}
                  onChange={(e) => setDeathday(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="place-of-birth">Place of Birth</Label>
              <Input
                id="place-of-birth"
                value={placeOfBirth}
                onChange={(e) => setPlaceOfBirth(e.target.value)}
                placeholder="e.g., Vientiane, Laos"
              />
            </div>
            <div>
              <Label htmlFor="known-for">Known For Department</Label>
              <Input
                id="known-for"
                value={knownForDepartment}
                onChange={(e) => setKnownForDepartment(e.target.value)}
                placeholder="e.g., Acting, Directing"
              />
            </div>
            <div>
              <Label htmlFor="homepage">Homepage URL</Label>
              <Input
                id="homepage"
                type="url"
                value={homepage}
                onChange={(e) => setHomepage(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Filmography */}
        {(person.cast?.length > 0 || person.crew?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Filmography</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Acting Credits */}
                {person.cast?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Acting ({person.cast.length} credit{person.cast.length !== 1 ? 's' : ''})
                    </h3>
                    <div className="space-y-2">
                      {person.cast
                        .sort((a: any, b: any) => {
                          // Sort by release date (newest first)
                          const dateA = a.movie.release_date || '';
                          const dateB = b.movie.release_date || '';
                          return dateB.localeCompare(dateA);
                        })
                        .map((credit: any) => {
                          const movieTitle = getLocalizedText(credit.movie.title, locale);
                          const character = getLocalizedText(credit.character, locale);
                          const year = credit.movie.release_date ? new Date(credit.movie.release_date).getFullYear() : '';
                          
                          return (
                            <div key={credit.movie.id} className="flex items-start gap-3 text-sm">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {movieTitle}
                                  {year && <span className="text-gray-500 ml-2">({year})</span>}
                                </div>
                                {character && (
                                  <div className="text-gray-600">as {character}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Crew Credits */}
                {person.crew?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Crew ({person.crew.length} credit{person.crew.length !== 1 ? 's' : ''})
                    </h3>
                    <div className="space-y-2">
                      {person.crew
                        .sort((a: any, b: any) => {
                          // Sort by release date (newest first)
                          const dateA = a.movie.release_date || '';
                          const dateB = b.movie.release_date || '';
                          return dateB.localeCompare(dateA);
                        })
                        .map((credit: any, index: number) => {
                          const movieTitle = getLocalizedText(credit.movie.title, locale);
                          const job = getLocalizedText(credit.job, locale);
                          const year = credit.movie.release_date ? new Date(credit.movie.release_date).getFullYear() : '';
                          
                          return (
                            <div key={`${credit.movie.id}-${credit.department}-${index}`} className="flex items-start gap-3 text-sm">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {movieTitle}
                                  {year && <span className="text-gray-500 ml-2">({year})</span>}
                                </div>
                                <div className="text-gray-600">
                                  {job}
                                  {credit.department && <span className="text-gray-400 ml-2">• {credit.department}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle className="text-xl">Person Updated Successfully!</DialogTitle>
            </div>
            <DialogDescription>
              Your changes have been saved. The person data has been refreshed with the latest updates.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={handleCloseSuccessModal} variant="outline" className="w-full">
              Keep Editing
            </Button>
            <Button onClick={handleBackToList} className="w-full">
              Back to People
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Delete Person?</DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <strong>{nameEn}</strong>?
              <br /><br />
              This will permanently remove:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Person profile and biography</li>
                <li>All cast credits ({person?.cast?.length || 0} movies)</li>
                <li>All crew credits ({person?.crew?.length || 0} movies)</li>
              </ul>
              <br />
              <strong className="text-red-600">This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button 
              onClick={() => setShowDeleteDialog(false)} 
              variant="outline" 
              className="w-full"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete} 
              variant="destructive" 
              className="w-full gap-2"
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete Person'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <MergePeopleDialog
        open={showMergeDialog}
        onOpenChange={setShowMergeDialog}
        sourcePerson={person}
        onMergeComplete={handleMergeComplete}
      />
    </div>
  );
}
