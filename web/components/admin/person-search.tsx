'use client';

import { SearchableDropdown } from './searchable-dropdown';
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
  const searchFn = async (query: string, limit = 10) => {
    const response = await peopleAPI.search(query, limit);
    return { results: response.people, total: response.people.length };
  };

  const renderItem = (person: Person) => {
    const profileUrl = getProfileUrl(person.profile_path, 'small');
    return (
      <>
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
      </>
    );
  };

  return (
    <SearchableDropdown<Person>
      searchFn={searchFn}
      onSelect={onSelect}
      onCreateNew={onCreateNew}
      renderItem={renderItem}
      getItemKey={(person) => person.id}
      placeholder={placeholder}
    />
  );
}
