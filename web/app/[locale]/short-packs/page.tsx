'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Package, Loader2 } from 'lucide-react';
import { shortPacksAPI } from '@/lib/api/client';
import { ShortPackCard } from '@/components/short-pack-card';
import { Header } from '@/components/header';
import { SubHeader } from '@/components/sub-header';
import { Footer } from '@/components/footer';
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
      <div className="min-h-screen bg-black flex flex-col">
        <Header variant="dark" />
        <SubHeader variant="dark" activePage="shorts" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
        <Footer variant="dark" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header variant="dark" />
      <SubHeader variant="dark" activePage="shorts" />
      
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {t('title')}
            </h1>
            <p className="text-gray-400">
              {t('subtitle')}
            </p>
          </div>

          {/* Packs Grid */}
          {error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
            </div>
          ) : packs.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">{t('empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {packs.map((pack) => (
                <ShortPackCard key={pack.id} pack={pack} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <Footer variant="dark" />
    </div>
  );
}
