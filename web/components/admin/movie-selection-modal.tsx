'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, X, Film } from 'lucide-react';
import type { Movie } from '@/lib/types';

interface MovieSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allMovies: Movie[];
  excludeMovieIds: string[];
  onSelectMovie: (movie: Movie) => void;
  loading?: boolean;
  title?: string;
  filterFn?: (movie: Movie) => boolean;
}

export function MovieSelectionModal({
  open,
  onOpenChange,
  allMovies,
  excludeMovieIds,
  onSelectMovie,
  loading = false,
  title = 'Select Movie',
  filterFn,
}: MovieSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  // Filter movies
  const filteredMovies = allMovies.filter((movie) => {
    // Exclude already selected movies
    if (excludeMovieIds.includes(movie.id)) return false;

    // Apply custom filter if provided
    if (filterFn && !filterFn(movie)) return false;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleEn = movie.title?.en?.toLowerCase() || '';
      const titleLo = movie.title?.lo?.toLowerCase() || '';
      const originalTitle = movie.original_title?.toLowerCase() || '';
      return titleEn.includes(query) || titleLo.includes(query) || originalTitle.includes(query);
    }

    return true;
  });

  const handleSelect = (movie: Movie) => {
    onSelectMovie(movie);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies..."
              className="pl-9"
              autoFocus
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Movie Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-8">Loading movies...</p>
          ) : filteredMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="group cursor-pointer rounded-lg overflow-hidden border bg-white hover:ring-2 hover:ring-blue-500 transition-all"
                  onClick={() => handleSelect(movie)}
                >
                  <div className="relative aspect-[2/3]">
                    {movie.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                        alt={movie.title?.en || movie.original_title || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Film className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Plus className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium line-clamp-2">
                      {movie.title?.en || movie.original_title}
                    </p>
                    {movie.runtime && (
                      <p className="text-xs text-gray-500">{movie.runtime}m</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              {searchQuery ? 'No matching movies found.' : 'No movies available.'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
