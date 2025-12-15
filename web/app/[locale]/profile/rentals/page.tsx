'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { getRentals, type Rental } from '@/lib/api/rentals-client';
import { Link } from '@/i18n/routing';
import { Film, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProfileBreadcrumbWrapper } from '@/components/profile-breadcrumb-wrapper';
import { RentalCard } from '@/components/rental-card';

export default function RentalsPage() {
  const t = useTranslations('profile.rentals');
  const { user, isAuthenticated, anonymousId, isLoading: authLoading } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  
  useEffect(() => {
    const loadRentals = async () => {
      // Wait for auth to initialize
      if (authLoading) return;
      
      // Must be authenticated or have anonymous ID
      if (!isAuthenticated && !anonymousId) {
        router.push('/login');
        return;
      }
      
      try {
        const data = await getRentals(true); // Include recently expired rentals
        setRentals(data.rentals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rentals');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRentals();
  }, [isAuthenticated, anonymousId, authLoading, router]);
  
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header variant="dark" />
      <ProfileBreadcrumbWrapper />
      <div className="max-w-6xl mx-auto px-4 py-8 flex-grow">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
          <p className="text-gray-400 mt-2">{t('subtitle')}</p>
        </div>
        
        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        
        {/* Anonymous User Notice */}
        {!isAuthenticated && (
          <div className="mb-6 bg-blue-900/30 border border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-400">
              <strong>Viewing anonymous rentals.</strong> Sign in to sync your rentals across devices.
            </p>
          </div>
        )}
        
        {/* Rentals List */}
        {rentals.length === 0 ? (
          <div className="bg-gray-900 rounded-lg shadow-sm p-12 text-center border border-gray-700">
            <Film className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">{t('noActive')}</p>
            <p className="text-sm text-gray-500 mb-6">
              {t('noActiveDesc')}
            </p>
            <Link href="/movies">
              <Button>
                <Film className="mr-2 h-4 w-4" />
                {t('browseMovies')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {rentals.map((rental) => (
              <RentalCard key={rental.id} rental={rental} />
            ))}
          </div>
        )}
        
      </div>
      <Footer />
    </div>
  );
}
