/**
 * Custom hook for detecting changes in movie edit form
 * Compares current state with original values to track modifications
 */

import { useState, useEffect } from 'react';
import type { MovieFormData } from './useMovieForm';
import type { ExternalPlatform, Trailer } from '@/lib/types';

export interface CastTranslations {
  [key: string]: {
    character_en: string;
    character_lo: string;
  };
}

export interface CrewTranslations {
  [key: string]: {
    job_en: string;
    job_lo: string;
  };
}

export function useChangeDetection(
  formData: MovieFormData,
  castTranslations: CastTranslations,
  crewTranslations: CrewTranslations,
  externalPlatforms: ExternalPlatform[],
  availabilityStatus: string,
  trailers: Trailer[]
) {
  const [hasChanges, setHasChanges] = useState(false);
  
  // Store original values
  const [originalFormData, setOriginalFormData] = useState<MovieFormData>(formData);
  const [originalCastTranslations, setOriginalCastTranslations] = useState<CastTranslations>(castTranslations);
  const [originalCrewTranslations, setOriginalCrewTranslations] = useState<CrewTranslations>(crewTranslations);
  const [originalExternalPlatforms, setOriginalExternalPlatforms] = useState<ExternalPlatform[]>(externalPlatforms);
  const [originalAvailabilityStatus, setOriginalAvailabilityStatus] = useState<string>(availabilityStatus);
  const [originalTrailers, setOriginalTrailers] = useState<Trailer[]>(trailers);

  // Detect changes by comparing current values to originals
  useEffect(() => {
    // Compare formData
    const formDataChanged = Object.keys(formData).some(
      (key) => formData[key as keyof MovieFormData] !== originalFormData[key as keyof MovieFormData]
    );

    // Compare cast translations
    const castChanged = JSON.stringify(castTranslations) !== JSON.stringify(originalCastTranslations);

    // Compare crew translations
    const crewChanged = JSON.stringify(crewTranslations) !== JSON.stringify(originalCrewTranslations);

    // Compare external platforms
    const platformsChanged = JSON.stringify(externalPlatforms) !== JSON.stringify(originalExternalPlatforms);

    // Compare availability status
    const statusChanged = availabilityStatus !== originalAvailabilityStatus;

    // Compare trailers
    const trailersChanged = JSON.stringify(trailers) !== JSON.stringify(originalTrailers);

    setHasChanges(
      formDataChanged || 
      castChanged || 
      crewChanged || 
      platformsChanged || 
      statusChanged || 
      trailersChanged
    );
  }, [
    formData, 
    castTranslations, 
    crewTranslations, 
    externalPlatforms, 
    availabilityStatus, 
    trailers, 
    originalFormData, 
    originalCastTranslations, 
    originalCrewTranslations, 
    originalExternalPlatforms, 
    originalAvailabilityStatus, 
    originalTrailers
  ]);

  // Function to update original values (call after successful save or sync)
  const updateOriginals = (
    newFormData: MovieFormData,
    newCastTranslations: CastTranslations,
    newCrewTranslations: CrewTranslations,
    newExternalPlatforms: ExternalPlatform[],
    newAvailabilityStatus: string,
    newTrailers: Trailer[]
  ) => {
    setOriginalFormData(newFormData);
    setOriginalCastTranslations({...newCastTranslations});
    setOriginalCrewTranslations({...newCrewTranslations});
    setOriginalExternalPlatforms([...newExternalPlatforms]);
    setOriginalAvailabilityStatus(newAvailabilityStatus);
    setOriginalTrailers([...newTrailers]);
    setHasChanges(false);
  };

  return {
    hasChanges,
    setHasChanges,
    updateOriginals,
  };
}
