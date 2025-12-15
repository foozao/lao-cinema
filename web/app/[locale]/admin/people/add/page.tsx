'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { peopleAPI } from '@/lib/api/client';

export default function AddPersonPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Form state
  const [nameEn, setNameEn] = useState('');
  const [nameLo, setNameLo] = useState('');
  const [biographyEn, setBiographyEn] = useState('');
  const [biographyLo, setBiographyLo] = useState('');
  const [birthday, setBirthday] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [knownForDepartment, setKnownForDepartment] = useState('Acting');

  const handleSave = async () => {
    if (!nameEn.trim()) {
      alert('English name is required');
      return;
    }

    setSaving(true);
    try {
      const personData = {
        name: {
          en: nameEn.trim(),
          lo: nameLo.trim() || undefined,
        },
        biography: {
          en: biographyEn.trim() || undefined,
          lo: biographyLo.trim() || undefined,
        },
        birthday: birthday || undefined,
        place_of_birth: placeOfBirth.trim() || undefined,
        known_for_department: knownForDepartment || undefined,
      };

      const newPerson = await peopleAPI.create(personData);
      alert('Person created successfully!');
      router.push(`/admin/people/${newPerson.id}`);
    } catch (error) {
      console.error('Failed to create person:', error);
      alert('Failed to create person. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h2 className="text-3xl font-bold text-gray-900">Add Person</h2>
        <Button onClick={handleSave} disabled={saving || !nameEn.trim()} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Creating...' : 'Create Person'}
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl">
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
                autoFocus
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

        {/* Department */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Primary Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="known-for">Known For Department</Label>
              <select
                id="known-for"
                value={knownForDepartment}
                onChange={(e) => setKnownForDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="Acting">Acting</option>
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
          </CardContent>
        </Card>

        {/* Biography Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Biography (Optional)</CardTitle>
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

        {/* Note about profile photos */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You can add profile photos after creating the person. Save this person first, then you'll be able to upload and manage profile photos on the edit page.
            </p>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information (Optional)</CardTitle>
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
                <Label htmlFor="place-of-birth">Place of Birth</Label>
                <Input
                  id="place-of-birth"
                  value={placeOfBirth}
                  onChange={(e) => setPlaceOfBirth(e.target.value)}
                  placeholder="e.g., Vientiane, Laos"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
