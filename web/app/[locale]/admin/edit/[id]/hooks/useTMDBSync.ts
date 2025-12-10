/**
 * Custom hook for TMDB synchronization logic
 * Handles fetching and merging TMDB data with existing movie data
 */

import { useState, useCallback } from 'react';
import { mapTMDBToMovie } from '@/lib/tmdb';
import { syncMovieFromTMDB } from '../actions';
import type { Movie } from '@/lib/types';
import type { CastTranslations, CrewTranslations } from './useChangeDetection';

export function useTMDBSync() {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncChanges, setSyncChanges] = useState<string[]>([]);
  const [showSyncResultModal, setShowSyncResultModal] = useState(false);

  const detectChanges = useCallback((currentMovie: Movie, syncedData: Partial<Movie>): string[] => {
    const changes: string[] = [];
    
    // Editable text fields
    if (syncedData.title && currentMovie.title.en !== syncedData.title.en) changes.push('Title');
    if (syncedData.overview && currentMovie.overview.en !== syncedData.overview.en) changes.push('Overview');
    if (currentMovie.tagline?.en !== syncedData.tagline?.en) changes.push('Tagline');
    if (currentMovie.runtime !== syncedData.runtime) changes.push('Runtime');
    
    // Image paths (editable via poster manager)
    const normalizePath = (path: string | null | undefined) => path || null;
    if (normalizePath(currentMovie.poster_path) !== normalizePath(syncedData.poster_path)) {
      changes.push('Poster');
    }
    if (normalizePath(currentMovie.backdrop_path) !== normalizePath(syncedData.backdrop_path)) {
      changes.push('Backdrop');
    }
    
    // Trailers - compare by YouTube keys to avoid false positives
    const currentTrailerKeys = (currentMovie.trailers || [])
      .filter(t => t.type === 'youtube')
      .map(t => t.key)
      .sort()
      .join(',');
    const syncedTrailerKeys = (syncedData.trailers || [])
      .filter(t => t.type === 'youtube')
      .map(t => t.key)
      .sort()
      .join(',');
    if (currentTrailerKeys !== syncedTrailerKeys) changes.push('Trailers');
    
    // Cast/Crew (editable via add/remove buttons)
    if (currentMovie.cast?.length !== syncedData.cast?.length) changes.push('Cast');
    if (currentMovie.crew?.length !== syncedData.crew?.length) changes.push('Crew');
    
    // Images (editable via poster manager)
    if (currentMovie.images?.length !== syncedData.images?.length) changes.push('Images');
    
    return changes;
  }, []);

  const handleSync = useCallback(async (
    currentMovie: Movie | null,
    onSuccess: (syncedData: Partial<Movie>, castTrans: CastTranslations, crewTrans: CrewTranslations) => void
  ) => {
    if (!currentMovie?.tmdb_id) {
      setSyncError('This movie does not have a TMDB ID');
      return null;
    }

    setSyncing(true);
    setSyncError(null);

    try {
      // Fetch latest data from TMDB via Server Action
      const result = await syncMovieFromTMDB(currentMovie.tmdb_id);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to sync from TMDB');
      }

      const tmdbData = result.data;
      const credits = result.credits;
      const images = result.images;
      const videos = result.videos;
      
      // Map to our schema, preserving Lao translations
      const syncedData = mapTMDBToMovie(tmdbData, credits, images, videos, currentMovie);

      // Build cast translations
      const castTrans: CastTranslations = {};
      if (syncedData.cast) {
        syncedData.cast.forEach((member) => {
          const key = `${member.person.id}`;
          castTrans[key] = {
            character_en: member.character.en || '',
            character_lo: member.character.lo || '',
          };
        });
      }

      // Build crew translations
      const crewTrans: CrewTranslations = {};
      if (syncedData.crew) {
        syncedData.crew.forEach((member) => {
          const key = `${member.person.id}-${member.department}`;
          crewTrans[key] = {
            job_en: member.job.en || '',
            job_lo: member.job.lo || '',
          };
        });
      }

      // Detect what changed
      const changes = detectChanges(currentMovie, syncedData);
      setSyncChanges(changes);
      
      // Show sync result modal
      setShowSyncResultModal(true);
      
      // Call success callback with synced data
      onSuccess(syncedData, castTrans, crewTrans);
      
      return syncedData;
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to sync from TMDB');
      return null;
    } finally {
      setSyncing(false);
    }
  }, [detectChanges]);

  return {
    syncing,
    syncError,
    syncChanges,
    showSyncResultModal,
    setShowSyncResultModal,
    handleSync,
  };
}
