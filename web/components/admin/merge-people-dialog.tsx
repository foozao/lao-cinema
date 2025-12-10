'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, AlertTriangle } from 'lucide-react';
import { peopleAPI } from '@/lib/api/client';
import { getLocalizedText } from '@/lib/i18n';
import { getProfileUrl } from '@/lib/images';

interface MergePeopleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePerson: {
    id: number;
    name: { en: string; lo?: string };
    profile_path?: string | null;
  };
  onMergeComplete: () => void;
}

export function MergePeopleDialog({
  open,
  onOpenChange,
  sourcePerson,
  onMergeComplete,
}: MergePeopleDialogProps) {
  const locale = useLocale() as 'en' | 'lo';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const response = await peopleAPI.search(searchQuery, 20);
      // Filter out the source person from results
      const filtered = response.people.filter((p) => p.id !== sourcePerson.id);
      setSearchResults(filtered);
    } catch (err) {
      setError('Failed to search people');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMerge = async () => {
    if (!selectedTarget) return;

    setIsMerging(true);
    setError(null);
    try {
      await peopleAPI.merge(sourcePerson.id, selectedTarget.id);
      onMergeComplete();
      onOpenChange(false);
      // Reset state
      setSearchQuery('');
      setSearchResults([]);
      setSelectedTarget(null);
    } catch (err: any) {
      setError(err.message || 'Failed to merge people');
      console.error(err);
    } finally {
      setIsMerging(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedTarget(null);
    setError(null);
  };

  const sourceName = getLocalizedText(sourcePerson.name, locale);
  const targetName = selectedTarget ? getLocalizedText(selectedTarget.name, locale) : '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge Duplicate People</DialogTitle>
          <DialogDescription>
            Merge <strong>{sourceName}</strong> into another person. All credits and data will be transferred.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source Person Display */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Person to merge (will be deleted):
            </Label>
            <div className="flex items-center gap-3">
              {sourcePerson.profile_path ? (
                <img
                  src={getProfileUrl(sourcePerson.profile_path, 'small')!}
                  alt={sourceName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-xl">👤</span>
                </div>
              )}
              <div>
                <div className="font-semibold text-gray-900">{sourceName}</div>
                <div className="text-sm text-gray-500">ID: {sourcePerson.id}</div>
              </div>
            </div>
          </div>

          {/* Search for Target Person */}
          <div>
            <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
              Search for person to merge into (will be kept):
            </Label>
            <div className="flex gap-2">
              <Input
                id="search"
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                <Search className="w-4 h-4 mr-2" />
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
              <Label className="text-sm font-medium text-gray-700 px-2">
                Select target person:
              </Label>
              {searchResults.map((person) => {
                const name = getLocalizedText(person.name, locale);
                const isSelected = selectedTarget?.id === person.id;
                
                return (
                  <button
                    key={person.id}
                    onClick={() => setSelectedTarget(person)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {person.profile_path ? (
                      <img
                        src={getProfileUrl(person.profile_path, 'small')!}
                        alt={name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-lg">👤</span>
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">{name}</div>
                      <div className="text-sm text-gray-500">
                        ID: {person.id}
                        {person.departments && person.departments.length > 0 && (
                          <> • {person.departments.join(', ')}</>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Target Preview */}
          {selectedTarget && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Target person (will keep all data):
              </Label>
              <div className="flex items-center gap-3">
                {selectedTarget.profile_path ? (
                  <img
                    src={getProfileUrl(selectedTarget.profile_path, 'small')!}
                    alt={targetName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xl">👤</span>
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">{targetName}</div>
                  <div className="text-sm text-gray-500">ID: {selectedTarget.id}</div>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          {selectedTarget && (
            <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Warning:</strong> This action cannot be undone. All cast/crew credits from{' '}
                <strong>{sourceName}</strong> will be transferred to <strong>{targetName}</strong>,
                and <strong>{sourceName}</strong> will be permanently deleted.
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isMerging}>
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!selectedTarget || isMerging}
            className="bg-red-600 hover:bg-red-700"
          >
            {isMerging ? 'Merging...' : 'Merge People'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
