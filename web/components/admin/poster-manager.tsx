'use client';

import { useState } from 'react';
import { MovieImage } from '@/lib/types';
import { PosterGallery } from '../poster-gallery';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Image as ImageIcon, Film, Tag, Save, AlertCircle, RefreshCw } from 'lucide-react';

interface PosterManagerProps {
  images: MovieImage[];
  movieId: string;
  onPrimaryChange?: (imageId: string, type: 'poster' | 'backdrop' | 'logo') => Promise<void>;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

export function PosterManager({ images, movieId, onPrimaryChange, onRefresh, refreshing }: PosterManagerProps) {
  const [activeTab, setActiveTab] = useState<'poster' | 'backdrop' | 'logo'>('poster');
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);
  const [selectedBackdrop, setSelectedBackdrop] = useState<string | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Count images by type
  const posterCount = images.filter((img) => img.type === 'poster').length;
  const backdropCount = images.filter((img) => img.type === 'backdrop').length;
  const logoCount = images.filter((img) => img.type === 'logo').length;

  const handleSavePrimary = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      let imageId: string | null = null;
      let type: 'poster' | 'backdrop' | 'logo' = activeTab;

      if (activeTab === 'poster' && selectedPoster) {
        imageId = selectedPoster;
      } else if (activeTab === 'backdrop' && selectedBackdrop) {
        imageId = selectedBackdrop;
      } else if (activeTab === 'logo' && selectedLogo) {
        imageId = selectedLogo;
      }

      if (!imageId) {
        setSaveError('Please select an image first');
        return;
      }

      await onPrimaryChange?.(imageId, type);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save primary image');
    } finally {
      setSaving(false);
    }
  };

  if (!images || images.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Poster Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No images available for this movie.</p>
            <p className="text-sm mt-2">Re-sync from TMDB to fetch all available posters, backdrops, and logos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Poster Management</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Select the primary poster, backdrop, or logo for this movie. The primary image will be displayed on the website.
            </p>
          </div>
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="poster" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Posters ({posterCount})
            </TabsTrigger>
            <TabsTrigger value="backdrop" className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              Backdrops ({backdropCount})
            </TabsTrigger>
            <TabsTrigger value="logo" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Logos ({logoCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="poster" className="mt-6">
            <PosterGallery
              images={images}
              type="poster"
              allowSelection
              onSelectPrimary={setSelectedPoster}
              columns={4}
            />
          </TabsContent>

          <TabsContent value="backdrop" className="mt-6">
            <PosterGallery
              images={images}
              type="backdrop"
              allowSelection
              onSelectPrimary={setSelectedBackdrop}
              columns={3}
            />
          </TabsContent>

          <TabsContent value="logo" className="mt-6">
            <PosterGallery
              images={images}
              type="logo"
              allowSelection
              onSelectPrimary={setSelectedLogo}
              columns={5}
            />
          </TabsContent>
        </Tabs>

        {/* Save Button and Status */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex-1">
            {saveError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                ✓ Primary image saved successfully
              </div>
            )}
          </div>
          
          <Button
            onClick={handleSavePrimary}
            disabled={saving || !selectedPoster && !selectedBackdrop && !selectedLogo}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Primary Image'}
          </Button>
        </div>

        {/* Language Info */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-medium mb-2">Language-Specific Posters</h4>
          <p className="text-sm text-gray-600">
            Some posters have language indicators (EN, LO, etc.). These are language-specific versions.
            The system can automatically select the appropriate poster based on user language preference.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
