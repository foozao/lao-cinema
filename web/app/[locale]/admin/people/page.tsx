'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Edit, ArrowUpDown, Plus } from 'lucide-react';
import { peopleAPI } from '@/lib/api/client';
import { getLocalizedText } from '@/lib/i18n';
import { getProfileUrl } from '@/lib/images';

type DepartmentFilter = 'all' | 'Acting' | 'Directing' | 'Writing' | 'Production' | 'other';
type SortOrder = 'asc' | 'desc';

export default function PeopleAdminPage() {
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations('admin');
  const [people, setPeople] = useState<any[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    const loadPeople = async () => {
      try {
        const response = await peopleAPI.getAll();
        // Sort people alphabetically by English name
        const sortedPeople = [...response.people].sort((a, b) => {
          const nameA = (a.name?.en || '').toLowerCase();
          const nameB = (b.name?.en || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setPeople(sortedPeople);
        setFilteredPeople(sortedPeople);
      } catch (error) {
        console.error('Failed to load people:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPeople();
  }, []);


  // Filter and sort people based on search, department, and sort order
  useEffect(() => {
    let filtered = [...people];

    // Apply department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter((person) => {
        const departments = person.departments || [];
        if (departmentFilter === 'other') {
          // Check if person has any department that's not in the main categories
          return departments.some((dept: string) => !['Acting', 'Directing', 'Writing', 'Production'].includes(dept));
        }
        // Check if the selected department is in the person's departments array
        return departments.includes(departmentFilter);
      });
    }

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((person) => {
        const nameEn = person.name?.en?.toLowerCase() || '';
        const nameLo = person.name?.lo?.toLowerCase() || '';
        return nameEn.includes(query) || nameLo.includes(query);
      });
    }

    // Apply sort order
    filtered.sort((a, b) => {
      const nameA = (a.name?.en || '').toLowerCase();
      const nameB = (b.name?.en || '').toLowerCase();
      const comparison = nameA.localeCompare(nameB);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredPeople(filtered);
  }, [searchQuery, people, departmentFilter, sortOrder]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">{t('allPeople')}</h2>
        <Link href="/admin/people/add">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Person
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder={t('searchPeople')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{t('filter')}:</span>
            <div className="flex gap-2">
              <Button
                variant={departmentFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDepartmentFilter('all')}
              >
                {t('all')}
              </Button>
              <Button
                variant={departmentFilter === 'Acting' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDepartmentFilter('Acting')}
              >
                {t('acting')}
              </Button>
              <Button
                variant={departmentFilter === 'Directing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDepartmentFilter('Directing')}
              >
                {t('directing')}
              </Button>
              <Button
                variant={departmentFilter === 'Writing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDepartmentFilter('Writing')}
              >
                {t('writing')}
              </Button>
              <Button
                variant={departmentFilter === 'Production' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDepartmentFilter('Production')}
              >
                {t('production')}
              </Button>
              <Button
                variant={departmentFilter === 'other' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDepartmentFilter('other')}
              >
                {t('other')}
              </Button>
            </div>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-medium text-gray-700">{t('sort')}:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === 'asc' ? t('aToZ') : t('zToA')}
            </Button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(departmentFilter !== 'all' || searchQuery) && (
          <div className="text-sm text-gray-600">
            {t('showing')} {filteredPeople.length} {t('of')} {people.length} {t('people')}
            {departmentFilter !== 'all' && ` ${t('in')} ${departmentFilter === 'other' ? t('other') : departmentFilter}`}
            {searchQuery && ` ${t('matching')} "${searchQuery}"`}
          </div>
        )}
      </div>

      {/* People List */}
      {filteredPeople.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">
            {searchQuery ? t('noPeopleFound') : t('noPeopleYet')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPeople.map((person) => {
            const nameEn = person.name?.en || 'Unknown';
            const nameLo = person.name?.lo;
            const hasLaoName = nameLo && nameLo !== nameEn;
            const departments = person.departments || [];
            const profileUrl = getProfileUrl(person.profile_path, 'small');
            
            return (
              <div key={person.id} className="mb-3">
                <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all h-24">
                  {/* Profile Photo */}
                  <Link href={`/admin/people/${person.id}`} className="flex-shrink-0 flex items-center justify-center w-24 hover:bg-gray-50">
                    {profileUrl ? (
                      <img
                        src={profileUrl}
                        alt={nameEn}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-2xl">👤</span>
                      </div>
                    )}
                  </Link>

                  {/* Person Info */}
                  <Link href={`/admin/people/${person.id}`} className="flex-1 min-w-0 flex flex-col justify-center px-4 hover:bg-gray-50">
                    <div className="mb-1">
                      <h3 className="text-base font-semibold text-gray-900 leading-tight">
                        {hasLaoName ? nameLo : nameEn}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {hasLaoName ? nameEn : ''}
                      </p>
                    </div>

                    {departments.length > 0 && (
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                        <span>{departments.join(', ')}</span>
                      </div>
                    )}
                  </Link>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
