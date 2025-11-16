'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Edit } from 'lucide-react';
import { peopleAPI } from '@/lib/api/client';
import { getLocalizedText } from '@/lib/i18n';
import { getProfileUrl } from '@/lib/images';

export default function PeopleAdminPage() {
  const locale = useLocale() as 'en' | 'lo';
  const [people, setPeople] = useState<any[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadPeople = async () => {
      try {
        const response = await peopleAPI.getAll();
        setPeople(response.people);
        setFilteredPeople(response.people);
      } catch (error) {
        console.error('Failed to load people:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPeople();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPeople(people);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = people.filter((person) => {
        const nameEn = person.name?.en?.toLowerCase() || '';
        const nameLo = person.name?.lo?.toLowerCase() || '';
        return nameEn.includes(query) || nameLo.includes(query);
      });
      setFilteredPeople(filtered);
    }
  }, [searchQuery, people]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">All People</h2>
        </div>
        <div className="w-32" /> {/* Spacer */}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* People List */}
      {filteredPeople.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">
            {searchQuery ? 'No people found matching your search.' : 'No people in the database yet. Import a movie to add cast and crew.'}
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
                      {person.known_for_department && (
                        <span className="text-sm text-gray-500">
                          · {person.known_for_department}
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
