'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface MovieFormData {
  // English fields
  title_en: string;
  overview_en: string;
  tagline_en: string;
  // Lao fields
  title_lo: string;
  overview_lo: string;
  tagline_lo: string;
  // Common fields
  original_title: string;
  original_language: string;
  release_date: string;
  runtime: string;
  imdb_id: string;
  // Video fields
  video_url: string;
  video_quality: string;
  video_format: string;
  video_aspect_ratio?: string;
}

interface MovieFormFieldsProps {
  formData: MovieFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

// English Content Section
export function EnglishContentFields({ formData, onChange }: MovieFormFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>English Content (Required)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[140px_1fr] items-center gap-4">
          <Label htmlFor="title_en">Title (English) *</Label>
          <Input
            id="title_en"
            name="title_en"
            value={formData.title_en}
            onChange={onChange}
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
            onChange={onChange}
            required
            rows={4}
            placeholder="Enter movie description in English"
          />
        </div>

        <div className="grid grid-cols-[140px_1fr] items-center gap-4">
          <Label htmlFor="tagline_en">Tagline (English)</Label>
          <Input
            id="tagline_en"
            name="tagline_en"
            value={formData.tagline_en}
            onChange={onChange}
            placeholder="A catchy tagline for the movie"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Lao Content Section
export function LaoContentFields({ formData, onChange }: MovieFormFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lao Content (Optional)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[140px_1fr] items-center gap-4">
          <Label htmlFor="title_lo">Title (Lao)</Label>
          <Input
            id="title_lo"
            name="title_lo"
            value={formData.title_lo}
            onChange={onChange}
            placeholder="ປ້ອນຊື່ຮູບເງົາເປັນພາສາລາວ"
          />
        </div>

        <div>
          <Label htmlFor="overview_lo">Overview (Lao)</Label>
          <Textarea
            id="overview_lo"
            name="overview_lo"
            value={formData.overview_lo}
            onChange={onChange}
            rows={4}
            placeholder="ປ້ອນຄໍາອະທິບາຍຮູບເງົາເປັນພາສາລາວ"
          />
        </div>

        <div className="grid grid-cols-[140px_1fr] items-center gap-4">
          <Label htmlFor="tagline_lo">Tagline (Lao)</Label>
          <Input
            id="tagline_lo"
            name="tagline_lo"
            value={formData.tagline_lo}
            onChange={onChange}
            placeholder="ປ້ອນຄຳຂວັນຮູບເງົາເປັນພາສາລາວ"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Movie Details Section
export function MovieDetailsFields({ formData, onChange }: MovieFormFieldsProps) {
  return (
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
              onChange={onChange}
              placeholder="Original title (if different)"
            />
          </div>

          <div>
            <Label htmlFor="original_language">Original Language</Label>
            <select
              id="original_language"
              name="original_language"
              value={formData.original_language}
              onChange={(e) => onChange(e as any)}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="release_date">Release Date *</Label>
            <Input
              id="release_date"
              name="release_date"
              type="date"
              value={formData.release_date}
              onChange={onChange}
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
              onChange={onChange}
              required
              placeholder="120"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="imdb_id">IMDB ID</Label>
          <Input
            id="imdb_id"
            name="imdb_id"
            value={formData.imdb_id}
            onChange={onChange}
            placeholder="tt1234567"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Video Source Section
export function VideoSourceFields({ formData, onChange }: MovieFormFieldsProps) {
  return (
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
            onChange={onChange}
            placeholder="/videos/movie.mp4 or https://stream.example.com/video.m3u8"
          />
          <p className="text-xs text-gray-500 mt-1">
            For local files: upload to /public/videos/ and enter path. For HLS: enter full URL
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="video_format">Format</Label>
            <select
              id="video_format"
              name="video_format"
              value={formData.video_format}
              onChange={(e) => onChange(e as any)}
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
              onChange={(e) => onChange(e as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="original">Original</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </div>

          <div>
            <Label htmlFor="video_aspect_ratio">Aspect Ratio</Label>
            <select
              id="video_aspect_ratio"
              name="video_aspect_ratio"
              value={formData.video_aspect_ratio || '16:9'}
              onChange={(e) => onChange(e as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="4:3">4:3 (Standard)</option>
              <option value="21:9">21:9 (Ultrawide)</option>
              <option value="2.35:1">2.35:1 (Cinemascope)</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
