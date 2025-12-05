'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, X } from 'lucide-react';
import { peopleAPI } from '@/lib/api/client';
import { getProfileUrl } from '@/lib/images';

interface Person {
  id: number;
  name: { en?: string; lo?: string };
  profile_path?: string;
  known_for_department?: string;
}

interface PersonSearchProps {
  onSelect: (person: Person) => void;
  onCreateNew?: (name: string) => void;
  placeholder?: string;
}

export function PersonSearch({ onSelect, onCreateNew, placeholder = 'Search for a person...' }: PersonSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search as user types
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await peopleAPI.search(query, 10);
        setResults(response.people);
        setIsOpen(true);
      } catch (error) {
        console.error('Failed to search people:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

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

  const handleSelect = (person: Person) => {
    onSelect(person);
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
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
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
              {results.map((person) => {
                const profileUrl = getProfileUrl(person.profile_path, 'small');
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => handleSelect(person)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                  >
                    {profileUrl ? (
                      <img
                        src={profileUrl}
                        alt={person.name.en || 'Person'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-lg">👤</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {person.name.en || person.name.lo || 'Unknown'}
                      </p>
                      {person.known_for_department && (
                        <p className="text-xs text-gray-500">{person.known_for_department}</p>
                      )}
                    </div>
                  </button>
                );
              })}
              {onCreateNew && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="w-full flex items-center gap-2 p-3 border-t text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Create "{query}"</span>
                </button>
              )}
            </>
          ) : query.trim().length >= 2 ? (
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
                  Create "{query}"
                </Button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
