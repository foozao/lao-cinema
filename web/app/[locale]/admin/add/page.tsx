'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';
import {
  EnglishContentFields,
  LaoContentFields,
  MovieDetailsFields,
  VideoSourceFields,
  type MovieFormData,
} from '@/components/admin/movie-form-fields';

export default function AddMoviePage() {
  const router = useRouter();
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      
      alert('Movie created successfully!');
      router.push('/admin');
    } catch (error) {
      console.error('Failed to create movie:', error);
      alert('Failed to create movie. Please try again.');
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Add New Movie</h2>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="media">Video</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            <EnglishContentFields formData={formData} onChange={handleChange} />
            <LaoContentFields formData={formData} onChange={handleChange} />
            <MovieDetailsFields formData={formData} onChange={handleChange} />
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <VideoSourceFields formData={formData} onChange={handleChange} />
          </TabsContent>

          {/* Submit Button - Outside tabs so it's always visible */}
          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin')}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              Save Movie
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  );
}
