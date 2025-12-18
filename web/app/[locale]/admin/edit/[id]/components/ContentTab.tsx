'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { sanitizeSlug, getSlugValidationError } from '@/lib/slug-utils';
import type { ExternalPlatform, StreamingPlatform } from '@/lib/types';
import type { MovieFormData, AvailabilityStatus } from './types';

interface ContentTabProps {
  formData: MovieFormData;
  slugError: string | null;
  isAdmin: boolean;
  externalPlatforms: ExternalPlatform[];
  availabilityStatus: AvailabilityStatus;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSlugGenerate: () => void;
  onSelectChange: (name: string, value: string) => void;
  onExternalPlatformsChange: (platforms: ExternalPlatform[]) => void;
  onAvailabilityStatusChange: (status: AvailabilityStatus) => void;
}

export function ContentTab({
  formData,
  slugError,
  isAdmin,
  externalPlatforms,
  availabilityStatus,
  onFormChange,
  onSlugChange,
  onSlugGenerate,
  onSelectChange,
  onExternalPlatformsChange,
  onAvailabilityStatusChange,
}: ContentTabProps) {
  const handleAddPlatform = (platform: StreamingPlatform) => {
    if (!externalPlatforms.some(p => p.platform === platform)) {
      onExternalPlatformsChange([...externalPlatforms, { platform }]);
    }
  };

  const handleRemovePlatform = (index: number) => {
    onExternalPlatformsChange(externalPlatforms.filter((_, i) => i !== index));
  };

  const handlePlatformUrlChange = (index: number, url: string) => {
    const updated = [...externalPlatforms];
    updated[index] = { ...updated[index], url };
    onExternalPlatformsChange(updated);
  };
  return (
    <div className="space-y-6">
      {/* English Content */}
      <Card>
        <CardHeader>
          <CardTitle>English Content (Required)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title_en">Title (English) *</Label>
            <Input
              id="title_en"
              name="title_en"
              value={formData.title_en}
              onChange={onFormChange}
              required
              placeholder="Enter movie title in English"
            />
          </div>

          <div>
            <Label htmlFor="overview_en">Overview (English) *</Label>
            <Textarea
              id="overview_en"
              name="overview_en"
              value={formData.overview_en}
              onChange={onFormChange}
              required
              rows={4}
              placeholder="Enter movie description in English"
            />
          </div>

          <div>
            <Label htmlFor="tagline_en">Tagline (English)</Label>
            <Input
              id="tagline_en"
              name="tagline_en"
              value={formData.tagline_en}
              onChange={onFormChange}
              placeholder="A catchy tagline for the movie"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lao Content */}
      <Card>
        <CardHeader>
          <CardTitle>Lao Content (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title_lo">Title (Lao)</Label>
            <Input
              id="title_lo"
              name="title_lo"
              value={formData.title_lo}
              onChange={onFormChange}
              placeholder="ປ້ອນຊື່ຮູບເງົາເປັນພາສາລາວ"
            />
          </div>

          <div>
            <Label htmlFor="overview_lo">Overview (Lao)</Label>
            <Textarea
              id="overview_lo"
              name="overview_lo"
              value={formData.overview_lo}
              onChange={onFormChange}
              rows={4}
              placeholder="ປ້ອນຄໍາອະທິບາຍຮູບເງົາເປັນພາສາລາວ"
            />
          </div>

          <div>
            <Label htmlFor="tagline_lo">Tagline (Lao)</Label>
            <Input
              id="tagline_lo"
              name="tagline_lo"
              value={formData.tagline_lo}
              onChange={onFormChange}
              placeholder="ປ້ອນຄຳຂວັນຮູບເງົາເປັນພາສາລາວ"
            />
          </div>
        </CardContent>
      </Card>

      {/* Movie Details */}
      <Card>
        <CardHeader>
          <CardTitle>Movie Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="slug">Vanity URL Slug</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSlugGenerate}
                className="text-xs"
              >
                Generate from title
              </Button>
            </div>
            <Input
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={onSlugChange}
              placeholder="the-signal"
              className={slugError ? 'border-red-500' : ''}
            />
            {slugError ? (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {slugError}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Custom URL path for this movie (e.g., &quot;the-signal&quot; → /movies/the-signal). Leave empty to use ID.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="original_title">Original Title</Label>
              <Input
                id="original_title"
                name="original_title"
                value={formData.original_title}
                onChange={onFormChange}
                placeholder="Original title (if different)"
              />
            </div>

            <div>
              <Label htmlFor="original_language">Original Language</Label>
              <select
                id="original_language"
                name="original_language"
                value={formData.original_language}
                onChange={(e) => onSelectChange('original_language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="lo">Lao</option>
                <option value="en">English</option>
                <option value="th">Thai</option>
                <option value="vi">Vietnamese</option>
                <option value="km">Khmer</option>
              </select>
            </div>

            <div>
              <Label htmlFor="type">Movie Type</Label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={(e) => onSelectChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="feature">Feature Film</option>
                <option value="short">Short Film</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Short films can be added to curated packs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="release_date">Release Date *</Label>
              <Input
                id="release_date"
                name="release_date"
                type="date"
                value={formData.release_date}
                onChange={onFormChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="runtime">Runtime (minutes) *</Label>
              <Input
                id="runtime"
                name="runtime"
                type="number"
                value={formData.runtime}
                onChange={onFormChange}
                required
                placeholder="120"
              />
            </div>

            <div>
              <Label htmlFor="imdb_id">IMDB ID</Label>
              <Input
                id="imdb_id"
                name="imdb_id"
                value={formData.imdb_id}
                onChange={onFormChange}
                placeholder="tt1234567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability Status - Admin Only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Availability Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="availability_status">Status Override (Optional)</Label>
              <select
                id="availability_status"
                value={availabilityStatus}
                onChange={(e) => onAvailabilityStatusChange(e.target.value as AvailabilityStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">Auto (based on video sources and external platforms)</option>
                <option value="available">Available - Movie is on our platform</option>
                <option value="external">External - Available on external platforms only</option>
                <option value="unavailable">Unavailable - Not available anywhere</option>
                <option value="coming_soon">Coming Soon - Will be available soon</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                <strong>Auto behavior:</strong>
                <br />• If video sources exist → Available (rentable on our site)
                <br />• If only external platforms exist → External (not rentable, links only)
                <br />• Otherwise → Unavailable
                <br /><br />
                Note: External platforms are always shown alongside rental options when both exist.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* External Platforms */}
      <Card>
        <CardHeader>
          <CardTitle>External Availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Add external platforms where this film is also available. These will be shown alongside rental options if the film is available on our site, or as the primary viewing option if it&apos;s external-only.
          </p>
          
          {/* Current platforms */}
          {externalPlatforms.length > 0 && (
            <div className="space-y-2">
              {externalPlatforms.map((platform, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium capitalize flex-1">{platform.platform}</span>
                  <Input
                    value={platform.url || ''}
                    onChange={(e) => handlePlatformUrlChange(index, e.target.value)}
                    placeholder="URL (optional)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePlatform(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add platform */}
          <div className="flex items-center gap-3">
            <select
              id="add-platform"
              className="px-3 py-2 border border-gray-300 rounded-md"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddPlatform(e.target.value as StreamingPlatform);
                  e.target.value = '';
                }
              }}
            >
              <option value="">Add platform...</option>
              <option value="netflix" disabled={externalPlatforms.some(p => p.platform === 'netflix')}>Netflix</option>
              <option value="prime" disabled={externalPlatforms.some(p => p.platform === 'prime')}>Amazon Prime Video</option>
              <option value="disney" disabled={externalPlatforms.some(p => p.platform === 'disney')}>Disney+</option>
              <option value="hbo" disabled={externalPlatforms.some(p => p.platform === 'hbo')}>HBO Max</option>
              <option value="apple" disabled={externalPlatforms.some(p => p.platform === 'apple')}>Apple TV+</option>
              <option value="hulu" disabled={externalPlatforms.some(p => p.platform === 'hulu')}>Hulu</option>
              <option value="other" disabled={externalPlatforms.some(p => p.platform === 'other')}>Other</option>
            </select>
          </div>
          
          {externalPlatforms.length > 0 && (
            <p className="text-xs text-blue-600">
              ℹ️ External platforms will be shown as "Also available on" if the film is also rentable on our site.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
