'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, X } from 'lucide-react';

interface SearchableDropdownProps<T> {
  searchFn: (query: string, limit?: number) => Promise<{ results: T[]; total: number }>;
  onSelect: (item: T) => void;
  onCreateNew?: (query: string) => void;
  renderItem: (item: T) => ReactNode;
  getItemKey: (item: T) => string | number;
  placeholder?: string;
  minQueryLength?: number;
  debounceMs?: number;
  maxResults?: number;
  filterResults?: (results: T[]) => T[];
}

export function SearchableDropdown<T>({
  searchFn,
  onSelect,
  onCreateNew,
  renderItem,
  getItemKey,
  placeholder = 'Search...',
  minQueryLength = 2,
  debounceMs = 300,
  maxResults = 10,
  filterResults,
}: SearchableDropdownProps<T>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search as user types
  useEffect(() => {
    if (query.trim().length < minQueryLength) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await searchFn(query, maxResults);
        let items = response.results;
        
        // Apply optional filter
        if (filterResults) {
          items = filterResults(items);
        }
        
        setResults(items);
        setIsOpen(true);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(searchTimeout);
  }, [query, searchFn, minQueryLength, debounceMs, maxResults, filterResults]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: T) => {
    onSelect(item);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    if (onCreateNew && query.trim()) {
      onCreateNew(query.trim());
      setQuery('');
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            <>
              {results.map((item) => (
                <button
                  key={getItemKey(item)}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                >
                  {renderItem(item)}
                </button>
              ))}
              {onCreateNew && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="w-full flex items-center gap-2 p-3 border-t text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Create &quot;{query}&quot;</span>
                </button>
              )}
            </>
          ) : query.trim().length >= minQueryLength ? (
            <div className="p-3">
              <p className="text-gray-500 text-sm mb-2">No results found</p>
              {onCreateNew && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCreateNew}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create &quot;{query}&quot;
                </Button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
