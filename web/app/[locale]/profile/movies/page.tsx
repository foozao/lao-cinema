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

type Tab = 'active' | 'history';

export default function MyMoviesPage() {
  const t = useTranslations('profile.myMovies');
  const { user, isAuthenticated, anonymousId, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
  const [allRentals, setAllRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  
  useEffect(() => {
    loadData();
  }, [isAuthenticated, anonymousId, authLoading]);
  
  const loadData = async () => {
    if (authLoading) return;
    
    if (!isAuthenticated && !anonymousId) {
      router.push('/login');
      return;
    }
    
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
              <strong>{t('anonymousNotice')}</strong> {t('signInToSync')}
            </p>
          </div>
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
            <div className="bg-gray-900 rounded-lg shadow-sm p-12 text-center border border-gray-700">
              <Film className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">{t('noRentals')}</p>
              <p className="text-sm text-gray-500 mb-6">
                {t('noRentalsDesc')}
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
              {activeRentals.map((rental) => (
                <RentalCard key={rental.id} rental={rental} />
              ))}
            </div>
          )
        ) : (
          /* Rental History Tab */
          allRentals.length === 0 ? (
            <div className="bg-gray-900 rounded-lg shadow-sm p-12 text-center border border-gray-700">
              <Film className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">{t('noHistory')}</p>
              <p className="text-sm text-gray-500 mb-6">
                {t('noHistoryDesc')}
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
              {allRentals.map((rental) => (
                <RentalCard key={rental.id} rental={rental} />
              ))}
            </div>
          )
        )}
      </div>
      <Footer variant="dark" />
    </div>
  );
}
