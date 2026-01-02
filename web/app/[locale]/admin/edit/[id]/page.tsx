'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SaveSuccessModal } from '@/components/admin/save-success-modal';
import { Save, RefreshCw, AlertCircle, CheckCircle, Bell, Mail, Copy, Check } from 'lucide-react';
import { getLocalizedText } from '@/lib/i18n';
import { useTranslations, useLocale } from 'next-intl';
import { mapTMDBToMovie } from '@/lib/tmdb';
import type { Movie, Trailer, ExternalPlatform } from '@/lib/types';
import { syncMovieFromTMDB, fetchMovieImages } from './actions';
import { movieAPI, castCrewAPI, peopleAPI, movieProductionCompaniesAPI, productionCompaniesAPI } from '@/lib/api/client';
import { getAuthHeaders } from '@/lib/api/auth-headers';
import { useAuth } from '@/lib/auth';
import { EntityHistory } from '@/components/admin/entity-history';
import { sanitizeSlug, getSlugValidationError } from '@/lib/slug-utils';
import { API_BASE_URL } from '@/lib/config';

import { ContentTab } from './components/ContentTab';
import { MediaTab } from './components/MediaTab';
import { CastCrewTab } from './components/CastCrewTab';
import {
  MovieFormData,
  CastTranslations,
  CrewTranslations,
  AvailabilityStatus,
  initialFormData,
  loadFormDataFromMovie,
  buildCastTranslations,
  buildCrewTranslations,
} from './components/types';

export default function EditMoviePage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations();
  const locale = useLocale() as 'en' | 'lo';
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const movieId = params.id as string;
  
  // Core state
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [formData, setFormData] = useState<MovieFormData>(initialFormData);
  const [slugError, setSlugError] = useState<string | null>(null);
  
  // Cast/crew translations state
  const [castTranslations, setCastTranslations] = useState<CastTranslations>({});
  const [crewTranslations, setCrewTranslations] = useState<CrewTranslations>({});
  
  // Media state
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [externalPlatforms, setExternalPlatforms] = useState<ExternalPlatform[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>('auto');
  
  // Genre state
  const [availableGenres, setAvailableGenres] = useState<Array<{ id: number; name: { en?: string; lo?: string }; isVisible: boolean }>>([]);
  
  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [fetchingImages, setFetchingImages] = useState(false);
  
  // Change tracking
  const [hasChanges, setHasChanges] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<MovieFormData>(initialFormData);
  const [originalCastTranslations, setOriginalCastTranslations] = useState<CastTranslations>({});
  const [originalCrewTranslations, setOriginalCrewTranslations] = useState<CrewTranslations>({});
  const [originalTrailers, setOriginalTrailers] = useState<Trailer[]>([]);
  const [originalExternalPlatforms, setOriginalExternalPlatforms] = useState<ExternalPlatform[]>([]);
  const [originalAvailabilityStatus, setOriginalAvailabilityStatus] = useState<AvailabilityStatus>('auto');
  
  // Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSyncResultModal, setShowSyncResultModal] = useState(false);
  const [syncChanges, setSyncChanges] = useState<string[]>([]);
  const [showSubscribersModal, setShowSubscribersModal] = useState(false);
  const [subscribers, setSubscribers] = useState<Array<{
    id: string;
    userId: string;
    email: string;
    displayName: string | null;
    subscribedAt: string;
  }>>([]);
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [subscribersChecked, setSubscribersChecked] = useState(false);

  // Load movie data on mount
  useEffect(() => {
    const loadMovie = async () => {
      try {
        const movie = await movieAPI.getById(movieId);
        setCurrentMovie(movie);
        
        const formDataFromMovie = loadFormDataFromMovie(movie);
        setFormData(formDataFromMovie);
        setOriginalFormData(formDataFromMovie);
        
        const castTrans = buildCastTranslations(movie);
        setCastTranslations(castTrans);
        setOriginalCastTranslations({...castTrans});
        
        const crewTrans = buildCrewTranslations(movie);
        setCrewTranslations(crewTrans);
        setOriginalCrewTranslations({...crewTrans});
        
        const externalPlatformsFromMovie = movie.external_platforms || [];
        setExternalPlatforms(externalPlatformsFromMovie);
        setOriginalExternalPlatforms(externalPlatformsFromMovie);
        
        // Load available genres
        loadAvailableGenres();
        
        const initialStatus = (movie.availability_status || 'auto') as AvailabilityStatus;
        setAvailabilityStatus(initialStatus);
        setOriginalAvailabilityStatus(initialStatus);
        
        // Ensure trailers include thumbnail_url field on initial load
        const initialTrailers = (movie.trailers || []).map((t: any) => ({
          ...t,
          thumbnail_url: t.thumbnail_url || t.thumbnailUrl,
        }));
        setTrailers(initialTrailers);
        setOriginalTrailers([...initialTrailers]);
      } catch (error) {
        console.error('Failed to load movie:', error);
        setSyncError('Failed to load movie from database');
      }
    };

    loadMovie();
  }, [movieId]);
  
  // Load available genres
  const loadAvailableGenres = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/genres`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableGenres(data.genres || []);
      }
    } catch (error) {
      console.error('Failed to load genres:', error);
    }
  };

  // Change detection
  useEffect(() => {
    const formDataChanged = Object.keys(formData).some(
      (key) => formData[key as keyof MovieFormData] !== originalFormData[key as keyof MovieFormData]
    );
    const castChanged = JSON.stringify(castTranslations) !== JSON.stringify(originalCastTranslations);
    const crewChanged = JSON.stringify(crewTranslations) !== JSON.stringify(originalCrewTranslations);
    const platformsChanged = JSON.stringify(externalPlatforms) !== JSON.stringify(originalExternalPlatforms);
    const statusChanged = availabilityStatus !== originalAvailabilityStatus;
    const trailersChanged = JSON.stringify(trailers) !== JSON.stringify(originalTrailers);

    setHasChanges(formDataChanged || castChanged || crewChanged || platformsChanged || statusChanged || trailersChanged);
  }, [formData, castTranslations, crewTranslations, externalPlatforms, availabilityStatus, trailers, 
      originalFormData, originalCastTranslations, originalCrewTranslations, originalExternalPlatforms, 
      originalAvailabilityStatus, originalTrailers]);

  // Check for notification subscribers when status changes to available
  useEffect(() => {
    const checkSubscribers = async () => {
      const wasUnavailable = originalAvailabilityStatus === 'coming_soon' || originalAvailabilityStatus === 'unavailable';
      const nowAvailable = availabilityStatus === 'available' || availabilityStatus === 'external' || availabilityStatus === 'auto';
      
      if (wasUnavailable && nowAvailable && !subscribersChecked && isAdmin) {
        try {
          const response = await fetch(`${API_BASE_URL}/admin/notifications/movies/${movieId}/subscribers`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Send HttpOnly cookies for auth
          });
          if (response.ok) {
            const data = await response.json();
            if (data.subscribers && data.subscribers.length > 0) {
              setSubscribers(data.subscribers);
              setShowSubscribersModal(true);
              setSubscribersChecked(true);
            }
          }
        } catch (err) {
          console.error('Failed to fetch notification subscribers:', err);
        }
      }
      
      if (!nowAvailable) setSubscribersChecked(false);
    };
    
    if (currentMovie) checkSubscribers();
  }, [availabilityStatus, originalAvailabilityStatus, movieId, subscribersChecked, currentMovie, isAdmin]);

  // Form handlers
  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeSlug(e.target.value);
    setFormData((prev) => ({ ...prev, slug: sanitized }));
    setSlugError(getSlugValidationError(sanitized));
  }, []);

  const handleSlugGenerate = useCallback(() => {
    const generated = sanitizeSlug(formData.title_en);
    setFormData((prev) => ({ ...prev, slug: generated }));
    setSlugError(getSlugValidationError(generated));
  }, [formData.title_en]);

  const handleSelectChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // TMDB Sync
  const handleSync = async () => {
    if (!currentMovie?.tmdb_id) {
      setSyncError('This movie does not have a TMDB ID');
      return;
    }

    setSyncing(true);
    setSyncError(null);

    try {
      const result = await syncMovieFromTMDB(currentMovie.tmdb_id);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to sync from TMDB');
      }

      const syncedData = mapTMDBToMovie(result.data, result.credits, result.images, result.videos, currentMovie);

      // Update form with synced data (preserving Lao fields)
      setFormData((prev) => ({
        ...prev,
        title_en: syncedData.title.en,
        overview_en: syncedData.overview.en,
        tagline_en: syncedData.tagline?.en || '',
        runtime: syncedData.runtime?.toString() || '',
        vote_average: syncedData.vote_average?.toString() || '',
        budget: syncedData.budget?.toString() || '',
        revenue: syncedData.revenue?.toString() || '',
        status: syncedData.status || 'Released',
        poster_path: syncedData.poster_path || '',
        backdrop_path: syncedData.backdrop_path || '',
      }));
      
      setTrailers(syncedData.trailers || []);
      setCurrentMovie((prev) => prev ? { ...prev, ...syncedData, images: syncedData.images } : null);

      // Update cast/crew translations
      if (syncedData.cast) {
        const castTrans: CastTranslations = {};
        syncedData.cast.forEach((member) => {
          castTrans[`${member.person.id}`] = {
            character_en: member.character.en || '',
            character_lo: member.character.lo || '',
          };
        });
        setCastTranslations(castTrans);
      }

      if (syncedData.crew) {
        const crewTrans: CrewTranslations = {};
        syncedData.crew.forEach((member) => {
          crewTrans[`${member.person.id}-${member.department}`] = {
            job_en: member.job.en || '',
            job_lo: member.job.lo || '',
          };
        });
        setCrewTranslations(crewTrans);
      }

      // Detect changes
      const changes: string[] = [];
      if (currentMovie.title.en !== syncedData.title.en) changes.push('Title');
      if (currentMovie.overview.en !== syncedData.overview.en) changes.push('Overview');
      if (currentMovie.tagline?.en !== syncedData.tagline?.en) changes.push('Tagline');
      if (currentMovie.runtime !== syncedData.runtime) changes.push('Runtime');
      if ((currentMovie.poster_path || null) !== (syncedData.poster_path || null)) changes.push('Poster');
      if ((currentMovie.backdrop_path || null) !== (syncedData.backdrop_path || null)) changes.push('Backdrop');
      if (currentMovie.cast?.length !== syncedData.cast?.length) changes.push('Cast');
      if (currentMovie.crew?.length !== syncedData.crew?.length) changes.push('Crew');
      if (currentMovie.images?.length !== syncedData.images?.length) changes.push('Images');
      
      setSyncChanges(changes);
      if (changes.length > 0) setHasChanges(true);
      setShowSyncResultModal(true);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to sync from TMDB');
    } finally {
      setSyncing(false);
    }
  };

  // Image handlers
  const handlePrimaryImageChange = async (imageId: string, type: 'poster' | 'backdrop' | 'logo') => {
    if (!currentMovie) return;
    const selected = currentMovie.images?.find((img) => img.id === imageId && img.type === type);
    if (!selected) return;

    if (type === 'poster') setFormData((prev) => ({ ...prev, poster_path: selected.file_path }));
    else if (type === 'backdrop') setFormData((prev) => ({ ...prev, backdrop_path: selected.file_path }));

    setCurrentMovie((prev) => prev ? {
      ...prev,
      images: prev.images?.map((img) => img.type === type ? { ...img, is_primary: img.id === imageId } : img),
    } : null);

    const isTemporaryId = imageId.startsWith('poster-') || imageId.startsWith('backdrop-') || imageId.startsWith('logo-');
    if (!isTemporaryId) {
      try {
        await movieAPI.setPrimaryImage(movieId, imageId, type);
      } catch (error) {
        console.error('Failed to persist primary image:', error);
      }
    }
  };

  const handleFetchImages = async () => {
    if (!currentMovie?.tmdb_id) return;
    
    setFetchingImages(true);
    setSyncError(null);
    
    try {
      const result = await fetchMovieImages(currentMovie.tmdb_id);
      if (!result.success || !result.images) {
        throw new Error(result.error || 'Failed to fetch images from TMDB');
      }

      const mappedImages = [
        ...result.images.posters.map((p, i) => ({
          id: `poster-${i}`, type: 'poster' as const, file_path: p.file_path,
          aspect_ratio: p.aspect_ratio, height: p.height, width: p.width,
          iso_639_1: p.iso_639_1, vote_average: p.vote_average, vote_count: p.vote_count,
          is_primary: i === 0,
        })),
        ...result.images.backdrops.map((b, i) => ({
          id: `backdrop-${i}`, type: 'backdrop' as const, file_path: b.file_path,
          aspect_ratio: b.aspect_ratio, height: b.height, width: b.width,
          iso_639_1: b.iso_639_1, vote_average: b.vote_average, vote_count: b.vote_count,
          is_primary: i === 0,
        })),
        ...result.images.logos.map((l, i) => ({
          id: `logo-${i}`, type: 'logo' as const, file_path: l.file_path,
          aspect_ratio: l.aspect_ratio, height: l.height, width: l.width,
          iso_639_1: l.iso_639_1, vote_average: l.vote_average, vote_count: l.vote_count,
          is_primary: false,
        })),
      ];

      setCurrentMovie((prev) => prev ? { ...prev, images: mappedImages } : null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to fetch images from TMDB');
    } finally {
      setFetchingImages(false);
    }
  };

  const handleImageAdded = async () => {
    const updatedMovie = await movieAPI.getById(movieId);
    setCurrentMovie(updatedMovie);
  };

  const handleImageDeleted = async (imageId: string) => {
    await movieAPI.deleteImage(movieId, imageId);
    const updatedMovie = await movieAPI.getById(movieId);
    setCurrentMovie(updatedMovie);
  };

  const handleAddImage = async (type: 'poster' | 'backdrop', url: string) => {
    try {
      await movieAPI.addImage(movieId, {
        type,
        filePath: url,
        isPrimary: !currentMovie?.images?.some(img => img.type === type && img.is_primary),
      });
      const updatedMovie = await movieAPI.getById(movieId);
      setCurrentMovie(updatedMovie);
    } catch (err) {
      console.error(`Failed to save ${type}:`, err);
    }
  };

  const handleSubtitleUpdate = async () => {
    const updatedMovie = await movieAPI.getById(movieId);
    setCurrentMovie(updatedMovie);
  };

  // Cast/Crew handlers
  const saveCastCrewUpdates = async () => {
    if (!currentMovie) return;
    
    const normalizeLao = (text: string) => text.normalize('NFC');
    
    const updatedCast = currentMovie.cast.map((member) => {
      const trans = castTranslations[`${member.person.id}`];
      return {
        person: member.person,
        character: {
          en: trans?.character_en || member.character.en || '',
          lo: trans?.character_lo ? normalizeLao(trans.character_lo) : member.character.lo,
        },
        order: member.order,
      };
    });

    const updatedCrew = currentMovie.crew.map((member) => {
      const trans = crewTranslations[`${member.person.id}-${member.department}`];
      return {
        person: member.person,
        job: {
          en: trans?.job_en || member.job.en || '',
          lo: trans?.job_lo ? normalizeLao(trans.job_lo) : member.job.lo,
        },
        department: member.department,
      };
    });
    
    await movieAPI.update(movieId, { cast: updatedCast, crew: updatedCrew });
  };

  const handleAddCast = async (person: { id: number; name: { en?: string; lo?: string } }, characterEn: string, characterLo: string) => {
    await castCrewAPI.addCast(movieId, {
      person_id: person.id,
      character: { en: characterEn || '', lo: characterLo || undefined },
    });
    const updatedMovie = await movieAPI.getById(movieId);
    setCurrentMovie(updatedMovie);
  };

  const handleAddCrew = async (person: { id: number; name: { en?: string; lo?: string } }, department: string, jobEn: string, jobLo: string) => {
    await castCrewAPI.addCrew(movieId, {
      person_id: person.id,
      department,
      job: { en: jobEn || department, lo: jobLo || undefined },
    });
    const updatedMovie = await movieAPI.getById(movieId);
    setCurrentMovie(updatedMovie);
  };

  const handleRemoveCast = async (personId: number) => {
    if (!confirm('Remove this cast member?')) return;
    await castCrewAPI.removeCast(movieId, personId);
    const updatedMovie = await movieAPI.getById(movieId);
    setCurrentMovie(updatedMovie);
  };

  const handleRemoveCrew = async (personId: number, department: string) => {
    if (!confirm('Remove this crew member?')) return;
    await castCrewAPI.removeCrew(movieId, personId, department);
    const updatedMovie = await movieAPI.getById(movieId);
    setCurrentMovie(updatedMovie);
  };

  const handleCreatePersonForCast = async (name: string) => {
    const newPerson = await peopleAPI.create({ name: { en: name }, known_for_department: 'Acting' });
    return newPerson;
  };

  const handleCreatePersonForCrew = async (name: string, department: string) => {
    const newPerson = await peopleAPI.create({ name: { en: name }, known_for_department: department });
    return newPerson;
  };

  // Production company handlers
  const handleAddProductionCompany = async (company: { id: number; name: { en?: string; lo?: string } }) => {
    await movieProductionCompaniesAPI.add(movieId, { company_id: company.id });
    const updatedMovie = await movieAPI.getById(movieId);
    setCurrentMovie(updatedMovie);
  };

  const handleCreateProductionCompany = async (name: string) => {
    const newCompany = await productionCompaniesAPI.create({ name: { en: name } });
    await movieProductionCompaniesAPI.add(movieId, { company_id: newCompany.id });
    const updatedMovie = await movieAPI.getById(movieId);
    setCurrentMovie(updatedMovie);
  };

  const handleRemoveProductionCompany = async (companyId: number) => {
    await movieProductionCompaniesAPI.remove(movieId, companyId);
    const updatedMovie = await movieAPI.getById(movieId);
    setCurrentMovie(updatedMovie);
  };

  // Genre management handlers
  const handleAddGenre = async (genreId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/movies/${movieId}/genres`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ genreId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add genre');
      }
      
      const updatedMovie = await movieAPI.getById(movieId);
      setCurrentMovie(updatedMovie);
    } catch (error) {
      console.error('Failed to add genre:', error);
      alert('Failed to add genre');
    }
  };
  
  const handleRemoveGenre = async (genreId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/movies/${movieId}/genres/${genreId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove genre');
      }
      
      const updatedMovie = await movieAPI.getById(movieId);
      setCurrentMovie(updatedMovie);
    } catch (error) {
      console.error('Failed to remove genre:', error);
      alert('Failed to remove genre');
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.slug && slugError) {
      alert('Please fix the slug error before saving.');
      return;
    }
    
    try {
      const normalizeLao = (text: string) => text.normalize('NFC');
      
      const updatedCast = currentMovie?.cast.map((member) => {
        const trans = castTranslations[`${member.person.id}`];
        return {
          person: member.person,
          character: {
            en: trans?.character_en || member.character.en || '',
            lo: trans?.character_lo ? normalizeLao(trans.character_lo) : member.character.lo,
          },
          order: member.order,
        };
      }) || [];

      const updatedCrew = currentMovie?.crew.map((member) => {
        const trans = crewTranslations[`${member.person.id}-${member.department}`];
        return {
          person: member.person,
          job: {
            en: trans?.job_en || member.job.en || '',
            lo: trans?.job_lo ? normalizeLao(trans.job_lo) : member.job.lo,
          },
          department: member.department,
        };
      }) || [];
      
      const updateData = {
        title: { en: formData.title_en, lo: formData.title_lo ? normalizeLao(formData.title_lo) : undefined },
        overview: { en: formData.overview_en, lo: formData.overview_lo ? normalizeLao(formData.overview_lo) : undefined },
        tagline: (formData.tagline_en || formData.tagline_lo) ? {
          en: formData.tagline_en || '',
          lo: formData.tagline_lo ? normalizeLao(formData.tagline_lo) : undefined,
        } : undefined,
        slug: formData.slug || undefined,
        type: formData.type,
        release_date: formData.release_date,
        runtime: formData.runtime ? parseInt(formData.runtime) : undefined,
        poster_path: formData.poster_path || undefined,
        backdrop_path: formData.backdrop_path || undefined,
        // Note: trailers are managed separately via their own endpoints (add/delete/reorder/select-thumbnail)
        // Don't include them here to avoid overwriting thumbnail_url and other trailer-specific fields
        // trailers: trailers.length > 0 ? trailers : undefined,
        video_sources: (formData.video_url || formData.has_burned_subtitles || formData.video_aspect_ratio) ? [{
          id: '1',
          url: formData.video_url || '',
          format: formData.video_format as 'hls' | 'mp4',
          quality: formData.video_quality as any,
          aspect_ratio: formData.video_aspect_ratio || undefined,
          has_burned_subtitles: formData.has_burned_subtitles === true || formData.has_burned_subtitles === 'true',
          burned_subtitles_language: formData.burned_subtitles_language || undefined,
        }] : [],
        cast: updatedCast,
        crew: updatedCrew,
        images: currentMovie?.images,
        external_platforms: externalPlatforms,
        availability_status: availabilityStatus || 'auto',
        production_companies: currentMovie?.production_companies,
      };

      await movieAPI.update(movieId, updateData);
      
      const updatedMovie = await movieAPI.getById(movieId);
      setCurrentMovie(updatedMovie);
      
      // Reload form data from updated movie to ensure type consistency
      const updatedFormData = loadFormDataFromMovie(updatedMovie);
      setFormData(updatedFormData);
      setOriginalFormData(updatedFormData);
      
      // Reload translations from updated movie
      const updatedCastTrans = buildCastTranslations(updatedMovie);
      const updatedCrewTrans = buildCrewTranslations(updatedMovie);
      setCastTranslations(updatedCastTrans);
      setCrewTranslations(updatedCrewTrans);
      setOriginalCastTranslations(updatedCastTrans);
      setOriginalCrewTranslations(updatedCrewTrans);
      
      // Ensure trailers include thumbnail_url field
      const updatedTrailers = (updatedMovie.trailers || []).map((t: any) => ({
        ...t,
        thumbnail_url: t.thumbnail_url || t.thumbnailUrl,
      }));
      setTrailers(updatedTrailers);
      setOriginalTrailers(updatedTrailers);
      setOriginalExternalPlatforms([...externalPlatforms]);
      setOriginalAvailabilityStatus(availabilityStatus);
      setSubscribersChecked(false);
      
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to update movie:', error);
      alert('Failed to update movie. Please try again.');
    }
  };

  return (
    <div>
      <Tabs defaultValue="content" className="space-y-6">
        {/* Sticky Header */}
        <div className="sticky top-[104px] z-[5] bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-2 pb-4 border-b border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Editing: <span className="text-gray-700">{currentMovie ? getLocalizedText(currentMovie.title, 'en') : 'Loading...'}</span>
            </h2>
            <div className="flex gap-2 flex-shrink-0">
              {currentMovie?.tmdb_id && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing}
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'TMDB Sync'}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin')}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <span title={!hasChanges ? 'No changes to save' : ''}>
                <Button 
                  type="submit" 
                  form="edit-movie-form" 
                  disabled={!hasChanges}
                  className={!hasChanges ? 'cursor-not-allowed' : 'cursor-pointer'}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update
                </Button>
              </span>
            </div>
          </div>

          {syncError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Sync Error</p>
                <p className="text-sm text-red-600">{syncError}</p>
              </div>
            </div>
          )}

          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content" className="cursor-pointer">Content</TabsTrigger>
            <TabsTrigger value="media" className="cursor-pointer">Video & Images</TabsTrigger>
            <TabsTrigger value="cast" className="cursor-pointer">Cast & Crew</TabsTrigger>
          </TabsList>
        </div>

        <form id="edit-movie-form" onSubmit={handleSubmit}>
          <TabsContent value="content">
            <ContentTab
              formData={formData}
              slugError={slugError}
              isAdmin={isAdmin}
              externalPlatforms={externalPlatforms}
              availabilityStatus={availabilityStatus}
              locale={locale}
              onFormChange={handleFormChange}
              onSlugChange={handleSlugChange}
              onSlugGenerate={handleSlugGenerate}
              onSelectChange={handleSelectChange}
              onExternalPlatformsChange={setExternalPlatforms}
              onAvailabilityStatusChange={setAvailabilityStatus}
            />
          </TabsContent>

          <TabsContent value="media">
            <MediaTab
              formData={formData}
              currentMovie={currentMovie}
              movieId={movieId}
              trailers={trailers}
              fetchingImages={fetchingImages}
              onFormChange={handleFormChange}
              onSelectChange={handleSelectChange}
              onTrailersChange={setTrailers}
              onPrimaryImageChange={handlePrimaryImageChange}
              onFetchImages={handleFetchImages}
              onImageAdded={handleImageAdded}
              onImageDeleted={handleImageDeleted}
              onAddImage={handleAddImage}
              onSubtitleUpdate={handleSubtitleUpdate}
              setHasChanges={setHasChanges}
            />
          </TabsContent>

          <TabsContent value="cast">
            <CastCrewTab
              currentMovie={currentMovie}
              castTranslations={castTranslations}
              crewTranslations={crewTranslations}
              onCastTranslationsChange={setCastTranslations}
              onCrewTranslationsChange={setCrewTranslations}
              onAddCast={handleAddCast}
              onAddCrew={handleAddCrew}
              onRemoveCast={handleRemoveCast}
              onRemoveCrew={handleRemoveCrew}
              onCreatePersonForCast={handleCreatePersonForCast}
              onCreatePersonForCrew={handleCreatePersonForCrew}
              onAddProductionCompany={handleAddProductionCompany}
              onCreateProductionCompany={handleCreateProductionCompany}
              onRemoveProductionCompany={handleRemoveProductionCompany}
              onAddGenre={handleAddGenre}
              onRemoveGenre={handleRemoveGenre}
              availableGenres={availableGenres}
              onSaveCastCrewUpdates={saveCastCrewUpdates}
            />
          </TabsContent>
        </form>
      </Tabs>

      {/* Change History (Admin Only) */}
      <EntityHistory entityType="movie" entityId={movieId} />

      {/* Success Modal */}
      <SaveSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        title="Movie Updated Successfully!"
        description="Your changes have been saved. The movie data has been refreshed with the latest updates."
        onKeepEditing={() => setShowSuccessModal(false)}
        onBackToList={() => router.push('/admin')}
        backToListLabel="Back to Movies"
      />

      {/* Sync Result Modal */}
      <Dialog open={showSyncResultModal} onOpenChange={setShowSyncResultModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${syncChanges.length > 0 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {syncChanges.length > 0 ? <RefreshCw className="h-6 w-6 text-blue-600" /> : <CheckCircle className="h-6 w-6 text-gray-600" />}
              </div>
              <DialogTitle className="text-xl">
                {syncChanges.length > 0 ? 'TMDB Sync Complete' : 'No Updates Available'}
              </DialogTitle>
            </div>
            <div className="text-sm text-muted-foreground">
              {syncChanges.length > 0 ? (
                <div className="space-y-3">
                  <p>The following fields were updated from TMDB:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {syncChanges.map((change) => <li key={change}>{change}</li>)}
                  </ul>
                  <p className="text-sm font-medium text-blue-600 mt-4">
                    Remember to click "Update Movie" to save these changes.
                  </p>
                </div>
              ) : (
                <p>This movie is already up to date with the latest TMDB data. No changes were detected.</p>
              )}
            </div>
          </DialogHeader>
          <div className="mt-4">
            <Button onClick={() => setShowSyncResultModal(false)} className="w-full">OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Subscribers Preview Modal */}
      <Dialog open={showSubscribersModal} onOpenChange={setShowSubscribersModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <DialogTitle className="text-xl">Users Waiting for This Movie</DialogTitle>
            </div>
            <DialogDescription>
              {subscribers.length} user{subscribers.length !== 1 ? 's' : ''} requested to be notified when this movie becomes available.
              You'll need to notify them manually after saving.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Email Addresses</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(subscribers.map(s => s.email).join(', '));
                    setCopiedEmails(true);
                    setTimeout(() => setCopiedEmails(false), 2000);
                  }}
                >
                  {copiedEmails ? <><Check className="w-4 h-4 mr-1" />Copied!</> : <><Copy className="w-4 h-4 mr-1" />Copy All</>}
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {subscribers.map((sub) => (
                    <li key={sub.id} className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-900">{sub.email}</span>
                      {sub.displayName && <span className="text-gray-500">({sub.displayName})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <p className="text-sm text-gray-500">
              Copy these emails now, then click "Update" to save your changes. You can mark them as notified after you've contacted them.
            </p>
          </div>
          
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={() => setShowSubscribersModal(false)} className="w-full">Got It</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
