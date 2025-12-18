import { useState, useEffect, useMemo } from 'react';

export interface UseAdminListOptions<T> {
  fetchFn: () => Promise<{ [key: string]: T[] }>;
  dataKey: string;
  searchFields: (item: T) => string[];
  sortFn?: (a: T, b: T, sortBy: string) => number;
  filterFn?: (item: T, filters: Record<string, any>) => boolean;
  initialSort?: string;
}

export interface UseAdminListReturn<T> {
  items: T[];
  filteredItems: T[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  filters: Record<string, any>;
  setFilter: (key: string, value: any) => void;
  reload: () => Promise<void>;
}

export function useAdminList<T>({
  fetchFn,
  dataKey,
  searchFields,
  sortFn,
  filterFn,
  initialSort = '',
}: UseAdminListOptions<T>): UseAdminListReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(initialSort);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchFn();
      setItems(response[dataKey] || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const fields = searchFields(item);
        return fields.some((field) => field.toLowerCase().includes(query));
      });
    }

    // Apply custom filters
    if (filterFn) {
      result = result.filter((item) => filterFn(item, filters));
    }

    // Apply sorting
    if (sortFn && sortBy) {
      result.sort((a, b) => sortFn(a, b, sortBy));
    }

    return result;
  }, [items, searchQuery, sortBy, filters, searchFields, sortFn, filterFn]);

  const setFilter = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return {
    items,
    filteredItems,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filters,
    setFilter,
    reload: loadData,
  };
}
