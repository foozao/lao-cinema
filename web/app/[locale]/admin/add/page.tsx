'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { movieAPI } from '@/lib/api/client';

export default function AddMoviePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
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
    vote_average: '',
    status: 'Released',
    budget: '',
    revenue: '',
    homepage: '',
    imdb_id: '',
    poster_path: '',
    backdrop_path: '',
    video_url: '',
    video_quality: 'original',
    video_format: 'mp4',
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
      // Prepare the movie data
      const movieData = {
        title: {
          en: formData.title_en,
          lo: formData.title_lo || undefined,
        },
        overview: {
          en: formData.overview_en,
          lo: formData.overview_lo || undefined,
        },
        tagline: formData.tagline_en ? {
          en: formData.tagline_en,
          lo: formData.tagline_lo || undefined,
        } : undefined,
        release_date: formData.release_date,
        runtime: formData.runtime ? parseInt(formData.runtime) : undefined,
        poster_path: formData.poster_path || undefined,
        backdrop_path: formData.backdrop_path || undefined,
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                  placeholder="ປ້ອນຊື່ຮູບເງົາເປັນພາສາລາວ"
                />
              </div>

              <div>
                <Label htmlFor="overview_lo">Overview (Lao)</Label>
                <Textarea
                  id="overview_lo"
                  name="overview_lo"
                  value={formData.overview_lo}
                  onChange={handleChange}
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
                  onChange={handleChange}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="original_title">Original Title</Label>
                  <Input
                    id="original_title"
                    name="original_title"
                    value={formData.original_title}
                    onChange={handleChange}
                    placeholder="Original title (if different)"
                  />
                </div>

                <div>
                  <Label htmlFor="original_language">Original Language</Label>
                  <select
                    id="original_language"
                    name="original_language"
                    value={formData.original_language}
                    onChange={(e) => handleChange(e as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="lo">Lao</option>
                    <option value="en">English</option>
                    <option value="th">Thai</option>
                    <option value="vi">Vietnamese</option>
                    <option value="km">Khmer</option>
                  </select>
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
                    onChange={handleChange}
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
                    onChange={handleChange}
                    required
                    placeholder="120"
                  />
                </div>

                <div>
                  <Label htmlFor="vote_average">Rating (0-10)</Label>
                  <Input
                    id="vote_average"
                    name="vote_average"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.vote_average}
                    onChange={handleChange}
                    placeholder="8.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={(e) => handleChange(e as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Released">Released</option>
                    <option value="Post Production">Post Production</option>
                    <option value="In Production">In Production</option>
                    <option value="Planned">Planned</option>
                    <option value="Rumored">Rumored</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="imdb_id">IMDB ID</Label>
                  <Input
                    id="imdb_id"
                    name="imdb_id"
                    value={formData.imdb_id}
                    onChange={handleChange}
                    placeholder="tt1234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget">Budget (USD)</Label>
                  <Input
                    id="budget"
                    name="budget"
                    type="number"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="500000"
                  />
                </div>

                <div>
                  <Label htmlFor="revenue">Revenue (USD)</Label>
                  <Input
                    id="revenue"
                    name="revenue"
                    type="number"
                    value={formData.revenue}
                    onChange={handleChange}
                    placeholder="1200000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="homepage">Homepage URL</Label>
                <Input
                  id="homepage"
                  name="homepage"
                  type="url"
                  value={formData.homepage}
                  onChange={handleChange}
                  placeholder="https://example.com/movie"
                />
              </div>
            </CardContent>
          </Card>

          {/* Media Files */}
          <Card>
            <CardHeader>
              <CardTitle>Media Files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="poster_path">Poster Image Path</Label>
                <Input
                  id="poster_path"
                  name="poster_path"
                  value={formData.poster_path}
                  onChange={handleChange}
                  placeholder="/posters/movie-poster.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload image to /public/posters/ and enter the path here
                </p>
              </div>

              <div>
                <Label htmlFor="backdrop_path">Backdrop Image Path</Label>
                <Input
                  id="backdrop_path"
                  name="backdrop_path"
                  value={formData.backdrop_path}
                  onChange={handleChange}
                  placeholder="/backdrops/movie-backdrop.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload image to /public/backdrops/ and enter the path here
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Video Source */}
          <Card>
            <CardHeader>
              <CardTitle>Video Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="video_url">Video URL</Label>
                <Input
                  id="video_url"
                  name="video_url"
                  value={formData.video_url}
                  onChange={handleChange}
                  placeholder="/videos/movie.mp4 or https://stream.example.com/video.m3u8"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For local files: upload to /public/videos/ and enter path. For HLS: enter full URL
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="video_format">Format</Label>
                  <select
                    id="video_format"
                    name="video_format"
                    value={formData.video_format}
                    onChange={(e) => handleChange(e as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="mp4">MP4</option>
                    <option value="hls">HLS (.m3u8)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="video_quality">Quality</Label>
                  <select
                    id="video_quality"
                    name="video_quality"
                    value={formData.video_quality}
                    onChange={(e) => handleChange(e as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="original">Original</option>
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
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
        </div>
      </form>
    </div>
  );
}
