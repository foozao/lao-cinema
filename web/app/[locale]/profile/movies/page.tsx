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

type Tab = 'active' | 'history';

export default function MyMoviesPage() {
  const t = useTranslations('profile.myMovies');
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
  const [allRentals, setAllRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const data = await getRentals(false, true); // Get all rentals (includeRecent=false, includeAll=true)
      const now = new Date();
      
      // Filter into active and expired
      const active = data.rentals.filter(rental => new Date(rental.expiresAt) > now);
      const expired = data.rentals.filter(rental => new Date(rental.expiresAt) <= now);
      
      setActiveRentals(active);
      setAllRentals(expired);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };
  
  
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
            message={t('anonymousNotice')}
            signInMessage={t('signInToSync')}
          />
        )}
        
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'active'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {t('tabs.active')} {activeRentals.length > 0 && `(${activeRentals.length})`}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {t('tabs.history')} {allRentals.length > 0 && `(${allRentals.length})`}
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        {activeTab === 'active' ? (
          /* Active Rentals Tab */
          activeRentals.length === 0 ? (
            <EmptyState
              icon={Film}
              title={t('noRentals')}
              description={t('noRentalsDesc')}
              actionLabel={t('browseMovies')}
              actionHref="/movies"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeRentals.map((rental) => (
                <RentalCard key={rental.id} rental={rental} />
              ))}
            </div>
          )
        ) : (
          /* Rental History Tab */
          allRentals.length === 0 ? (
            <EmptyState
              icon={Film}
              title={t('noHistory')}
              description={t('noHistoryDesc')}
              actionLabel={t('browseMovies')}
              actionHref="/movies"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {allRentals.map((rental) => (
                <RentalCard key={rental.id} rental={rental} />
              ))}
            </div>
          )
        )}
    </ProfilePageLayout>
  );
}
