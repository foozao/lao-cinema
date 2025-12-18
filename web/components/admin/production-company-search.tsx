'use client';

import { Building2 } from 'lucide-react';
import { SearchableDropdown } from './searchable-dropdown';
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
  const searchFn = async (query: string, limit = 10) => {
    const response = await productionCompaniesAPI.search(query, limit);
    return { results: response.companies, total: response.companies.length };
  };

  const filterResults = (companies: ProductionCompany[]) => {
    return companies.filter(c => !excludeIds.includes(c.id));
  };

  const renderItem = (company: ProductionCompany) => {
    return (
      <>
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
      </>
    );
  };

  return (
    <SearchableDropdown<ProductionCompany>
      searchFn={searchFn}
      onSelect={onSelect}
      onCreateNew={onCreateNew}
      renderItem={renderItem}
      getItemKey={(company) => company.id}
      placeholder={placeholder}
      filterResults={filterResults}
    />
  );
}
