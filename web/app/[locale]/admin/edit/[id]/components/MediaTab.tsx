'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { PosterManager } from '@/components/admin/poster-manager';
import { ImageUploader } from '@/components/admin/image-uploader';
import { SubtitleManager } from '@/components/admin/subtitle-manager';
import type { Movie, Trailer } from '@/lib/types';
import type { MovieFormData } from './types';

interface MediaTabProps {
  formData: MovieFormData;
  currentMovie: Movie | null;
  movieId: string;
  trailers: Trailer[];
  fetchingImages: boolean;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onTrailersChange: (trailers: Trailer[]) => void;
  onPrimaryImageChange: (imageId: string, type: 'poster' | 'backdrop' | 'logo') => Promise<void>;
  onFetchImages: () => Promise<void>;
  onImageAdded: () => Promise<void>;
  onImageDeleted: (imageId: string) => Promise<void>;
  onAddImage: (type: 'poster' | 'backdrop', url: string) => Promise<void>;
  onSubtitleUpdate: () => Promise<void>;
  setHasChanges: (value: boolean) => void;
}

export function MediaTab({
  formData,
  currentMovie,
  movieId,
  trailers,
  fetchingImages,
  onFormChange,
  onSelectChange,
  onTrailersChange,
  onPrimaryImageChange,
  onFetchImages,
  onImageAdded,
  onImageDeleted,
  onAddImage,
  onSubtitleUpdate,
  setHasChanges,
}: MediaTabProps) {
  const handleRemoveTrailer = (index: number) => {
    const trailer = trailers[index];
    if (confirm(`Remove trailer "${trailer.name}"?`)) {
      onTrailersChange(trailers.filter((_, i) => i !== index));
      setHasChanges(true);
    }
  };

  const handleSetPrimaryTrailer = (index: number) => {
    const newTrailers = [...trailers];
    const [movedTrailer] = newTrailers.splice(index, 1);
    newTrailers.unshift(movedTrailer);
    onTrailersChange(newTrailers);
    setHasChanges(true);
  };

  const handleAddTrailer = (key: string) => {
    // Extract video ID from various YouTube URL formats
    let videoId = key;
    if (key.includes('youtube.com') || key.includes('youtu.be')) {
      const urlMatch = key.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      if (urlMatch) videoId = urlMatch[1];
    }
    
    // Check if trailer already exists
    if (trailers.some(t => t.type === 'youtube' && t.key === videoId)) {
      alert('This trailer is already in the list.');
      return;
    }
    
    const newTrailer: Trailer = {
      id: `temp-${Date.now()}`,
      type: 'youtube',
      key: videoId,
      name: 'Manual Trailer',
      official: false,
      order: trailers.length,
    };
    onTrailersChange([...trailers, newTrailer]);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
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
              onChange={onFormChange}
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
                onChange={(e) => onSelectChange('video_format', e.target.value)}
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
                onChange={(e) => onSelectChange('video_quality', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="original">Original</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="video_aspect_ratio">Aspect Ratio</Label>
            <select
              id="video_aspect_ratio"
              name="video_aspect_ratio"
              value={formData.video_aspect_ratio}
              onChange={(e) => onSelectChange('video_aspect_ratio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Unknown / Not Set</option>
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="4:3">4:3 (Standard)</option>
              <option value="2.35:1">2.35:1 (Cinemascope)</option>
              <option value="2.39:1">2.39:1 (Anamorphic)</option>
              <option value="1.85:1">1.85:1 (Theatrical)</option>
              <option value="21:9">21:9 (Ultra-wide)</option>
              <option value="mixed">Mixed (Multiple ratios)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Setting this helps optimize the video player display. Use &quot;16:9&quot; for standard widescreen content.
            </p>
          </div>

          {/* Burned-in Subtitles */}
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="has_burned_subtitles"
                name="has_burned_subtitles"
                checked={formData.has_burned_subtitles === true || formData.has_burned_subtitles === 'true'}
                onChange={(e) => {
                  onSelectChange('has_burned_subtitles', e.target.checked.toString());
                  if (!e.target.checked) {
                    onSelectChange('burned_subtitles_language', '');
                  }
                }}
                className="w-4 h-4 mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="has_burned_subtitles" className="cursor-pointer font-medium">
                  Video has burned-in (hardcoded) subtitles
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Check this if subtitles are permanently embedded in the video file itself.
                  You can still upload additional SRT/VTT subtitle files below.
                </p>
                
                {formData.has_burned_subtitles && (
                  <div className="mt-3">
                    <Label htmlFor="burned_subtitles_language" className="text-sm">
                      Burned-in subtitle language
                    </Label>
                    <select
                      id="burned_subtitles_language"
                      name="burned_subtitles_language"
                      value={formData.burned_subtitles_language || ''}
                      onChange={(e) => onSelectChange('burned_subtitles_language', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="">Select language...</option>
                      <option value="lo">LO - Lao (ລາວ)</option>
                      <option value="en">EN - English</option>
                      <option value="th">TH - Thai (ไทย)</option>
                      <option value="zh">ZH - Chinese (中文)</option>
                      <option value="ja">JA - Japanese (日本語)</option>
                      <option value="ko">KO - Korean (한국어)</option>
                      <option value="vi">VI - Vietnamese (Tiếng Việt)</option>
                      <option value="fr">FR - French (Français)</option>
                      <option value="es">ES - Spanish (Español)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subtitle Tracks */}
      <Card>
        <CardHeader>
          <CardTitle>Subtitle Tracks</CardTitle>
        </CardHeader>
        <CardContent>
          <SubtitleManager
            movieId={movieId}
            subtitles={currentMovie?.subtitle_tracks || []}
            hasBurnedSubtitles={currentMovie?.video_sources?.[0]?.has_burned_subtitles || false}
            onUpdate={onSubtitleUpdate}
          />
        </CardContent>
      </Card>

      {/* Trailers */}
      <Card>
        <CardHeader>
          <CardTitle>Trailers ({trailers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual Trailer Entry */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium mb-3">Add Trailer Manually</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="manual_trailer_key" className="text-xs">YouTube Video ID</Label>
                <Input
                  id="manual_trailer_key"
                  placeholder="e.g., dQw4w9WgXcQ"
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.currentTarget;
                      const key = input.value.trim();
                      if (key) {
                        handleAddTrailer(key);
                        input.value = '';
                      }
                    }
                  }}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Paste YouTube video ID or full URL, then press Enter
                </p>
              </div>
            </div>
          </div>

          {/* Existing Trailers */}
          {trailers.length > 0 ? (
            <div className="space-y-3">
              {trailers.map((trailer, index) => {
                if (trailer.type !== 'youtube') return null;
                const ytKey = trailer.key;
                
                return (
                  <div key={trailer.id || ytKey} className="p-3 bg-gray-50 rounded-lg border-2 border-transparent hover:border-gray-300 transition-colors">
                    <div className="flex items-start gap-3">
                      <img
                        src={`https://img.youtube.com/vi/${ytKey}/hqdefault.jpg`}
                        alt={trailer.name}
                        className="w-32 h-18 rounded object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-sm">{trailer.name}</p>
                          {index === 0 && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex-shrink-0">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                          <span className="px-2 py-0.5 bg-gray-200 rounded">YouTube</span>
                          {trailer.official && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Official</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://www.youtube.com/watch?v=${trailer.key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Open in YouTube →
                          </a>
                          {index > 0 && (
                            <button
                              onClick={() => handleSetPrimaryTrailer(index)}
                              className="text-xs text-gray-600 hover:text-gray-800 underline"
                            >
                              Set as Primary
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveTrailer(index)}
                            className="text-xs text-red-600 hover:text-red-800 underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-gray-500 mt-2">
                The primary trailer (first in list) will be displayed on the movie detail page.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No trailers available. Add one manually or sync from TMDB.</p>
          )}
        </CardContent>
      </Card>

      {/* Poster Management */}
      {currentMovie?.images && currentMovie.images.length > 0 ? (
        <PosterManager
          images={currentMovie.images}
          movieId={movieId}
          onPrimaryChange={onPrimaryImageChange}
          onRefresh={currentMovie.tmdb_id ? onFetchImages : undefined}
          onImageAdded={onImageAdded}
          onImageDeleted={onImageDeleted}
          refreshing={fetchingImages}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Poster & Image Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentMovie?.tmdb_id && (
              <>
                <p className="text-sm text-gray-600">
                  Load posters, backdrops, and logos from TMDB to choose which images to display.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onFetchImages}
                  disabled={fetchingImages}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${fetchingImages ? 'animate-spin' : ''}`} />
                  {fetchingImages ? 'Loading Images...' : 'Load Images from TMDB'}
                </Button>
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">OR</span>
                  </div>
                </div>
              </>
            )}
            <div>
              <h4 className="text-sm font-medium mb-3">Upload Custom Images</h4>
              <Tabs defaultValue="poster" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="poster">Poster</TabsTrigger>
                  <TabsTrigger value="backdrop">Backdrop</TabsTrigger>
                </TabsList>
                <TabsContent value="poster" className="mt-4">
                  <ImageUploader 
                    type="poster"
                    onUploadSuccess={(url) => onAddImage('poster', url)}
                  />
                </TabsContent>
                <TabsContent value="backdrop" className="mt-4">
                  <ImageUploader 
                    type="backdrop"
                    onUploadSuccess={(url) => onAddImage('backdrop', url)}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
