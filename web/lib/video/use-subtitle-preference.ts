/**
 * Smart Subtitle Preference Hook
 * 
 * Handles automatic subtitle selection based on:
 * 1. User's preferred subtitle language (from profile)
 * 2. Movie's burned-in subtitles
 * 3. Movie's original language
 * 
 * Logic:
 * - If movie has burned-in subs matching user's preferred language → OFF
 * - If movie language ≠ user's preferred AND matching subtitle exists → enable it
 * - If user has no preference + selects a subtitle → save as their preference
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, authApi } from '@/lib/auth';

interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
  url: string;
  isDefault: boolean;
  kind: 'subtitles' | 'captions' | 'descriptions';
}

interface UseSubtitlePreferenceOptions {
  subtitles: SubtitleTrack[];
  movieLanguage?: string;
  hasBurnedSubtitles?: boolean;
  burnedSubtitlesLanguage?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

interface UseSubtitlePreferenceReturn {
  activeSubtitleId: string | null;
  setActiveSubtitle: (trackId: string | null) => void;
  shouldAutoEnable: boolean;
}

// localStorage keys for anonymous users
const ANON_SUBTITLE_PREF_KEY = 'lao_cinema_subtitle_preference';
const ANON_ALWAYS_SHOW_KEY = 'lao_cinema_always_show_subtitles';

export function useSubtitlePreference({
  subtitles,
  movieLanguage,
  hasBurnedSubtitles = false,
  burnedSubtitlesLanguage,
  videoRef,
}: UseSubtitlePreferenceOptions): UseSubtitlePreferenceReturn {
  const { user, refreshUser } = useAuth();
  const [activeSubtitleId, setActiveSubtitleIdState] = useState<string | null>(null);
  const [shouldAutoEnable, setShouldAutoEnable] = useState(false);
  const hasAppliedDefault = useRef(false);
  const isFirstSelection = useRef(true);

  // Get preferred language from user profile or localStorage (for anonymous)
  const getPreferredLanguage = useCallback((): string | null => {
    if (user?.preferredSubtitleLanguage) {
      return user.preferredSubtitleLanguage;
    }
    // Check localStorage for anonymous users
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ANON_SUBTITLE_PREF_KEY);
    }
    return null;
  }, [user]);

  // Get alwaysShowSubtitles setting from user profile or localStorage
  const getAlwaysShowSubtitles = useCallback((): boolean => {
    if (user?.alwaysShowSubtitles !== undefined) {
      return user.alwaysShowSubtitles;
    }
    // Check localStorage for anonymous users
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ANON_ALWAYS_SHOW_KEY);
      return stored === 'true';
    }
    return false;
  }, [user]);

  // Save preference (to API for logged-in users, localStorage for anonymous)
  const savePreference = useCallback(async (language: string) => {
    if (user) {
      try {
        await authApi.updateProfile({ preferredSubtitleLanguage: language });
        await refreshUser();
      } catch (err) {
        console.error('Failed to save subtitle preference:', err);
      }
    } else {
      // Save to localStorage for anonymous users
      if (typeof window !== 'undefined') {
        localStorage.setItem(ANON_SUBTITLE_PREF_KEY, language);
      }
    }
  }, [user, refreshUser]);

  // Apply subtitle selection to video element
  const applySubtitleToVideo = useCallback((trackId: string | null) => {
    const video = videoRef.current;
    if (!video) return;

    // Disable all tracks first
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = 'disabled';
    }

    // Enable the selected track
    if (trackId) {
      const trackIndex = subtitles.findIndex(s => s.id === trackId);
      if (trackIndex >= 0 && video.textTracks[trackIndex]) {
        video.textTracks[trackIndex].mode = 'showing';
      }
    }
  }, [videoRef, subtitles]);

  // Set active subtitle with side effects
  const setActiveSubtitle = useCallback(async (trackId: string | null) => {
    setActiveSubtitleIdState(trackId);
    applySubtitleToVideo(trackId);

    const preferredLanguage = getPreferredLanguage();
    const alwaysShow = getAlwaysShowSubtitles();
    
    // Auto-detect: If user enables subtitles for a movie in their preferred language,
    // set alwaysShowSubtitles to true
    if (trackId && preferredLanguage && movieLanguage === preferredLanguage && !alwaysShow) {
      const selectedTrack = subtitles.find(s => s.id === trackId);
      if (selectedTrack && selectedTrack.language === preferredLanguage) {
        // User is enabling subtitles for a movie already in their language
        // This means they want subtitles even when the movie matches their preference
        if (user) {
          try {
            await authApi.updateProfile({ alwaysShowSubtitles: true });
            await refreshUser();
          } catch (err) {
            console.error('Failed to save alwaysShowSubtitles preference:', err);
          }
        } else {
          // Save to localStorage for anonymous users
          if (typeof window !== 'undefined') {
            localStorage.setItem(ANON_ALWAYS_SHOW_KEY, 'true');
          }
        }
      }
    }

    // If this is user's first selection and they had no preference, save it
    if (isFirstSelection.current && !preferredLanguage && trackId) {
      const selectedTrack = subtitles.find(s => s.id === trackId);
      if (selectedTrack) {
        savePreference(selectedTrack.language);
      }
    }
    isFirstSelection.current = false;
  }, [applySubtitleToVideo, getPreferredLanguage, getAlwaysShowSubtitles, savePreference, subtitles, movieLanguage, user, refreshUser]);

  // Smart default selection on mount
  useEffect(() => {
    if (hasAppliedDefault.current || subtitles.length === 0) return;
    
    const preferredLanguage = getPreferredLanguage();
    const alwaysShow = getAlwaysShowSubtitles();
    
    // Case 1: Movie has burned-in subtitles matching user's preferred language
    // → Don't enable any external subtitles (unless alwaysShow is true)
    if (hasBurnedSubtitles && burnedSubtitlesLanguage && preferredLanguage && !alwaysShow) {
      if (burnedSubtitlesLanguage === preferredLanguage) {
        hasAppliedDefault.current = true;
        setShouldAutoEnable(false);
        return;
      }
    }

    // Case 2: User has a preference
    if (preferredLanguage) {
      // If alwaysShow is true, enable subtitles regardless of movie language
      // Otherwise, only enable if movie language is different from user's preference
      const shouldEnableSubtitles = alwaysShow || !movieLanguage || movieLanguage !== preferredLanguage;
      
      if (shouldEnableSubtitles) {
        const matchingTrack = subtitles.find(s => s.language === preferredLanguage);
        if (matchingTrack) {
          hasAppliedDefault.current = true;
          setActiveSubtitleIdState(matchingTrack.id);
          setShouldAutoEnable(true);
          return;
        }
      }
    }

    // Case 3: No user preference - check if movie is in a different language
    // and there's a default subtitle track
    if (!preferredLanguage && movieLanguage) {
      // If movie is not in a common language (not English), auto-enable default subtitle
      const defaultTrack = subtitles.find(s => s.isDefault);
      if (defaultTrack && movieLanguage !== 'en') {
        hasAppliedDefault.current = true;
        setActiveSubtitleIdState(defaultTrack.id);
        setShouldAutoEnable(true);
        return;
      }
    }

    // Case 4: Just use the marked default if no other logic applies
    const defaultTrack = subtitles.find(s => s.isDefault);
    if (defaultTrack) {
      hasAppliedDefault.current = true;
      setActiveSubtitleIdState(defaultTrack.id);
      setShouldAutoEnable(true);
    }
  }, [subtitles, movieLanguage, hasBurnedSubtitles, burnedSubtitlesLanguage, getPreferredLanguage]);

  // Apply subtitle when video is ready and shouldAutoEnable is set
  useEffect(() => {
    if (!shouldAutoEnable || !activeSubtitleId) return;
    
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      applySubtitleToVideo(activeSubtitleId);
    };

    // If video is already loaded, apply immediately
    if (video.readyState >= 1) {
      applySubtitleToVideo(activeSubtitleId);
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [shouldAutoEnable, activeSubtitleId, videoRef, applySubtitleToVideo]);

  return {
    activeSubtitleId,
    setActiveSubtitle,
    shouldAutoEnable,
  };
}
