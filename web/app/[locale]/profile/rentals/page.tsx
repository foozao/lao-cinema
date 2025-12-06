'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getRentals, type Rental } from '@/lib/api/rentals-client';
import { Link } from '@/i18n/routing';
import { Film, Calendar, Clock, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPosterUrl } from '@/lib/images';

export default function RentalsPage() {
  const { isAuthenticated, anonymousId, isLoading: authLoading } = useAuth();
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
        const data = await getRentals();
        setRentals(data.rentals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rentals');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRentals();
  }, [isAuthenticated, anonymousId, authLoading, router]);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) <= new Date();
  };
  
  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }
    
    return `${hours}h ${minutes}m remaining`;
  };
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
            ← Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Rentals</h1>
          <p className="text-gray-600 mt-2">View your rental history and active rentals</p>
        </div>
        
        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        
        {/* Anonymous User Notice */}
        {!isAuthenticated && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Viewing anonymous rentals.</strong> Sign in to sync your rentals across devices.
            </p>
          </div>
        )}
        
        {/* Rentals List */}
        {rentals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Film className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No rentals yet</h2>
            <p className="text-gray-600 mb-6">
              Rent a movie to start watching. Rentals are valid for 24 hours.
            </p>
            <Link href="/movies">
              <Button>Browse Movies</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rentals.map((rental) => {
              const expired = isExpired(rental.expiresAt);
              
              return (
                <div
                  key={rental.id}
                  className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                    expired ? 'border-gray-200 opacity-75' : 'border-green-200'
                  }`}
                >
                  <div className="flex gap-6">
                    {/* Movie Poster */}
                    {rental.moviePosterPath && (
                      <div className="flex-shrink-0">
                        <img
                          src={getPosterUrl(rental.moviePosterPath, 'small') || ''}
                          alt={rental.movieTitle || 'Movie poster'}
                          className="w-24 h-36 object-cover rounded-md"
                        />
                      </div>
                    )}
                    
                    {/* Rental Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">
                            {rental.movieTitle || 'Movie'}
                          </h3>
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            expired 
                              ? 'bg-gray-100 text-gray-600' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {expired ? 'Expired' : 'Active'}
                          </div>
                        </div>
                        {!expired && (
                          <Link href={`/movies/${rental.movieId}/watch`}>
                            <Button size="sm">Watch Now</Button>
                          </Link>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Purchased: {formatDate(rental.purchasedAt)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span className={expired ? 'text-red-600' : 'text-green-600'}>
                            {getTimeRemaining(rental.expiresAt)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-600">
                          <CreditCard className="h-4 w-4" />
                          <span>
                            {rental.amount / 100} {rental.currency} · {rental.paymentMethod}
                          </span>
                        </div>
                        
                        <div className="text-gray-500 text-xs">
                          Expires: {formatDate(rental.expiresAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Stats */}
        {rentals.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {rentals.length}
                </p>
                <p className="text-sm text-gray-600">Total Rentals</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {rentals.filter(r => !isExpired(r.expiresAt)).length}
                </p>
                <p className="text-sm text-gray-600">Active Rentals</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">
                  {rentals.filter(r => isExpired(r.expiresAt)).length}
                </p>
                <p className="text-sm text-gray-600">Expired Rentals</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
