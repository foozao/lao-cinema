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
      const valid = await isRentalValid(movieId);
      setHasValidRental(valid);
      
      if (valid) {
        const time = await getFormattedRemainingTime(movieId);
        setRemainingTime(time);
        setRecentlyExpired(null);
        
        // Check if this is a pack rental and get pack name
        try {
          const rentalStatus = await getRentalStatus(movieId);
          if (rentalStatus.rental && rentalStatus.rental.shortPackId && packs.length > 0) {
            const pack = packs.find(p => p.id === rentalStatus.rental!.shortPackId);
            if (pack) {
              setRentalPackName(getLocalizedText(pack.title, locale));
            }
          } else {
            setRentalPackName(null);
          }
        } catch (err) {
          console.error('Failed to check rental pack:', err);
        }
      } else {
        // Check if rental recently expired
        const expired = await getRecentlyExpiredRental(movieId);
        setRecentlyExpired(expired);
        setRentalPackName(null);
      }
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
