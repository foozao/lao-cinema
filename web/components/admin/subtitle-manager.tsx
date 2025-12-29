'use client';

import { useState, useRef } from 'react';
import { SubtitleTrack } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Check, Upload, Loader2 } from 'lucide-react';
import { subtitlesAPI } from '@/lib/api/client';
import { SUBTITLE_LANGUAGES } from '@/lib/config/subtitle-languages';

interface SubtitleManagerProps {
  movieId: string;
  subtitles: SubtitleTrack[];
  hasBurnedSubtitles?: boolean;
  onUpdate: () => void;
}

export function SubtitleManager({ movieId, subtitles, hasBurnedSubtitles = false, onUpdate }: SubtitleManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSubtitle, setNewSubtitle] = useState({
    language: '',
    label: '',
    url: '',
    isDefault: false,
    kind: 'subtitles' as const,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [offsetNotification, setOffsetNotification] = useState<{ amount: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleLanguageChange = (code: string) => {
    const lang = SUBTITLE_LANGUAGES.find(l => l.code === code);
    setNewSubtitle(prev => ({
      ...prev,
      language: code,
      // Auto-populate label with native name
      label: lang?.nativeName || prev.label,
    }));
  };

  const processFile = async (file: File) => {
    if (!file) return;

    // Validate file type
    const filename = file.name.toLowerCase();
    if (!filename.endsWith('.vtt') && !filename.endsWith('.srt')) {
      setUploadError('Invalid file type. Please upload a .vtt or .srt file.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await subtitlesAPI.upload(movieId, file);
      
      // Auto-fill the URL field with the uploaded file URL
      setNewSubtitle(prev => ({ ...prev, url: result.url }));
      
      // Show notification if timestamp offset was corrected
      if (result.offsetCorrected && result.offsetAmount) {
        setOffsetNotification({ amount: result.offsetAmount });
      }
    } catch (error) {
      console.error('Error uploading subtitle:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
      setIsDragging(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const handleAdd = async () => {
    if (!newSubtitle.language || !newSubtitle.label || !newSubtitle.url) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await subtitlesAPI.add(movieId, {
        language: newSubtitle.language,
        label: newSubtitle.label,
        url: newSubtitle.url,
        isDefault: newSubtitle.isDefault,
        kind: newSubtitle.kind,
      });

      setNewSubtitle({
        language: '',
        label: '',
        url: '',
        isDefault: false,
        kind: 'subtitles',
      });
      setIsAdding(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding subtitle:', error);
      alert('Failed to add subtitle track');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this subtitle track?')) {
      return;
    }

    try {
      await subtitlesAPI.delete(movieId, trackId);
      onUpdate();
    } catch (error) {
      console.error('Error deleting subtitle:', error);
      alert('Failed to delete subtitle track');
    }
  };

  const handleToggleDefault = async (track: SubtitleTrack) => {
    try {
      await subtitlesAPI.update(movieId, track.id, { isDefault: !track.is_default });
      onUpdate();
    } catch (error) {
      console.error('Error updating subtitle:', error);
      alert('Failed to update subtitle track');
    }
  };

  const handleLinePositionChange = async (trackId: string, linePosition: number) => {
    try {
      await subtitlesAPI.update(movieId, trackId, { linePosition });
      onUpdate();
    } catch (error) {
      console.error('Error updating subtitle position:', error);
      alert('Failed to update subtitle position');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Subtitle Tracks</h3>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Subtitle
          </Button>
        )}
      </div>

      {subtitles.length === 0 && !isAdding && (
        <p className="text-sm text-gray-500">No subtitle tracks added yet.</p>
      )}

      {/* Existing Subtitles List */}
      {subtitles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Existing Subtitles ({subtitles.length})</h4>
          <div className="space-y-2">
            {subtitles.map((track) => {
              const langInfo = SUBTITLE_LANGUAGES.find(l => l.code === track.language);
              return (
                <div
                  key={track.id}
                  className="p-3 border rounded-lg bg-white hover:bg-gray-50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {track.language.toUpperCase()}
                        </span>
                        <span className="font-medium">{track.label}</span>
                        {langInfo && track.label !== langInfo.name && (
                          <span className="text-sm text-gray-500">({langInfo.name})</span>
                        )}
                        {track.is_default && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                        <span className="text-xs text-gray-400 capitalize">{track.kind}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">{track.url}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        onClick={() => handleToggleDefault(track)}
                        variant="ghost"
                        size="sm"
                        title={track.is_default ? 'Remove as default' : 'Set as default'}
                      >
                        <Check className={`w-4 h-4 ${track.is_default ? 'text-blue-600' : 'text-gray-300'}`} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(track.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete subtitle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Vertical Position Slider - Only show if video has burned-in subtitles */}
                  {hasBurnedSubtitles && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-600">
                          Vertical Position
                        </Label>
                        <span className="text-xs text-gray-500">
                          {track.line_position || 85}% from top
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={track.line_position || 85}
                        onChange={(e) => handleLinePositionChange(track.id, parseInt(e.target.value))}
                        className="w-full cursor-pointer"
                        style={{
                          height: '8px',
                          borderRadius: '4px',
                          background: 'linear-gradient(to right, #3b82f6 0%, #3b82f6 ' + (track.line_position || 85) + '%, #e5e7eb ' + (track.line_position || 85) + '%, #e5e7eb 100%)',
                          WebkitAppearance: 'none',
                          appearance: 'none',
                        }}
                        title="Adjust subtitle vertical position (0=top, 100=bottom)"
                      />
                      <p className="text-xs text-gray-400">
                        Adjust if subtitles overlap with burned-in subs (0=top, 85=bottom)
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isAdding && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
          <h4 className="font-medium">Add New Subtitle Track</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="language">Language *</Label>
              <select
                id="language"
                className="w-full px-3 py-2 border rounded-md bg-white"
                value={newSubtitle.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                <option value="">Select language...</option>
                {SUBTITLE_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.code.toUpperCase()} - {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="label">Display Label *</Label>
              <Input
                id="label"
                placeholder="English, ລາວ, ไทย"
                value={newSubtitle.label}
                onChange={(e) => setNewSubtitle({ ...newSubtitle, label: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Auto-filled from language, edit if needed</p>
            </div>
          </div>

          <div>
            <Label>Subtitle File *</Label>
            
            {/* Drag & Drop Zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`
                mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                transition-colors duration-200
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }
                ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".vtt,.srt"
                onChange={handleFileUpload}
                className="hidden"
              />
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-600">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <div>
                    <span className="text-sm font-medium text-blue-600">Click to upload</span>
                    <span className="text-sm text-gray-500"> or drag and drop</span>
                  </div>
                  <span className="text-xs text-gray-400">.vtt or .srt files (SRT auto-converts to VTT)</span>
                </div>
              )}
            </div>

            {/* URL Input (shows after upload or for manual entry) */}
            {newSubtitle.url && (
              <div className="mt-3">
                <Label htmlFor="url" className="text-xs text-gray-500">File URL</Label>
                <Input
                  id="url"
                  value={newSubtitle.url}
                  onChange={(e) => setNewSubtitle({ ...newSubtitle, url: e.target.value })}
                  className="mt-1 text-sm"
                />
              </div>
            )}
            
            {!newSubtitle.url && (
              <p className="text-xs text-gray-500 mt-2">
                Or enter URL directly:{' '}
                <button 
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => setNewSubtitle(prev => ({ ...prev, url: ' ' }))}
                >
                  Enter URL manually
                </button>
              </p>
            )}

            {uploadError && (
              <p className="text-xs text-red-500 mt-2">{uploadError}</p>
            )}
            
            {offsetNotification && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold text-lg">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">Timestamp offset detected and corrected</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Subtitles started at <strong>{offsetNotification.amount}</strong>, automatically adjusted to <strong>00:00:00.000</strong>.
                      {' '}If this is incorrect, please re-upload with correct timing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOffsetNotification(null)}
                    className="text-yellow-600 hover:text-yellow-800"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kind">Kind</Label>
              <select
                id="kind"
                className="w-full px-3 py-2 border rounded-md"
                value={newSubtitle.kind}
                onChange={(e) => setNewSubtitle({ ...newSubtitle, kind: e.target.value as any })}
              >
                <option value="subtitles">Subtitles</option>
                <option value="captions">Captions</option>
                <option value="descriptions">Descriptions</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isDefault"
                checked={newSubtitle.isDefault}
                onChange={(e) => setNewSubtitle({ ...newSubtitle, isDefault: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Set as default
              </Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Subtitle'}
            </Button>
            <Button
              onClick={() => {
                setIsAdding(false);
                setUploadError(null);
                setOffsetNotification(null);
                setNewSubtitle({
                  language: '',
                  label: '',
                  url: '',
                  isDefault: false,
                  kind: 'subtitles',
                });
              }}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
