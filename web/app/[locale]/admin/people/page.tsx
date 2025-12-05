'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Edit, ArrowUpDown } from 'lucide-react';
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
        const dept = person.known_for_department;
        if (departmentFilter === 'other') {
          return dept && !['Acting', 'Directing', 'Writing', 'Production'].includes(dept);
        }
        return dept === departmentFilter;
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
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">{t('allPeople')}</h2>
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
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {filteredPeople.map((person) => {
                const nameEn = person.name?.en || 'Unknown';
                const nameLo = person.name?.lo;
                const hasLaoName = nameLo && nameLo !== nameEn;
                const departments = person.departments || [];
                
                return (
                  <Link
                    key={person.id}
                    href={`/admin/people/${person.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 flex items-baseline gap-3">
                      <div>
                        <span className="font-semibold text-gray-900">
                          {nameEn}
                        </span>
                        {hasLaoName && (
                          <span className="text-gray-600 ml-2">
                            ({nameLo})
                          </span>
                        )}
                      </div>
                      {departments.length > 0 && (
                        <span className="text-sm text-gray-500">
                          · {departments.join(', ')}
                        </span>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
