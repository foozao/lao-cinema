'use client';

import { useState } from 'react';
import { SubtitleTrack } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Check } from 'lucide-react';

interface SubtitleManagerProps {
  movieId: string;
  subtitles: SubtitleTrack[];
  onUpdate: () => void;
}

export function SubtitleManager({ movieId, subtitles, onUpdate }: SubtitleManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSubtitle, setNewSubtitle] = useState({
    language: '',
    label: '',
    url: '',
    isDefault: false,
    kind: 'subtitles' as const,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!newSubtitle.language || !newSubtitle.label || !newSubtitle.url) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/movies/${movieId}/subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: newSubtitle.language,
          label: newSubtitle.label,
          url: newSubtitle.url,
          isDefault: newSubtitle.isDefault,
          kind: newSubtitle.kind,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add subtitle track');
      }

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
      const response = await fetch(`/api/movies/${movieId}/subtitles/${trackId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete subtitle track');
      }

      onUpdate();
    } catch (error) {
      console.error('Error deleting subtitle:', error);
      alert('Failed to delete subtitle track');
    }
  };

  const handleToggleDefault = async (track: SubtitleTrack) => {
    try {
      const response = await fetch(`/api/movies/${movieId}/subtitles/${track.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isDefault: !track.is_default,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update subtitle track');
      }

      onUpdate();
    } catch (error) {
      console.error('Error updating subtitle:', error);
      alert('Failed to update subtitle track');
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

      <div className="space-y-3">
        {subtitles.map((track) => (
          <div
            key={track.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{track.label}</span>
                <span className="text-sm text-gray-500">({track.language})</span>
                {track.is_default && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Default
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 truncate">{track.url}</p>
              <p className="text-xs text-gray-500 mt-1">Kind: {track.kind}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleToggleDefault(track)}
                variant="outline"
                size="sm"
                title={track.is_default ? 'Remove as default' : 'Set as default'}
              >
                <Check className={`w-4 h-4 ${track.is_default ? 'text-blue-600' : 'text-gray-400'}`} />
              </Button>
              <Button
                onClick={() => handleDelete(track.id)}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
          <h4 className="font-medium">Add New Subtitle Track</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="language">Language Code *</Label>
              <Input
                id="language"
                placeholder="en, lo, th, etc."
                value={newSubtitle.language}
                onChange={(e) => setNewSubtitle({ ...newSubtitle, language: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">ISO 639-1 code (e.g., en, lo, th)</p>
            </div>
            
            <div>
              <Label htmlFor="label">Display Label *</Label>
              <Input
                id="label"
                placeholder="English, ລາວ, ไทย"
                value={newSubtitle.label}
                onChange={(e) => setNewSubtitle({ ...newSubtitle, label: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="url">VTT File URL *</Label>
            <Input
              id="url"
              placeholder="https://example.com/subtitles/movie-en.vtt"
              value={newSubtitle.url}
              onChange={(e) => setNewSubtitle({ ...newSubtitle, url: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload the .vtt file to your video server or CDN first
            </p>
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
