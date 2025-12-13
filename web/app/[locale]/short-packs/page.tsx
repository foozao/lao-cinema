'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Package } from 'lucide-react';
import { shortPacksAPI } from '@/lib/api/client';
import { ShortPackCard } from '@/components/short-pack-card';
import type { ShortPackSummary } from '@/lib/types';

export default function ShortPacksPage() {
  const t = useTranslations('shortPacks');
  const [packs, setPacks] = useState<ShortPackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    try {
      setLoading(true);
      const response = await shortPacksAPI.getAll({ published: true });
      setPacks(response.short_packs);
    } catch (err) {
      console.error('Failed to load short packs:', err);
      setError('Failed to load short packs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
            <Package className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>

        {/* Packs Grid */}
        {error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : packs.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No short film packs available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {packs.map((pack) => (
              <ShortPackCard key={pack.id} pack={pack} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
