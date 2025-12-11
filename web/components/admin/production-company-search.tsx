'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, X, Building2 } from 'lucide-react';
import { productionCompaniesAPI } from '@/lib/api/client';

interface ProductionCompany {
  id: number;
  name: { en?: string; lo?: string };
  logo_path?: string;
  origin_country?: string;
}

interface ProductionCompanySearchProps {
  onSelect: (company: ProductionCompany) => void;
  onCreateNew?: (name: string) => void;
  placeholder?: string;
  excludeIds?: number[];
}

export function ProductionCompanySearch({ 
  onSelect, 
  onCreateNew, 
  placeholder = 'Search for a production company...', 
  excludeIds = [] 
}: ProductionCompanySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductionCompany[]>([]);
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
        const response = await productionCompaniesAPI.search(query, 10);
        // Filter out already-added companies
        const filtered = response.companies.filter(c => !excludeIds.includes(c.id));
        setResults(filtered);
        setIsOpen(true);
      } catch (error) {
        console.error('Failed to search production companies:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, excludeIds]);

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

  const handleSelect = (company: ProductionCompany) => {
    onSelect(company);
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
              {results.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => handleSelect(company)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                >
                  <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {company.logo_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${company.logo_path}`}
                        alt={company.name.en || 'Company'}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <Building2 className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {company.name.en || company.name.lo || 'Unknown'}
                    </p>
                    {company.origin_country && (
                      <p className="text-xs text-gray-500">{company.origin_country}</p>
                    )}
                  </div>
                </button>
              ))}
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
