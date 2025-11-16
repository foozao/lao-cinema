'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { peopleAPI } from '@/lib/api/client';
import { getProfileUrl } from '@/lib/images';

export default function EditPersonPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale() as 'en' | 'lo';
  const personId = parseInt(params.id as string);

  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  // Form state
  const [nameEn, setNameEn] = useState('');
  const [nameLo, setNameLo] = useState('');
  const [biographyEn, setBiographyEn] = useState('');
  const [biographyLo, setBiographyLo] = useState('');
  const [birthday, setBirthday] = useState('');
  const [deathday, setDeathday] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [knownForDepartment, setKnownForDepartment] = useState('');
  const [homepage, setHomepage] = useState('');

  useEffect(() => {
    const loadPerson = async () => {
      try {
        const personData = await peopleAPI.getById(personId);
        setPerson(personData);

        // Populate form fields
        setNameEn(personData.name?.en || '');
        setNameLo(personData.name?.lo || '');
        setBiographyEn(personData.biography?.en || '');
        setBiographyLo(personData.biography?.lo || '');
        setBirthday(personData.birthday || '');
        setDeathday(personData.deathday || '');
        setPlaceOfBirth(personData.place_of_birth || '');
        setKnownForDepartment(personData.known_for_department || '');
        setHomepage(personData.homepage || '');
      } catch (error) {
        console.error('Failed to load person:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadPerson();
  }, [personId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedData = {
        name: {
          en: nameEn,
          lo: nameLo || undefined,
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
      alert('Person updated successfully!');
    } catch (error) {
      console.error('Failed to save person:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
        <div className="text-center py-16">
          <p className="text-xl text-gray-500">Person not found</p>
        </div>
      </div>
    );
  }

  const profileUrl = getProfileUrl(person.profile_path, 'large');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h2 className="text-3xl font-bold text-gray-900">Edit Person</h2>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl">
        {/* Profile Image */}
        {profileUrl && (
          <div className="mb-8 flex justify-center">
            <img
              src={profileUrl}
              alt={nameEn}
              className="w-48 h-48 rounded-full object-cover"
            />
          </div>
        )}

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

        {/* Filmography Summary */}
        {(person.cast?.length > 0 || person.crew?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Filmography</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-gray-600">
                {person.cast?.length > 0 && (
                  <p>
                    <span className="font-semibold text-gray-900">{person.cast.length}</span> acting credit{person.cast.length !== 1 ? 's' : ''}
                  </p>
                )}
                {person.crew?.length > 0 && (
                  <p>
                    <span className="font-semibold text-gray-900">{person.crew.length}</span> crew credit{person.crew.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
