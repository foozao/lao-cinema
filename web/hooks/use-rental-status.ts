'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { getLocalizedText } from '@/lib/i18n';
import { isRentalValid, getFormattedRemainingTime, getRecentlyExpiredRental } from '@/lib/rental-service';
import { getRentalStatus } from '@/lib/api/rentals-client';
import { useAuth } from '@/lib/auth';

export interface RentalStatusResult {
  /** Whether the user has a valid (non-expired) rental */
  hasValidRental: boolean;
  /** Human-readable remaining time (e.g., "23 hours") */
  remainingTime: string;
  /** Info about recently expired rental, if any */
  recentlyExpired: { expiredAt: Date } | null;
  /** Name of the pack if this is a pack rental */
  rentalPackName: string | null;
  /** Whether the status is still loading */
  isLoading: boolean;
  /** Refresh the rental status */
  refresh: () => Promise<void>;
}

interface PackInfo {
  id: string;
  title: { en: string; lo?: string };
}

/**
 * Hook to manage rental status for a movie.
 * 
 * Checks rental validity on mount and refreshes every minute.
 * Handles both direct rentals and pack rentals.
 * 
 * @param movieId - The movie UUID to check rental for
 * @param packs - Optional array of packs this movie belongs to
 * @returns RentalStatusResult with status and refresh function
 * 
 * @example
 * const { hasValidRental, remainingTime, refresh } = useRentalStatus(movie.id, moviePacks);
 */
export function useRentalStatus(
  movieId: string | null,
  packs: PackInfo[] = []
): RentalStatusResult {
  const locale = useLocale() as 'en' | 'lo';
  const { isLoading: authLoading } = useAuth();
  
  const [hasValidRental, setHasValidRental] = useState(false);
  const [remainingTime, setRemainingTime] = useState('');
  const [recentlyExpired, setRecentlyExpired] = useState<{ expiredAt: Date } | null>(null);
  const [rentalPackName, setRentalPackName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkRental = async () => {
    if (!movieId) {
      setIsLoading(false);
      return;
    }

    try {
      // Single API call - get rental status once and reuse
      const rentalStatus = await getRentalStatus(movieId);
      const { rental, expired, expiredAt } = rentalStatus;
      
      const valid = rental !== null && !expired;
      setHasValidRental(valid);
      
      if (valid && rental) {
        // Calculate remaining time from rental data
        const now = Date.now();
        const expiryTime = new Date(rental.expiresAt).getTime();
        const remaining = expiryTime - now;
        
        // Format remaining time
        if (remaining > 0) {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hours > 0) {
            setRemainingTime(`${hours}h ${minutes}m`);
          } else {
            setRemainingTime(`${minutes}m`);
          }
        } else {
          setRemainingTime('Expired');
        }
        
        setRecentlyExpired(null);
        
        // Check if this is a pack rental and get pack name
        if (rental.shortPackId && packs.length > 0) {
          const pack = packs.find(p => p.id === rental.shortPackId);
          if (pack) {
            setRentalPackName(getLocalizedText(pack.title, locale));
          } else {
            setRentalPackName(null);
          }
        } else {
          setRentalPackName(null);
        }
      } else {
        // Check if rental recently expired (within 12 hours)
        if (expired && expiredAt) {
          const now = Date.now();
          const expiryTime = new Date(expiredAt).getTime();
          const recentlyExpiredWindow = 12 * 60 * 60 * 1000; // 12 hours
          
          if (now < expiryTime + recentlyExpiredWindow) {
            setRecentlyExpired({ expiredAt: new Date(expiredAt) });
          } else {
            setRecentlyExpired(null);
          }
        } else {
          setRecentlyExpired(null);
        }
        
        setRentalPackName(null);
      }
    } catch (err) {
      console.error('Failed to check rental status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to initialize before checking rental
    if (authLoading || !movieId) {
      if (!movieId) setIsLoading(false);
      return;
    }

    checkRental();
    
    // Check every minute to update remaining time
    const interval = setInterval(checkRental, 60000);
    return () => clearInterval(interval);
  }, [movieId, authLoading, packs, locale]);

  return {
    hasValidRental,
    remainingTime,
    recentlyExpired,
    rentalPackName,
    isLoading,
    refresh: checkRental,
  };
}
