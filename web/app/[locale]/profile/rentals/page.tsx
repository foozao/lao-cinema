'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { getRentals, type Rental } from '@/lib/api/rentals-client';
import { Film } from 'lucide-react';
import { ProfilePageLayout } from '@/components/profile-page-layout';
import { RentalCard } from '@/components/rental-card';
import { EmptyState } from '@/components/empty-state';
import { AnonymousNotice } from '@/components/anonymous-notice';

export default function RentalsPage() {
  const t = useTranslations('profile.rentals');
  const { isAuthenticated } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const loadRentals = async () => {
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
  }, []);
  
  
  return (
    <ProfilePageLayout allowAnonymous isLoading={isLoading}>
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
          <AnonymousNotice
            message="Viewing anonymous rentals."
            signInMessage="Sign in to sync your rentals across devices."
          />
        )}
        
        {/* Rentals List */}
        {rentals.length === 0 ? (
          <EmptyState
            icon={Film}
            title={t('noActive')}
            description={t('noActiveDesc')}
            actionLabel={t('browseMovies')}
            actionHref="/movies"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {rentals.map((rental) => (
              <RentalCard key={rental.id} rental={rental} />
            ))}
          </div>
        )}
        
    </ProfilePageLayout>
  );
}
