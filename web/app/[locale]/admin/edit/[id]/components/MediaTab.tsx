'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CheckCircle, Loader2, Trash2, Pencil } from 'lucide-react';
import { PosterManager } from '@/components/admin/poster-manager';
import { ImageUploader } from '@/components/admin/image-uploader';
import { SubtitleManager } from '@/components/admin/subtitle-manager';
import type { Movie, Trailer } from '@/lib/types';
import type { MovieFormData } from './types';
import { buildVideoUrlPreview, buildTrailerUrlPreview, extractTrailerSlug, buildTrailerThumbnailUrl } from './types';
import { trailersAPI } from '@/lib/api/client';

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
  const [trailerAddedMessage, setTrailerAddedMessage] = useState<string | null>(null);
  const [addingTrailer, setAddingTrailer] = useState(false);
  const [selectingThumbnail, setSelectingThumbnail] = useState(false);
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
  const [currentTrailerForThumbnail, setCurrentTrailerForThumbnail] = useState<Trailer | null>(null);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
  const [editForm, setEditForm] = useState({ name: '', slug: '', format: 'hls' as 'hls' | 'mp4' });
  const [savingEdit, setSavingEdit] = useState(false);

  const showTrailerAdded = (message: string) => {
    setTrailerAddedMessage(message);
    setTimeout(() => setTrailerAddedMessage(null), 3000);
  };

  const refreshTrailers = async () => {
    try {
      const data = await trailersAPI.getForMovie(movieId);
      // Map API response to Trailer type
      const mappedTrailers: Trailer[] = data.map((t: any) => ({
        id: t.id,
        type: t.type,
        name: t.name,
        official: t.official,
        language: t.language,
        published_at: t.publishedAt,
        order: t.order,
        ...(t.type === 'youtube' && { key: t.youtubeKey }),
        ...(t.type === 'video' && {
          video_url: t.videoUrl,
          video_format: t.videoFormat,
          video_quality: t.videoQuality,
          thumbnail_url: t.thumbnailUrl,
        }),
      }));
      onTrailersChange(mappedTrailers);
    } catch (error) {
      console.error('Failed to refresh trailers:', error);
    }
  };

  const handleRemoveTrailer = async (index: number) => {
    const trailer = trailers[index];
    if (!confirm(`Remove trailer "${trailer.name}"?`)) return;
    
    try {
      await trailersAPI.delete(trailer.id);
      await refreshTrailers();
    } catch (error) {
      console.error('Failed to delete trailer:', error);
    }
  };

  const handleSetPrimaryTrailer = async (index: number) => {
    const newTrailers = [...trailers];
    const [movedTrailer] = newTrailers.splice(index, 1);
    newTrailers.unshift(movedTrailer);
    
    try {
      // Persist the new order to the backend
      const trailerIds = newTrailers.map(t => t.id);
      await trailersAPI.reorder(movieId, trailerIds);
      
      // Update local state
      onTrailersChange(newTrailers);
      showTrailerAdded('Primary trailer updated!');
    } catch (error) {
      console.error('Failed to reorder trailers:', error);
      alert('Failed to set primary trailer. Please try again.');
    }
  };

  const handleStartEdit = (trailer: Trailer) => {
    if (trailer.type !== 'video') return;
    setEditingTrailer(trailer);
    setEditForm({
      name: trailer.name,
      slug: extractTrailerSlug(trailer.video_url),
      format: (trailer.video_format as 'hls' | 'mp4') || 'hls',
    });
  };

  const handleCancelEdit = () => {
    setEditingTrailer(null);
    setEditForm({ name: '', slug: '', format: 'hls' });
  };

  const handleOpenThumbnailSelector = (trailer: Trailer) => {
    if (trailer.type === 'video') {
      setCurrentTrailerForThumbnail(trailer);
      setThumbnailModalOpen(true);
    }
  };

  const handleSelectThumbnail = async (thumbnailNumber: number) => {
    if (!currentTrailerForThumbnail) return;

    setSelectingThumbnail(true);
    try {
      await trailersAPI.selectThumbnail(currentTrailerForThumbnail.id, thumbnailNumber);
      await refreshTrailers();
      setThumbnailModalOpen(false);
      setCurrentTrailerForThumbnail(null);
      showTrailerAdded('Thumbnail selected!');
    } catch (error) {
      console.error('Error selecting thumbnail:', error);
      alert(`Failed to select thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSelectingThumbnail(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTrailer) return;
    
    setSavingEdit(true);
    try {
      await trailersAPI.update(editingTrailer.id, {
        name: editForm.name,
        video_url: editForm.slug,
        video_format: editForm.format,
      });
      await refreshTrailers();
      setEditingTrailer(null);
      showTrailerAdded('Trailer updated!');
    } catch (error) {
      console.error('Failed to update trailer:', error);
      alert(error instanceof Error ? error.message : 'Failed to update trailer');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddYouTubeTrailer = async (key: string) => {
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
    
    setAddingTrailer(true);
    try {
      await trailersAPI.addYouTube(movieId, {
        key: videoId,
        name: 'YouTube Trailer',
        official: false,
      });
      await refreshTrailers();
      showTrailerAdded('YouTube trailer added!');
    } catch (error) {
      console.error('Failed to add trailer:', error);
      alert(error instanceof Error ? error.message : 'Failed to add trailer');
    } finally {
      setAddingTrailer(false);
    }
  };

  const handleAddSelfHostedTrailer = async (slug: string, name: string, format: 'hls' | 'mp4') => {
    if (!slug.trim()) {
      alert('Please enter a trailer slug.');
      return;
    }
    
    // Check if trailer already exists
    if (trailers.some(t => t.type === 'video' && extractTrailerSlug(t.video_url) === slug)) {
      alert('This trailer is already in the list.');
      return;
    }
    
    setAddingTrailer(true);
    try {
      await trailersAPI.addSelfHosted(movieId, {
        slug,
        name: name || 'Self-hosted Trailer',
        format,
      });
      await refreshTrailers();
      showTrailerAdded('Self-hosted trailer added!');
    } catch (error) {
      console.error('Failed to add trailer:', error);
      alert(error instanceof Error ? error.message : 'Failed to add trailer');
    } finally {
      setAddingTrailer(false);
    }
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
            <Label htmlFor="video_url">Video Slug</Label>
            <Input
              id="video_url"
              name="video_url"
              value={formData.video_url}
              onChange={onFormChange}
              placeholder="movie-name"
              className="font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter just the video folder name (e.g., <code className="bg-gray-100 px-1 rounded">movie-name</code>). The full URL is constructed automatically.
            </p>
            {formData.video_url && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border text-xs space-y-1">
                <p className="font-medium text-gray-700">Full URLs (auto-generated):</p>
                <p className="text-gray-600 truncate" title={buildVideoUrlPreview(formData.video_url).local}>
                  <span className="text-gray-400">Local:</span>{' '}
                  <code className="text-blue-600">{buildVideoUrlPreview(formData.video_url).local}</code>
                </p>
                <p className="text-gray-600 truncate" title={buildVideoUrlPreview(formData.video_url).production}>
                  <span className="text-gray-400">Production:</span>{' '}
                  <code className="text-green-600">{buildVideoUrlPreview(formData.video_url).production}</code>
                </p>
              </div>
            )}
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
          {/* Add Trailer Forms */}
          <Tabs defaultValue="self-hosted" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="self-hosted">Self-hosted</TabsTrigger>
              <TabsTrigger value="youtube">YouTube</TabsTrigger>
            </TabsList>
            
            {/* Self-hosted Trailer Form */}
            <TabsContent value="self-hosted" className="mt-3">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="text-sm font-medium mb-3">Add Self-hosted Trailer</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="trailer_name" className="text-xs">Trailer Name</Label>
                    <Input
                      id="trailer_name"
                      placeholder="e.g., Official Trailer, Teaser"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="trailer_slug" className="text-xs">Trailer Slug</Label>
                    <Input
                      id="trailer_slug"
                      placeholder="e.g., movie-name-trailer"
                      className="text-sm font-mono"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Enter just the folder/file name. Full URL is auto-generated.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="trailer_format" className="text-xs">Format</Label>
                    <select
                      id="trailer_format"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      defaultValue="hls"
                    >
                      <option value="hls">HLS (.m3u8)</option>
                      <option value="mp4">MP4</option>
                    </select>
                  </div>
                  <div id="trailer_url_preview" className="hidden p-3 bg-white rounded-md border text-xs space-y-1">
                    <p className="font-medium text-gray-700">Full URLs (auto-generated):</p>
                    <p className="text-gray-600 truncate">
                      <span className="text-gray-400">Local:</span>{' '}
                      <code id="trailer_local_url" className="text-blue-600"></code>
                    </p>
                    <p className="text-gray-600 truncate">
                      <span className="text-gray-400">Production:</span>{' '}
                      <code id="trailer_prod_url" className="text-green-600"></code>
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={addingTrailer}
                    onClick={() => {
                      const nameInput = document.getElementById('trailer_name') as HTMLInputElement;
                      const slugInput = document.getElementById('trailer_slug') as HTMLInputElement;
                      const formatSelect = document.getElementById('trailer_format') as HTMLSelectElement;
                      if (slugInput.value.trim()) {
                        handleAddSelfHostedTrailer(
                          slugInput.value.trim(),
                          nameInput.value.trim(),
                          formatSelect.value as 'hls' | 'mp4'
                        );
                        nameInput.value = '';
                        slugInput.value = '';
                      }
                    }}
                  >
                    {addingTrailer ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                    ) : (
                      'Add Self-hosted Trailer'
                    )}
                  </Button>
                  {/* Success notification */}
                  {trailerAddedMessage && (
                    <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm mt-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      {trailerAddedMessage}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {/* YouTube Trailer Form */}
            <TabsContent value="youtube" className="mt-3">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium mb-3">Add YouTube Trailer</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="manual_trailer_key" className="text-xs">YouTube Video ID or URL</Label>
                    <Input
                      id="manual_trailer_key"
                      placeholder="e.g., dQw4w9WgXcQ or https://youtube.com/watch?v=..."
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          const key = input.value.trim();
                          if (key) {
                            handleAddYouTubeTrailer(key);
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Paste YouTube video ID or full URL, then press Enter
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={addingTrailer}
                    onClick={() => {
                      const input = document.getElementById('manual_trailer_key') as HTMLInputElement;
                      const key = input.value.trim();
                      if (key) {
                        handleAddYouTubeTrailer(key);
                        input.value = '';
                      }
                    }}
                  >
                    {addingTrailer ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                    ) : (
                      'Add YouTube Trailer'
                    )}
                  </Button>
                  {/* Success notification */}
                  {trailerAddedMessage && (
                    <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm mt-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      {trailerAddedMessage}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Existing Trailers */}
          {trailers.length > 0 ? (
            <div className="space-y-3">
              {trailers.map((trailer, index) => {
                const isYouTube = trailer.type === 'youtube';
                const isSelfHosted = trailer.type === 'video';
                const ytKey = isYouTube ? trailer.key : null;
                const trailerSlug = isSelfHosted ? extractTrailerSlug(trailer.video_url) : null;
                const trailerFormat = isSelfHosted ? trailer.video_format : null;
                
                // Build full thumbnail URL for self-hosted trailers
                let thumbnailUrl = null;
                if (isSelfHosted && trailer.thumbnail_url) {
                  if (trailer.thumbnail_url.startsWith('http')) {
                    // Already a full URL
                    thumbnailUrl = trailer.thumbnail_url;
                  } else {
                    // It's a slug path like "at-the-horizon/thumbnail-6.jpg"
                    // Extract the thumbnail number and use the helper
                    const match = trailer.thumbnail_url.match(/thumbnail-(\d+)\.jpg$/);
                    if (match && trailerSlug) {
                      const thumbnailNumber = parseInt(match[1]);
                      thumbnailUrl = buildTrailerThumbnailUrl(trailerSlug, thumbnailNumber);
                    }
                  }
                }
                
                return (
                  <div key={trailer.id} className="p-3 bg-gray-50 rounded-lg border-2 border-transparent hover:border-gray-300 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      {isYouTube && ytKey ? (
                        <img
                          src={`https://img.youtube.com/vi/${ytKey}/hqdefault.jpg`}
                          alt={trailer.name}
                          className="w-32 h-18 rounded object-cover flex-shrink-0"
                        />
                      ) : isSelfHosted && thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={trailer.name}
                          className="w-32 h-18 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-32 h-18 rounded bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600 text-xs font-medium">Self-hosted</span>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-sm">{trailer.name}</p>
                          {index === 0 && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex-shrink-0">
                              Primary
                            </span>
                          )}
                        </div>
                        
                        {/* Type badges */}
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                          {isYouTube ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">YouTube</span>
                          ) : (
                            <>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">Self-hosted</span>
                              <span className="px-2 py-0.5 bg-gray-200 rounded uppercase">{trailerFormat}</span>
                            </>
                          )}
                          {trailer.official && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Official</span>
                          )}
                        </div>
                        
                        {/* Slug/URL info for self-hosted */}
                        {isSelfHosted && trailerSlug && (
                          <p className="text-xs text-gray-500 mb-2 font-mono truncate" title={trailer.video_url}>
                            Slug: {trailerSlug}
                          </p>
                        )}
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {isYouTube && ytKey && (
                            <a
                              href={`https://www.youtube.com/watch?v=${ytKey}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              Open in YouTube →
                            </a>
                          )}
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryTrailer(index)}
                              className="text-xs text-gray-600 hover:text-gray-800 underline"
                            >
                              Set as Primary
                            </button>
                          )}
                          {isSelfHosted && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenThumbnailSelector(trailer)}
                                className="text-xs text-purple-600 hover:text-purple-800 underline"
                              >
                                Choose Thumbnail
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(trailer)}
                                className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                                title="Edit trailer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveTrailer(index)}
                            className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                            title="Delete trailer"
                          >
                            <Trash2 className="w-4 h-4" />
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
            <p className="text-sm text-gray-500">No trailers available. Add a self-hosted or YouTube trailer above.</p>
          )}
        </CardContent>
      </Card>

      {/* Thumbnail Selection Modal */}
      {thumbnailModalOpen && currentTrailerForThumbnail && currentTrailerForThumbnail.type === 'video' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Choose Thumbnail</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select the best thumbnail for &quot;{currentTrailerForThumbnail.name}&quot;. Unused thumbnails will be cleaned up.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                  const slug = extractTrailerSlug(currentTrailerForThumbnail.video_url);
                  // Add cache-busting timestamp to prevent browser caching
                  const cacheBuster = Date.now();
                  const thumbnailUrl = `${buildTrailerThumbnailUrl(slug, num)}?t=${cacheBuster}`;
                  
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleSelectThumbnail(num)}
                      disabled={selectingThumbnail}
                      className="relative group border-2 border-gray-300 rounded-lg overflow-hidden hover:border-purple-500 transition-colors disabled:opacity-50"
                    >
                      <img
                        src={thumbnailUrl}
                        alt={`Thumbnail option ${num}`}
                        className="w-full h-auto"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <span className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Select
                        </span>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        Option {num} ({num * 3}s)
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setThumbnailModalOpen(false);
                    setCurrentTrailerForThumbnail(null);
                  }}
                  disabled={selectingThumbnail}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trailer Modal */}
      {editingTrailer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Self-hosted Trailer</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_trailer_name" className="text-sm">Trailer Name</Label>
                <Input
                  id="edit_trailer_name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g., Official Trailer"
                />
              </div>
              <div>
                <Label htmlFor="edit_trailer_slug" className="text-sm">Trailer Slug</Label>
                <Input
                  id="edit_trailer_slug"
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  placeholder="e.g., movie-name-trailer"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Just the folder/file name, not the full URL
                </p>
              </div>
              <div>
                <Label htmlFor="edit_trailer_format" className="text-sm">Format</Label>
                <select
                  id="edit_trailer_format"
                  value={editForm.format}
                  onChange={(e) => setEditForm({ ...editForm, format: e.target.value as 'hls' | 'mp4' })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                >
                  <option value="hls">HLS (.m3u8)</option>
                  <option value="mp4">MP4</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

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
