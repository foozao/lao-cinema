'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Clock, Film, Pencil, Trash2 } from 'lucide-react';
import { getPosterUrl } from '@/lib/images';
import { shortPacksAPI } from '@/lib/api/client';
import type { ShortPackSummary } from '@/lib/types';

export default function ShortPacksAdminPage() {
  const t = useTranslations('admin');
  const [packs, setPacks] = useState<ShortPackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    try {
      setLoading(true);
      const response = await shortPacksAPI.getAll();
      setPacks(response.short_packs);
    } catch (err) {
      console.error('Failed to load short packs:', err);
      setError('Failed to load short packs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(t('confirmDeletePack', { title }))) {
      return;
    }

    try {
      await shortPacksAPI.delete(id);
      setPacks(packs.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete pack:', err);
      alert('Failed to delete pack');
    }
  };

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('shortFilmPacks')}</h2>
          <p className="text-gray-600">{t('curateAndManageCollections')}</p>
        </div>
        <Link href="/admin/short-packs/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {t('createPack')}
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {packs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noShortPacksYet')}</h3>
            <p className="text-gray-600 mb-4">{t('createFirstCollection')}</p>
            <Link href="/admin/short-packs/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('createPack')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs.map((pack) => (
            <Card key={pack.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-1">{pack.title.en}</CardTitle>
                    {pack.tagline?.en && (
                      <CardDescription className="line-clamp-2 mt-1">
                        {pack.tagline.en}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant={pack.is_published ? 'default' : 'secondary'}>
                    {pack.is_published ? t('published') : t('draft')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Poster row */}
                {pack.short_posters && pack.short_posters.length > 0 && (
                  <div className="flex gap-1 mb-4 overflow-hidden rounded">
                    {pack.short_posters.slice(0, 5).map((poster, idx) => (
                      <div key={idx} className="flex-1 aspect-[2/3] min-w-0">
                        <img
                          src={getPosterUrl(poster, 'small') || ''}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Film className="w-4 h-4" />
                    <span>{pack.short_count} {t('shorts')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatRuntime(pack.total_runtime)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/admin/short-packs/${pack.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Pencil className="w-4 h-4 mr-2" />
                      {t('edit')}
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(pack.id, pack.title.en)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
