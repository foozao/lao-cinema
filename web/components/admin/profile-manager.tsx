'use client';

import { useState } from 'react';
import { ProfileImageUploader } from './profile-image-uploader';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { OptimizedImage } from '../optimized-image';
import { getProfileUrl, isTMDBImage } from '@/lib/images';

interface PersonImage {
  id: string;
  filePath: string;
  isPrimary: boolean;
}

interface ProfileManagerProps {
  images: PersonImage[];
  personId: string | number;
  tmdbProfilePath?: string | null;
  onImageAdded?: () => Promise<void>;
  onImageDeleted?: (imageId: string) => Promise<void>;
  onPrimaryChanged?: () => Promise<void>;
}

export function ProfileManager({ images, personId, tmdbProfilePath, onImageAdded, onImageDeleted, onPrimaryChanged }: ProfileManagerProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState(false);

  const handleUploadSuccess = async (url: string) => {
    // Store the full URL for uploaded images
    // (TMDB images will have paths like /abc123.jpg, uploaded images have full URLs)
    const { peopleAPI } = await import('@/lib/api/client');
    await peopleAPI.addImage(personId, {
      filePath: url, // Store full URL, not just pathname
      isPrimary: images.length === 0, // First image is primary
    });
    
    setShowUpload(false);
    await onImageAdded?.();
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this profile photo?')) {
      return;
    }
    
    await onImageDeleted?.(imageId);
  };

  const handleSetPrimary = async (imageId: string) => {
    setSettingPrimary(true);
    try {
      const { peopleAPI } = await import('@/lib/api/client');
      await peopleAPI.setPrimaryImage(personId, imageId);
      await onPrimaryChanged?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to set primary photo');
    } finally {
      setSettingPrimary(false);
    }
  };

  const primaryImage = images.find(img => img.isPrimary);
  const otherImages = images.filter(img => !img.isPrimary);
  const hasUploadedImages = images.length > 0;
  // Only show TMDB section if profile_path is actually a TMDB path (starts with /)
  const hasTmdbProfile = tmdbProfilePath && isTMDBImage(tmdbProfilePath);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Profile Photos</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Manage profile photos. TMDB photos are shown alongside uploaded photos. The first uploaded photo will be set as primary.
            </p>
          </div>
          {!showUpload && (
            <Button
              onClick={() => setShowUpload(true)}
              size="sm"
              className="gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Add Photo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showUpload && (
          <div className="mb-6">
            <ProfileImageUploader
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        )}

        {!hasUploadedImages && !hasTmdbProfile ? (
          <div className="text-center py-12 text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No profile photos yet.</p>
            <p className="text-sm mt-2">Upload a photo to get started.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* TMDB Photo */}
            {hasTmdbProfile && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">TMDB Profile Photo</h3>
                <div className="relative group inline-block">
                  <div className="relative w-48 h-48 rounded-full overflow-hidden bg-gray-100">
                    <OptimizedImage
                      src={getProfileUrl(tmdbProfilePath, 'large') || '/placeholder-profile.png'}
                      alt="TMDB Profile"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  From TMDB (cannot be deleted)
                </p>
              </div>
            )}

            {/* Primary Uploaded Photo */}
            {primaryImage && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Primary Uploaded Photo</h3>
                <div className="relative group inline-block">
                  <div className="relative w-48 h-48 rounded-full overflow-hidden bg-gray-100">
                    <OptimizedImage
                      src={getProfileUrl(primaryImage.filePath, 'large') || '/placeholder-profile.png'}
                      alt="Profile"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    onClick={() => handleDelete(primaryImage.id)}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                    title="Delete photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Other Uploaded Photos */}
            {otherImages.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Other Uploaded Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {otherImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <OptimizedImage
                          src={getProfileUrl(image.filePath, 'medium') || '/placeholder-profile.png'}
                          alt="Profile"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSetPrimary(image.id)}
                          disabled={settingPrimary}
                          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
                          title="Set as primary"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(image.id)}
                          className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                          title="Delete photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
