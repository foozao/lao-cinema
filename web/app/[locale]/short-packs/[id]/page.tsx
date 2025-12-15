'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { OptimizedImage as Image } from '@/components/optimized-image';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Film, Package, Play, ArrowLeft, Bookmark } from 'lucide-react';
import { MovieCard } from '@/components/movie-card';
import { Header } from '@/components/header';
import { SubHeader } from '@/components/sub-header';
import { Footer } from '@/components/footer';
import { ShareButton } from '@/components/share-button';
import { shortPacksAPI } from '@/lib/api/client';
import { createPackRental, getPackRentalStatus, type PackRental } from '@/lib/api/rentals-client';
import { useAuth } from '@/lib/auth';
import { PaymentModal } from '@/components/payment-modal';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl } from '@/lib/images';
import { formatRuntime } from '@/lib/utils';
import type { ShortPack } from '@/lib/types';

export default function ShortPackDetailPage() {
  const params = useParams();
  const packId = params.id as string;
  const locale = useLocale() as 'en' | 'lo';
  const t = useTranslations('shortPacks');
  const tWatchlist = useTranslations('watchlist');

  const router = useRouter();
  const [pack, setPack] = useState<ShortPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [rental, setRental] = useState<PackRental | null>(null);
  const [rentalExpired, setRentalExpired] = useState(false);
  const { isLoading: authLoading } = useAuth();

  useEffect(() => {
    loadPack();
  }, [packId]);

  // Check rental status after auth is ready
  useEffect(() => {
    if (authLoading || !pack) return;
    checkRentalStatus();
  }, [authLoading, pack]);

  const checkRentalStatus = async () => {
    if (!pack) return;
    try {
      const { rental: activeRental, expired } = await getPackRentalStatus(pack.id);
      setRental(activeRental);
      setRentalExpired(expired || false);
    } catch (err) {
      console.error('Failed to check pack rental status:', err);
    }
  };

  const formatTimeRemaining = (expiresAt: string): string => {
    const now = Date.now();
    const expiry = new Date(expiresAt).getTime();
    const remaining = expiry - now;
    
    if (remaining <= 0) return '';
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const handleWatchNow = () => {
    if (pack?.shorts && pack.shorts.length > 0) {
      // Resume from saved position if available
      let targetShort = pack.shorts[0];
      
      if (rental?.currentShortId) {
        const savedShort = pack.shorts.find(s => s.movie.id === rental.currentShortId);
        if (savedShort) {
          targetShort = savedShort;
        }
      }
      
      router.push(`/movies/${targetShort.movie.slug || targetShort.movie.id}/watch`);
    }
  };

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
    } catch (err: any) {
      // 409 = already have an active rental - treat as success
      if (err.message?.includes('already have an active rental')) {
        setShowPayment(false);
        if (pack.shorts && pack.shorts.length > 0) {
          const firstShort = pack.shorts[0];
          router.push(`/movies/${firstShort.movie.slug || firstShort.movie.id}/watch`);
        }
        return;
      }
      console.error('Failed to rent pack:', err);
      alert('Failed to rent pack. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <Header variant="dark" />
        <SubHeader variant="dark" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Pack not found</h1>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
        <Footer variant="dark" />
      </div>
    );
  }

  const title = getLocalizedText(pack.title, locale);
  const description = pack.description ? getLocalizedText(pack.description, locale) : null;
  const tagline = pack.tagline ? getLocalizedText(pack.tagline, locale) : null;
  const posterUrl = pack.poster_path ? getPosterUrl(pack.poster_path, 'large') : null;
  const backdropUrl = pack.backdrop_path ? `https://image.tmdb.org/t/p/w1280${pack.backdrop_path}` : null;
  
  // Get up to 4 short posters for collage when no custom poster
  const shortPosters = pack.shorts
    ?.map(s => s.movie.poster_path)
    .filter((p): p is string => p !== null)
    .slice(0, 4) || [];

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header variant="dark" />
      <SubHeader variant="dark" />
      
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
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          {/* Back button */}
          <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-6">
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
                ) : shortPosters.length > 0 ? (
                  /* Poster collage from shorts */
                  <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 bg-gray-900">
                    {shortPosters.map((poster, idx) => (
                      <div key={idx} className="relative w-full h-full">
                        <Image
                          src={getPosterUrl(poster, 'medium') || ''}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                    {/* Fill empty slots if less than 4 posters */}
                    {Array.from({ length: Math.max(0, 4 - shortPosters.length) }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="relative w-full h-full bg-gradient-to-br from-purple-900/50 to-indigo-900/50 flex items-center justify-center">
                        <Film className="w-8 h-8 text-purple-400/50" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 flex flex-col items-center justify-center text-white">
                    <Package className="w-16 h-16 mb-2" />
                    <span className="text-sm">{pack.short_count} shorts</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 z-10">
                  <Badge className="bg-purple-600 text-white">
                    <Package className="w-3 h-3 mr-1" />
                    {t('packBadge')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {title}
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <Film className="w-5 h-5" />
                  <span>{pack.short_count} {pack.short_count === 1 ? t('short') : t('shorts')}</span>
                </div>
                {pack.total_runtime && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-5 h-5" />
                    <span>{formatRuntime(pack.total_runtime)}</span>
                  </div>
                )}
              </div>
              
              {tagline && (
                <p className="text-lg text-gray-300 italic mb-4">
                  "{tagline}"
                </p>
              )}

              {/* Description */}
              {description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">{t('description')}</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {description}
                  </p>
                </div>
              )}

              {/* Rental Status */}
              {rental && (
                <div className="mb-4 flex items-center gap-2 text-green-400">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">{formatTimeRemaining(rental.expiresAt)}</span>
                </div>
              )}

              {/* CTA */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {rental ? (
                  <Button 
                    size="lg" 
                    className="bg-green-600 hover:bg-green-700 text-white px-8"
                    onClick={handleWatchNow}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {t('watchNow')}
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                    onClick={() => setShowPayment(true)}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {t('rentPack')}
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gray-600 bg-transparent text-white hover:bg-gray-800"
                >
                  <Bookmark className="w-5 h-5 mr-2" />
                  {tWatchlist('addToWatchlist')}
                </Button>
                <ShareButton
                  path={`/short-packs/${pack.slug || pack.id}`}
                  title={title}
                  size="lg"
                  variant="secondary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shorts List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-semibold text-white mb-6">
          {t('included')} ({pack.short_count})
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pack.shorts?.map((item) => (
            <MovieCard key={item.movie.id} movie={item.movie} />
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={showPayment}
        onOpenChange={setShowPayment}
        movieTitle={title}
        onPaymentComplete={handlePaymentComplete}
      />
      
      <Footer variant="dark" />
    </div>
  );
}
