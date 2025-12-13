'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link, useRouter } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Film, Package, Play, ArrowLeft } from 'lucide-react';
import { shortPacksAPI } from '@/lib/api/client';
import { createPackRental } from '@/lib/api/rentals-client';
import { PaymentModal } from '@/components/payment-modal';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl } from '@/lib/images';
import type { ShortPack } from '@/lib/types';

export default function ShortPackDetailPage() {
  const params = useParams();
  const packId = params.id as string;
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations('shortPacks');

  const router = useRouter();
  const [pack, setPack] = useState<ShortPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    loadPack();
  }, [packId]);

  const loadPack = async () => {
    try {
      setLoading(true);
      const data = await shortPacksAPI.getById(packId);
      setPack(data);
    } catch (err) {
      console.error('Failed to load pack:', err);
      setError('Failed to load pack');
    } finally {
      setLoading(false);
    }
  };

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handlePaymentComplete = async () => {
    if (!pack) return;
    
    try {
      // Generate a demo transaction ID
      const transactionId = `demo_pack_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      await createPackRental(pack.id, {
        transactionId,
        paymentMethod: 'demo',
      });
      
      setShowPayment(false);
      
      // Navigate to watch the first short
      if (pack.shorts && pack.shorts.length > 0) {
        const firstShort = pack.shorts[0];
        router.push(`/movies/${firstShort.movie.slug || firstShort.movie.id}/watch`);
      }
    } catch (err) {
      console.error('Failed to rent pack:', err);
      alert('Failed to rent pack. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pack not found</h1>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const title = getLocalizedText(pack.title, locale);
  const description = pack.description ? getLocalizedText(pack.description, locale) : null;
  const tagline = pack.tagline ? getLocalizedText(pack.tagline, locale) : null;
  const posterUrl = pack.poster_path ? getPosterUrl(pack.poster_path, 'large') : null;
  const backdropUrl = pack.backdrop_path ? `https://image.tmdb.org/t/p/w1280${pack.backdrop_path}` : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero Section */}
      <div className="relative">
        {/* Backdrop */}
        <div className="absolute inset-0 h-[400px] overflow-hidden">
          {backdropUrl ? (
            <Image
              src={backdropUrl}
              alt=""
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50 dark:from-gray-950 via-gray-50/80 dark:via-gray-950/80 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          {/* Back button */}
          <Link href="/" className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              <div className="relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl mx-auto md:mx-0">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={title}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 flex flex-col items-center justify-center text-white">
                    <Package className="w-16 h-16 mb-2" />
                    <span className="text-sm">{pack.short_count} shorts</span>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge className="bg-purple-600 text-white">
                    <Package className="w-3 h-3 mr-1" />
                    {t('packBadge')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
              </h1>
              
              {tagline && (
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                  {tagline}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Film className="w-5 h-5" />
                  <span>{pack.short_count} {pack.short_count === 1 ? t('short') : t('shorts')}</span>
                </div>
                {pack.total_runtime && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="w-5 h-5" />
                    <span>{formatRuntime(pack.total_runtime)} {t('totalRuntime')}</span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button 
                  size="lg" 
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                  onClick={() => setShowPayment(true)}
                >
                  <Play className="w-5 h-5 mr-2" />
                  {t('rentPack')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('description')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
            {description}
          </p>
        </div>
      )}

      {/* Shorts List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {t('included')} ({pack.short_count})
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {pack.shorts?.map((item, index) => {
            const movieTitle = getLocalizedText(item.movie.title, locale);
            const moviePoster = item.movie.poster_path ? getPosterUrl(item.movie.poster_path, 'medium') : null;
            
            return (
              <Card key={item.movie.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-800">
                  {moviePoster ? (
                    <Image
                      src={moviePoster}
                      alt={movieTitle}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Film className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="bg-black/70 text-white">
                      {index + 1}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                    {movieTitle}
                  </h3>
                  {item.movie.runtime && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      {item.movie.runtime}m
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={showPayment}
        onOpenChange={setShowPayment}
        movieTitle={title}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
}
