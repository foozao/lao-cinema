'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Save, CheckCircle } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';
import {
  LocalizedContentFields,
  MovieDetailsFields,
  VideoSourceFields,
  SUPPORTED_LANGUAGES,
  type MovieFormData,
} from '@/components/admin/movie-form-fields';

export default function AddMoviePage() {
  const router = useRouter();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [formData, setFormData] = useState<MovieFormData>({
    // English fields
    title_en: '',
    overview_en: '',
    tagline_en: '',
    
    // Lao fields
    title_lo: '',
    overview_lo: '',
    tagline_lo: '',
    
    // Common fields
    original_title: '',
    original_language: 'lo',
    release_date: '',
    runtime: '',
    imdb_id: '',
    
    // Video fields
    video_url: '',
    video_quality: 'original',
    video_format: 'mp4',
    video_aspect_ratio: '16:9',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error when user starts typing
    if (showValidationError) {
      setShowValidationError(false);
    }
  };

  // Helper to check if content is valid (title + overview in at least one language)
  const hasValidContent = () => {
    return SUPPORTED_LANGUAGES.some(lang => {
      const title = formData[`title_${lang.code}` as keyof MovieFormData] as string;
      const overview = formData[`overview_${lang.code}` as keyof MovieFormData] as string;
      return Boolean(title?.trim() && overview?.trim());
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one language has title + overview
    if (!hasValidContent()) {
      setShowValidationError(true);
      return;
    }
    
    try {
      // Normalize Lao text to prevent encoding issues
      const normalizeLao = (text: string) => text.normalize('NFC');
      
      // Prepare the movie data
      const movieData = {
        title: {
          en: formData.title_en,
          lo: formData.title_lo ? normalizeLao(formData.title_lo) : undefined,
        },
        overview: {
          en: formData.overview_en,
          lo: formData.overview_lo ? normalizeLao(formData.overview_lo) : undefined,
        },
        tagline: formData.tagline_en ? {
          en: formData.tagline_en,
          lo: formData.tagline_lo ? normalizeLao(formData.tagline_lo) : undefined,
        } : undefined,
        release_date: formData.release_date,
        runtime: formData.runtime ? parseInt(formData.runtime) : undefined,
        video_sources: formData.video_url ? [{
          id: '1',
          url: formData.video_url,
          format: formData.video_format as 'hls' | 'mp4',
          quality: formData.video_quality as any,
        }] : [],
        adult: false,
        genres: [],
        cast: [],
        crew: [],
      };

      await movieAPI.create(movieData);
      
      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to create movie:', error);
      alert('Failed to create movie. Please try again.');
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    router.push('/admin');
  };

  return (
    <div>
      <Tabs defaultValue="content" className="space-y-6">
        {/* Sticky Header */}
        <div className="sticky top-16 z-[5] bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-2 pb-4 border-b border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add New Movie</h2>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin')}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" form="add-movie-form" className="cursor-pointer">
                <Save className="w-4 h-4 mr-2" />
                Save Movie
              </Button>
            </div>
          </div>

          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content" className="cursor-pointer">Content</TabsTrigger>
            <TabsTrigger value="media" className="cursor-pointer">Video</TabsTrigger>
          </TabsList>
        </div>

        <form id="add-movie-form" onSubmit={handleSubmit}>

          <TabsContent value="content" className="space-y-6">
            <LocalizedContentFields 
              formData={formData} 
              onChange={handleChange}
              showValidationError={showValidationError}
            />
            <MovieDetailsFields formData={formData} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <VideoSourceFields formData={formData} onChange={handleChange} />
          </TabsContent>
        </form>
      </Tabs>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle className="text-xl">Movie Created Successfully!</DialogTitle>
            </div>
            <DialogDescription>
              Your new movie has been added to the database.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={handleCloseSuccessModal} className="w-full">
              Back to Movies
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
