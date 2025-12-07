'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Save, RefreshCw, AlertCircle, Trash2, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import { getLocalizedText } from '@/lib/i18n';
import { translateCrewJob } from '@/lib/i18n/translate-crew-job';
import { useTranslations } from 'next-intl';
import { mapTMDBToMovie } from '@/lib/tmdb';
import type { Movie, StreamingPlatform, ExternalPlatform } from '@/lib/types';
import { syncMovieFromTMDB, fetchMovieImages } from './actions';
import { movieAPI, castCrewAPI, peopleAPI } from '@/lib/api/client';
import { PosterManager } from '@/components/admin/poster-manager';
import { PersonSearch } from '@/components/admin/person-search';
import { sanitizeSlug, getSlugValidationError } from '@/lib/slug-utils';

export default function EditMoviePage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations();
  const movieId = params.id as string;
  
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [fetchingImages, setFetchingImages] = useState(false);
  const [formData, setFormData] = useState({
    // English fields
    title_en: '',
    overview_en: '',
    tagline_en: '',
    
    // Lao fields
    title_lo: '',
    overview_lo: '',
    tagline_lo: '',
    
    // Common fields
    slug: '',
    original_title: '',
    original_language: 'lo',
    release_date: '',
    runtime: '',
    vote_average: '',
    status: 'Released',
    budget: '',
    revenue: '',
    homepage: '',
    imdb_id: '',
    poster_path: '',
    backdrop_path: '',
    video_url: '',
    video_quality: 'original',
    video_format: 'mp4',
    video_aspect_ratio: '',
  });

  // State for cast/crew translations
  const [castTranslations, setCastTranslations] = useState<Record<string, { character_en: string; character_lo: string }>>({});
  const [crewTranslations, setCrewTranslations] = useState<Record<string, { job_en: string; job_lo: string }>>({});
  const [editingCast, setEditingCast] = useState<string | null>(null);
  const [editingCrew, setEditingCrew] = useState<string | null>(null);
  
  // State for external platforms
  const [externalPlatforms, setExternalPlatforms] = useState<ExternalPlatform[]>([]);
  
  // State for availability status
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'external' | 'unavailable' | 'coming_soon' | ''>('');
  
  // Track if form has been modified
  const [hasChanges, setHasChanges] = useState(false);
  
  // Original values for change detection
  const [originalFormData, setOriginalFormData] = useState(formData);
  const [originalCastTranslations, setOriginalCastTranslations] = useState(castTranslations);
  const [originalCrewTranslations, setOriginalCrewTranslations] = useState(crewTranslations);
  const [originalExternalPlatforms, setOriginalExternalPlatforms] = useState(externalPlatforms);
  const [originalAvailabilityStatus, setOriginalAvailabilityStatus] = useState(availabilityStatus);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // State for adding new cast/crew
  const [showAddCast, setShowAddCast] = useState(false);
  const [showAddCrew, setShowAddCrew] = useState(false);
  const [newCastCharacterEn, setNewCastCharacterEn] = useState('');
  const [newCastCharacterLo, setNewCastCharacterLo] = useState('');
  const [newCrewDepartment, setNewCrewDepartment] = useState('Directing');
  const [newCrewJobEn, setNewCrewJobEn] = useState('');
  const [newCrewJobLo, setNewCrewJobLo] = useState('');
  const [addingCast, setAddingCast] = useState(false);
  const [addingCrew, setAddingCrew] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Load movie data on mount
  useEffect(() => {
    const loadMovie = async () => {
      try {
        const movie = await movieAPI.getById(movieId);
        setCurrentMovie(movie);
        
        setFormData({
          title_en: movie.title.en,
          title_lo: movie.title.lo || '',
          overview_en: movie.overview.en,
          overview_lo: movie.overview.lo || '',
          tagline_en: movie.tagline?.en || '',
          tagline_lo: movie.tagline?.lo || '',
          slug: movie.slug || '',
          original_title: movie.original_title || '',
          original_language: movie.original_language || 'lo',
          release_date: movie.release_date,
          runtime: movie.runtime?.toString() || '',
          vote_average: movie.vote_average?.toString() || '',
          status: movie.status || 'Released',
          budget: movie.budget?.toString() || '',
          revenue: movie.revenue?.toString() || '',
          homepage: movie.homepage || '',
          imdb_id: movie.imdb_id || '',
          poster_path: movie.poster_path || '',
          backdrop_path: movie.backdrop_path || '',
          video_url: movie.video_sources[0]?.url || '',
          video_quality: movie.video_sources[0]?.quality || 'original',
          video_format: movie.video_sources[0]?.format || 'mp4',
          video_aspect_ratio: movie.video_sources[0]?.aspect_ratio || '',
        });

        // Initialize cast translations
        const castTrans: Record<string, { character_en: string; character_lo: string }> = {};
        movie.cast.forEach((member) => {
          const key = `${member.person.id}`;
          castTrans[key] = {
            character_en: member.character.en || '',
            character_lo: member.character.lo || '',
          };
        });
        setCastTranslations(castTrans);

        // Initialize crew translations
        const crewTrans: Record<string, { job_en: string; job_lo: string }> = {};
        movie.crew.forEach((member) => {
          const key = `${member.person.id}-${member.department}`;
          crewTrans[key] = {
            job_en: member.job.en || '',
            job_lo: member.job.lo || '',
          };
        });
        setCrewTranslations(crewTrans);

        // Initialize external platforms
        const initialPlatforms = movie.external_platforms || [];
        setExternalPlatforms(initialPlatforms);

        // Load availability status
        const initialStatus = movie.availability_status || '';
        setAvailabilityStatus(initialStatus);
        
        // Store original values for change detection (must use local variables, not state)
        const initialFormData = {
          title_en: movie.title.en,
          title_lo: movie.title.lo || '',
          overview_en: movie.overview.en,
          overview_lo: movie.overview.lo || '',
          tagline_en: movie.tagline?.en || '',
          tagline_lo: movie.tagline?.lo || '',
          slug: movie.slug || '',
          original_title: movie.original_title || '',
          original_language: movie.original_language || 'lo',
          release_date: movie.release_date,
          runtime: movie.runtime?.toString() || '',
          vote_average: movie.vote_average?.toString() || '',
          status: movie.status || 'Released',
          budget: movie.budget?.toString() || '',
          revenue: movie.revenue?.toString() || '',
          homepage: movie.homepage || '',
          imdb_id: movie.imdb_id || '',
          poster_path: movie.poster_path || '',
          backdrop_path: movie.backdrop_path || '',
          video_url: movie.video_sources[0]?.url || '',
          video_quality: movie.video_sources[0]?.quality || 'original',
          video_format: movie.video_sources[0]?.format || 'mp4',
          video_aspect_ratio: movie.video_sources[0]?.aspect_ratio || '',
        };
        setOriginalFormData(initialFormData);
        setOriginalCastTranslations({...castTrans});
        setOriginalCrewTranslations({...crewTrans});
        setOriginalExternalPlatforms([...initialPlatforms]);
        setOriginalAvailabilityStatus(initialStatus);
      } catch (error) {
        console.error('Failed to load movie:', error);
        setSyncError('Failed to load movie from database');
      }
    };

    loadMovie();
  }, [movieId]);

  // Detect changes by comparing current values to originals
  useEffect(() => {
    // Compare formData
    const formDataChanged = Object.keys(formData).some(
      (key) => formData[key as keyof typeof formData] !== originalFormData[key as keyof typeof originalFormData]
    );

    // Compare cast translations
    const castChanged = JSON.stringify(castTranslations) !== JSON.stringify(originalCastTranslations);

    // Compare crew translations
    const crewChanged = JSON.stringify(crewTranslations) !== JSON.stringify(originalCrewTranslations);

    // Compare external platforms
    const platformsChanged = JSON.stringify(externalPlatforms) !== JSON.stringify(originalExternalPlatforms);

    // Compare availability status
    const statusChanged = availabilityStatus !== originalAvailabilityStatus;

    setHasChanges(formDataChanged || castChanged || crewChanged || platformsChanged || statusChanged);
  }, [formData, castTranslations, crewTranslations, externalPlatforms, availabilityStatus, originalFormData, originalCastTranslations, originalCrewTranslations, originalExternalPlatforms, originalAvailabilityStatus]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Auto-sanitize as user types
    const sanitized = sanitizeSlug(value);
    setFormData((prev) => ({ ...prev, slug: sanitized }));
    
    // Validate
    const error = getSlugValidationError(sanitized);
    setSlugError(error);
  };

  const handleSync = async () => {
    if (!currentMovie?.tmdb_id) {
      setSyncError('This movie does not have a TMDB ID');
      return;
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
      
      // Map to our schema, preserving Lao translations
      // Note: mapper signature is (tmdbData, credits?, images?, existingMovie?)
      const syncedData = mapTMDBToMovie(tmdbData, credits, images, currentMovie);

      // Update form with synced data (preserving Lao fields)
      setFormData((prev) => ({
        ...prev,
        // Update English content from TMDB
        title_en: syncedData.title.en,
        overview_en: syncedData.overview.en,
        tagline_en: syncedData.tagline?.en || '',
        // Preserve Lao content
        title_lo: prev.title_lo,
        overview_lo: prev.overview_lo,
        tagline_lo: prev.tagline_lo,
        // Update metadata
        runtime: syncedData.runtime?.toString() || '',
        vote_average: syncedData.vote_average?.toString() || '',
        budget: syncedData.budget?.toString() || '',
        revenue: syncedData.revenue?.toString() || '',
        status: syncedData.status || 'Released',
        poster_path: syncedData.poster_path || '',
        backdrop_path: syncedData.backdrop_path || '',
      }));

      // Update currentMovie with synced data including images
      setCurrentMovie((prev) => prev ? {
        ...prev,
        ...syncedData,
        images: syncedData.images,
      } : null);

      // Update cast translations state with synced character names
      if (syncedData.cast) {
        const castTrans: Record<string, { character_en: string; character_lo: string }> = {};
        syncedData.cast.forEach((member) => {
          const key = `${member.person.id}`;
          castTrans[key] = {
            character_en: member.character.en || '',
            character_lo: member.character.lo || '',
          };
        });
        setCastTranslations(castTrans);
      }

      // Update crew translations state with synced job titles
      if (syncedData.crew) {
        const crewTrans: Record<string, { job_en: string; job_lo: string }> = {};
        syncedData.crew.forEach((member) => {
          const key = `${member.person.id}-${member.department}`;
          crewTrans[key] = {
            job_en: member.job.en || '',
            job_lo: member.job.lo || '',
          };
        });
        setCrewTranslations(crewTrans);
      }

      // Mark form as changed so user can save
      setHasChanges(true);
      
      alert('Successfully synced from TMDB! English content, metadata, and images updated.\n\nRemember to click "Update Movie" to save these changes.');
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to sync from TMDB');
    } finally {
      setSyncing(false);
    }
  };

  const handlePrimaryImageChange = async (
    imageId: string,
    type: 'poster' | 'backdrop' | 'logo'
  ) => {
    if (!currentMovie) return;
    const selected = currentMovie.images?.find((img) => img.id === imageId && img.type === type);
    if (!selected) return;

    // Update form data with selected image path
    if (type === 'poster') {
      setFormData((prev) => ({ ...prev, poster_path: selected.file_path }));
    } else if (type === 'backdrop') {
      setFormData((prev) => ({ ...prev, backdrop_path: selected.file_path }));
    }

    // Update currentMovie to mark the selected image as primary
    setCurrentMovie((prev) =>
      prev
        ? {
            ...prev,
            images: prev.images?.map((img) =>
              img.type === type
                ? { ...img, is_primary: img.id === imageId }
                : img
            ),
          }
        : null
    );

    // If the image has a real UUID (not temporary ID like "poster-0"), persist to database
    const isTemporaryId = imageId.startsWith('poster-') || imageId.startsWith('backdrop-') || imageId.startsWith('logo-');
    if (!isTemporaryId) {
      try {
        await movieAPI.setPrimaryImage(movieId, imageId, type);
      } catch (error) {
        console.error('Failed to persist primary image:', error);
        // Don't show error to user - it will be saved when they save the form
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

      const images = result.images;
      
      // Map images to MovieImage format
      const mappedImages = [];
      
      images.posters.forEach((poster, index) => {
        mappedImages.push({
          id: `poster-${index}`,
          type: 'poster' as const,
          file_path: poster.file_path,
          aspect_ratio: poster.aspect_ratio,
          height: poster.height,
          width: poster.width,
          iso_639_1: poster.iso_639_1,
          vote_average: poster.vote_average,
          vote_count: poster.vote_count,
          is_primary: index === 0,
        });
      });
      
      images.backdrops.forEach((backdrop, index) => {
        mappedImages.push({
          id: `backdrop-${index}`,
          type: 'backdrop' as const,
          file_path: backdrop.file_path,
          aspect_ratio: backdrop.aspect_ratio,
          height: backdrop.height,
          width: backdrop.width,
          iso_639_1: backdrop.iso_639_1,
          vote_average: backdrop.vote_average,
          vote_count: backdrop.vote_count,
          is_primary: index === 0,
        });
      });
      
      images.logos.forEach((logo, index) => {
        mappedImages.push({
          id: `logo-${index}`,
          type: 'logo' as const,
          file_path: logo.file_path,
          aspect_ratio: logo.aspect_ratio,
          height: logo.height,
          width: logo.width,
          iso_639_1: logo.iso_639_1,
          vote_average: logo.vote_average,
          vote_count: logo.vote_count,
          is_primary: false,
        });
      });

      // Update currentMovie with fetched images
      setCurrentMovie((prev) => prev ? {
        ...prev,
        images: mappedImages,
      } : null);

    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to fetch images from TMDB');
    } finally {
      setFetchingImages(false);
    }
  };

  // Silent save for cast/crew updates
  const saveCastCrewUpdates = async () => {
    if (!currentMovie) return;
    
    try {
      // Normalize Lao text to prevent encoding issues
      const normalizeLao = (text: string) => text.normalize('NFC');
      
      // Prepare cast with updated translations
      const updatedCast = currentMovie.cast.map((member) => {
        const key = `${member.person.id}`;
        const trans = castTranslations[key];
        return {
          person: member.person,
          character: {
            en: trans?.character_en || member.character.en || '',
            lo: trans?.character_lo ? normalizeLao(trans.character_lo) : member.character.lo,
          },
          order: member.order,
        };
      });

      // Prepare crew with updated translations
      const updatedCrew = currentMovie.crew.map((member) => {
        const key = `${member.person.id}-${member.department}`;
        const trans = crewTranslations[key];
        return {
          person: member.person,
          job: {
            en: trans?.job_en || member.job.en || '',
            lo: trans?.job_lo ? normalizeLao(trans.job_lo) : member.job.lo,
          },
          department: member.department,
        };
      });
      
      // Update only cast and crew
      const updateData = {
        cast: updatedCast,
        crew: updatedCrew,
      };

      await movieAPI.update(movieId, updateData);
    } catch (error) {
      console.error('Failed to save cast/crew updates:', error);
    }
  };

  // Handler for adding a new cast member
  const handleAddCast = async (person: { id: number; name: { en?: string; lo?: string } }) => {
    if (!currentMovie) return;
    
    try {
      setAddingCast(true);
      await castCrewAPI.addCast(movieId, {
        person_id: person.id,
        character: {
          en: newCastCharacterEn || '',
          lo: newCastCharacterLo || undefined,
        },
      });
      
      // Reload movie to get updated cast list
      const updatedMovie = await movieAPI.getById(movieId);
      setCurrentMovie(updatedMovie);
      
      // Reset form
      setNewCastCharacterEn('');
      setNewCastCharacterLo('');
    } catch (error) {
      console.error('Failed to add cast member:', error);
      alert('Failed to add cast member');
    } finally {
      setAddingCast(false);
    }
  };

  // Handler for adding a new crew member
  const handleAddCrew = async (person: { id: number; name: { en?: string; lo?: string } }) => {
    if (!currentMovie) return;
    
    try {
      setAddingCrew(true);
      await castCrewAPI.addCrew(movieId, {
        person_id: person.id,
        department: newCrewDepartment,
        job: {
          en: newCrewJobEn || newCrewDepartment,
          lo: newCrewJobLo || undefined,
        },
      });
      
      // Reload movie to get updated crew list
      const updatedMovie = await movieAPI.getById(movieId);
      setCurrentMovie(updatedMovie);
      
      // Reset form
      setNewCrewJobEn('');
      setNewCrewJobLo('');
    } catch (error) {
      console.error('Failed to add crew member:', error);
      alert('Failed to add crew member');
    } finally {
      setAddingCrew(false);
    }
  };

  // Handler for creating a new person and adding as cast
  const handleCreatePersonForCast = async (name: string) => {
    try {
      const newPerson = await peopleAPI.create({
        name: { en: name },
        known_for_department: 'Acting',
      });
      await handleAddCast(newPerson);
    } catch (error) {
      console.error('Failed to create person:', error);
      alert('Failed to create person');
    }
  };

  // Handler for creating a new person and adding as crew
  const handleCreatePersonForCrew = async (name: string) => {
    try {
      const newPerson = await peopleAPI.create({
        name: { en: name },
        known_for_department: newCrewDepartment,
      });
      await handleAddCrew(newPerson);
    } catch (error) {
      console.error('Failed to create person:', error);
      alert('Failed to create person');
    }
  };

  // Handler for removing a cast member
  const handleRemoveCast = async (personId: number) => {
    if (!currentMovie || !confirm('Remove this cast member?')) return;
    
    try {
      await castCrewAPI.removeCast(movieId, personId);
      const updatedMovie = await movieAPI.getById(movieId);
      setCurrentMovie(updatedMovie);
    } catch (error) {
      console.error('Failed to remove cast member:', error);
      alert('Failed to remove cast member');
    }
  };

  // Handler for removing a crew member
  const handleRemoveCrew = async (personId: number, department: string) => {
    if (!currentMovie || !confirm('Remove this crew member?')) return;
    
    try {
      await castCrewAPI.removeCrew(movieId, personId, department);
      const updatedMovie = await movieAPI.getById(movieId);
      setCurrentMovie(updatedMovie);
    } catch (error) {
      console.error('Failed to remove crew member:', error);
      alert('Failed to remove crew member');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate slug before submitting
    if (formData.slug && slugError) {
      alert('Please fix the slug error before saving.');
      return;
    }
    
    try {
      // Normalize Lao text to prevent encoding issues
      const normalizeLao = (text: string) => text.normalize('NFC');
      
      // Prepare cast with updated translations
      const updatedCast = currentMovie?.cast.map((member) => {
        const key = `${member.person.id}`;
        const trans = castTranslations[key];
        return {
          person: member.person,
          character: {
            en: trans?.character_en || member.character.en || '',
            lo: trans?.character_lo ? normalizeLao(trans.character_lo) : member.character.lo,
          },
          order: member.order,
        };
      }) || [];

      // Prepare crew with updated translations
      const updatedCrew = currentMovie?.crew.map((member) => {
        const key = `${member.person.id}-${member.department}`;
        const trans = crewTranslations[key];
        return {
          person: member.person,
          job: {
            en: trans?.job_en || member.job.en || '',
            lo: trans?.job_lo ? normalizeLao(trans.job_lo) : member.job.lo,
          },
          department: member.department,
        };
      }) || [];
      
      // Prepare the update data
      const updateData = {
        title: {
          en: formData.title_en,
          lo: formData.title_lo ? normalizeLao(formData.title_lo) : undefined,
        },
        overview: {
          en: formData.overview_en,
          lo: formData.overview_lo ? normalizeLao(formData.overview_lo) : undefined,
        },
        tagline: (formData.tagline_en || formData.tagline_lo) ? {
          en: formData.tagline_en || '',
          lo: formData.tagline_lo ? normalizeLao(formData.tagline_lo) : undefined,
        } : undefined,
        slug: formData.slug || undefined,
        release_date: formData.release_date,
        runtime: formData.runtime ? parseInt(formData.runtime) : undefined,
        poster_path: formData.poster_path || undefined,
        backdrop_path: formData.backdrop_path || undefined,
        video_sources: formData.video_url ? [{
          id: '1',
          url: formData.video_url,
          format: formData.video_format as 'hls' | 'mp4',
          quality: formData.video_quality as any,
          aspect_ratio: formData.video_aspect_ratio || undefined,
        }] : [],
        cast: updatedCast,
        crew: updatedCrew,
        images: currentMovie?.images, // Include images array
        external_platforms: externalPlatforms,
        availability_status: availabilityStatus || undefined,
      };

      await movieAPI.update(movieId, updateData);
      
      // Reload movie data to show updated values
      const updatedMovie = await movieAPI.getById(movieId);
      setCurrentMovie(updatedMovie);
      
      // Update original values to match current (saved) values
      setOriginalFormData({...formData});
      setOriginalCastTranslations({...castTranslations});
      setOriginalCrewTranslations({...crewTranslations});
      setOriginalExternalPlatforms([...externalPlatforms]);
      setOriginalAvailabilityStatus(availabilityStatus);
      
      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to update movie:', error);
      alert('Failed to update movie. Please try again.');
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
  };

  const handleBackToMovies = () => {
    router.push('/admin');
  };

  return (
    <div>
      <Tabs defaultValue="content" className="space-y-6">
        {/* Sticky Header */}
        <div className="sticky top-16 z-[5] bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-2 pb-4 border-b border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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

        {currentMovie?.tmdb_id && currentMovie.tmdb_last_synced && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>TMDB ID:</strong> {currentMovie.tmdb_id} • 
              <strong className="ml-2">Last synced:</strong>{' '}
              {new Date(currentMovie.tmdb_last_synced).toLocaleDateString()}
            </p>
          </div>
        )}

          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content" className="cursor-pointer">Content</TabsTrigger>
            <TabsTrigger value="media" className="cursor-pointer">Video & Images</TabsTrigger>
            <TabsTrigger value="cast" className="cursor-pointer">Cast & Crew</TabsTrigger>
          </TabsList>
        </div>

        <form id="edit-movie-form" onSubmit={handleSubmit}>

          <TabsContent value="content" className="space-y-6">
          {/* English Content */}
          <Card>
            <CardHeader>
              <CardTitle>English Content (Required)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title_en">Title (English) *</Label>
                <Input
                  id="title_en"
                  name="title_en"
                  value={formData.title_en}
                  onChange={handleChange}
                  required
                  placeholder="Enter movie title in English"
                />
              </div>

              <div>
                <Label htmlFor="overview_en">Overview (English) *</Label>
                <Textarea
                  id="overview_en"
                  name="overview_en"
                  value={formData.overview_en}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Enter movie description in English"
                />
              </div>

              <div>
                <Label htmlFor="tagline_en">Tagline (English)</Label>
                <Input
                  id="tagline_en"
                  name="tagline_en"
                  value={formData.tagline_en}
                  onChange={handleChange}
                  placeholder="A catchy tagline for the movie"
                />
              </div>
            </CardContent>
          </Card>

          {/* Lao Content */}
          <Card>
            <CardHeader>
              <CardTitle>Lao Content (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title_lo">Title (Lao)</Label>
                <Input
                  id="title_lo"
                  name="title_lo"
                  value={formData.title_lo}
                  onChange={handleChange}
                  placeholder="ປ້ອນຊື່ຮູບເງົາເປັນພາສາລາວ"
                />
              </div>

              <div>
                <Label htmlFor="overview_lo">Overview (Lao)</Label>
                <Textarea
                  id="overview_lo"
                  name="overview_lo"
                  value={formData.overview_lo}
                  onChange={handleChange}
                  rows={4}
                  placeholder="ປ້ອນຄໍາອະທິບາຍຮູບເງົາເປັນພາສາລາວ"
                />
              </div>

              <div>
                <Label htmlFor="tagline_lo">Tagline (Lao)</Label>
                <Input
                  id="tagline_lo"
                  name="tagline_lo"
                  value={formData.tagline_lo}
                  onChange={handleChange}
                  placeholder="ປ້ອນຄຳຂວັນຮູບເງົາເປັນພາສາລາວ"
                />
              </div>
            </CardContent>
          </Card>

          {/* Movie Details */}
          <Card>
            <CardHeader>
              <CardTitle>Movie Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="slug">Vanity URL Slug</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const generated = sanitizeSlug(formData.title_en);
                      setFormData((prev) => ({ ...prev, slug: generated }));
                      const error = getSlugValidationError(generated);
                      setSlugError(error);
                    }}
                    className="text-xs"
                  >
                    Generate from title
                  </Button>
                </div>
                <Input
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  placeholder="the-signal"
                  className={slugError ? 'border-red-500' : ''}
                />
                {slugError ? (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {slugError}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Custom URL path for this movie (e.g., &quot;the-signal&quot; → /movies/the-signal). Leave empty to use ID.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="original_title">Original Title</Label>
                  <Input
                    id="original_title"
                    name="original_title"
                    value={formData.original_title}
                    onChange={handleChange}
                    placeholder="Original title (if different)"
                  />
                </div>

                <div>
                  <Label htmlFor="original_language">Original Language</Label>
                  <select
                    id="original_language"
                    name="original_language"
                    value={formData.original_language}
                    onChange={(e) => handleChange(e as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="lo">Lao</option>
                    <option value="en">English</option>
                    <option value="th">Thai</option>
                    <option value="vi">Vietnamese</option>
                    <option value="km">Khmer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="release_date">Release Date *</Label>
                  <Input
                    id="release_date"
                    name="release_date"
                    type="date"
                    value={formData.release_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="runtime">Runtime (minutes) *</Label>
                  <Input
                    id="runtime"
                    name="runtime"
                    type="number"
                    value={formData.runtime}
                    onChange={handleChange}
                    required
                    placeholder="120"
                  />
                </div>

                <div>
                  <Label htmlFor="imdb_id">IMDB ID</Label>
                  <Input
                    id="imdb_id"
                    name="imdb_id"
                    value={formData.imdb_id}
                    onChange={handleChange}
                    placeholder="tt1234567"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          </TabsContent>

          <TabsContent value="media" className="space-y-6">
          {/* Video Source */}
          <Card>
            <CardHeader>
              <CardTitle>Video Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="video_url">Video URL</Label>
                <Input
                  id="video_url"
                  name="video_url"
                  value={formData.video_url}
                  onChange={handleChange}
                  placeholder="/videos/movie.mp4 or https://stream.example.com/video.m3u8"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For local files: upload to /public/videos/ and enter path. For HLS: enter full URL
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="video_format">Format</Label>
                  <select
                    id="video_format"
                    name="video_format"
                    value={formData.video_format}
                    onChange={(e) => handleChange(e as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="mp4">MP4</option>
                    <option value="hls">HLS (.m3u8)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="video_quality">Quality</Label>
                  <select
                    id="video_quality"
                    name="video_quality"
                    value={formData.video_quality}
                    onChange={(e) => handleChange(e as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="original">Original</option>
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="video_aspect_ratio">Aspect Ratio</Label>
                <select
                  id="video_aspect_ratio"
                  name="video_aspect_ratio"
                  value={formData.video_aspect_ratio}
                  onChange={(e) => handleChange(e as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Unknown / Not Set</option>
                  <option value="16:9">16:9 (Widescreen)</option>
                  <option value="4:3">4:3 (Standard)</option>
                  <option value="2.35:1">2.35:1 (Cinemascope)</option>
                  <option value="2.39:1">2.39:1 (Anamorphic)</option>
                  <option value="1.85:1">1.85:1 (Theatrical)</option>
                  <option value="21:9">21:9 (Ultra-wide)</option>
                  <option value="mixed">Mixed (Multiple ratios)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Setting this helps optimize the video player display. Use &quot;16:9&quot; for standard widescreen content.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Availability Status */}
          <Card>
            <CardHeader>
              <CardTitle>Availability Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="availability_status">Status Override (Optional)</Label>
                <select
                  id="availability_status"
                  value={availabilityStatus}
                  onChange={(e) => setAvailabilityStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Auto (based on video sources and external platforms)</option>
                  <option value="available">Available - Movie is on our platform</option>
                  <option value="external">External - Available on external platforms only</option>
                  <option value="unavailable">Unavailable - Not available anywhere</option>
                  <option value="coming_soon">Coming Soon - Will be available soon</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>Auto behavior:</strong>
                  <br />• If video sources exist → Available
                  <br />• If external platforms exist → External
                  <br />• Otherwise → Unavailable
                  <br /><br />
                  Select a specific status to override the automatic behavior.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* External Platforms */}
          <Card>
            <CardHeader>
              <CardTitle>External Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                If this film is not available on Lao Cinema but can be watched on other platforms, add them here. 
                This will hide the Watch button and show where viewers can find the film.
              </p>
              
              {/* Current platforms */}
              {externalPlatforms.length > 0 && (
                <div className="space-y-2">
                  {externalPlatforms.map((platform, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium capitalize flex-1">{platform.platform}</span>
                      <Input
                        value={platform.url || ''}
                        onChange={(e) => {
                          const updated = [...externalPlatforms];
                          updated[index] = { ...updated[index], url: e.target.value };
                          setExternalPlatforms(updated);
                        }}
                        placeholder="URL (optional)"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setExternalPlatforms(externalPlatforms.filter((_, i) => i !== index));
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add platform */}
              <div className="flex items-center gap-3">
                <select
                  id="add-platform"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      const platform = e.target.value as StreamingPlatform;
                      // Don't add if already exists
                      if (!externalPlatforms.some(p => p.platform === platform)) {
                        setExternalPlatforms([...externalPlatforms, { platform }]);
                      }
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">Add platform...</option>
                  <option value="netflix" disabled={externalPlatforms.some(p => p.platform === 'netflix')}>Netflix</option>
                  <option value="prime" disabled={externalPlatforms.some(p => p.platform === 'prime')}>Amazon Prime Video</option>
                  <option value="disney" disabled={externalPlatforms.some(p => p.platform === 'disney')}>Disney+</option>
                  <option value="hbo" disabled={externalPlatforms.some(p => p.platform === 'hbo')}>HBO Max</option>
                  <option value="apple" disabled={externalPlatforms.some(p => p.platform === 'apple')}>Apple TV+</option>
                  <option value="hulu" disabled={externalPlatforms.some(p => p.platform === 'hulu')}>Hulu</option>
                  <option value="other" disabled={externalPlatforms.some(p => p.platform === 'other')}>Other</option>
                </select>
              </div>
              
              {externalPlatforms.length > 0 && (
                <p className="text-xs text-amber-600">
                  ⚠️ Films with external platforms will not show a Watch button on the site.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Poster Management */}
          {currentMovie?.tmdb_id && (
            currentMovie.images && currentMovie.images.length > 0 ? (
              <PosterManager
                images={currentMovie.images}
                movieId={movieId}
                onPrimaryChange={handlePrimaryImageChange}
                onRefresh={handleFetchImages}
                refreshing={fetchingImages}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Poster & Image Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Load posters, backdrops, and logos from TMDB to choose which images to display.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFetchImages}
                    disabled={fetchingImages}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${fetchingImages ? 'animate-spin' : ''}`} />
                    {fetchingImages ? 'Loading Images...' : 'Load Images from TMDB'}
                  </Button>
                </CardContent>
              </Card>
            )
          )}
          </TabsContent>

          <TabsContent value="cast" className="space-y-6">
          {/* Add Cast Member - Collapsible */}
          <Card>
            <CardHeader 
              className="cursor-pointer select-none" 
              onClick={() => setShowAddCast(!showAddCast)}
            >
              <CardTitle className="flex items-center gap-2">
                {showAddCast ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                Add Cast Member
              </CardTitle>
            </CardHeader>
            {showAddCast && (
              <CardContent className="space-y-4">
                <div>
                  <Label>Search for Person</Label>
                  <PersonSearch
                    onSelect={handleAddCast}
                    onCreateNew={handleCreatePersonForCast}
                    placeholder="Search for an actor..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Character Name (English)</Label>
                    <Input
                      value={newCastCharacterEn}
                      onChange={(e) => setNewCastCharacterEn(e.target.value)}
                      placeholder="e.g., John Smith"
                    />
                  </div>
                  <div>
                    <Label>Character Name (Lao)</Label>
                    <Input
                      value={newCastCharacterLo}
                      onChange={(e) => setNewCastCharacterLo(e.target.value)}
                      placeholder="ຊື່ຕົວລະຄອນ"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Search for a person above, then click to add them. The character name will be assigned automatically.
                </p>
              </CardContent>
            )}
          </Card>

          {/* Add Crew Member - Collapsible */}
          <Card>
            <CardHeader 
              className="cursor-pointer select-none" 
              onClick={() => setShowAddCrew(!showAddCrew)}
            >
              <CardTitle className="flex items-center gap-2">
                {showAddCrew ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                Add Crew Member
              </CardTitle>
            </CardHeader>
            {showAddCrew && (
              <CardContent className="space-y-4">
                <div>
                  <Label>Search for Person</Label>
                  <PersonSearch
                    onSelect={handleAddCrew}
                    onCreateNew={handleCreatePersonForCrew}
                    placeholder="Search for a crew member..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Department</Label>
                    <select
                      value={newCrewDepartment}
                      onChange={(e) => setNewCrewDepartment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="Directing">Directing</option>
                      <option value="Writing">Writing</option>
                      <option value="Production">Production</option>
                      <option value="Camera">Camera</option>
                      <option value="Editing">Editing</option>
                      <option value="Sound">Sound</option>
                      <option value="Art">Art</option>
                      <option value="Costume & Make-Up">Costume & Make-Up</option>
                      <option value="Visual Effects">Visual Effects</option>
                      <option value="Crew">Crew</option>
                    </select>
                  </div>
                  <div>
                    <Label>Job Title (English)</Label>
                    <Input
                      value={newCrewJobEn}
                      onChange={(e) => setNewCrewJobEn(e.target.value)}
                      placeholder="e.g., Director"
                    />
                  </div>
                  <div>
                    <Label>Job Title (Lao)</Label>
                    <Input
                      value={newCrewJobLo}
                      onChange={(e) => setNewCrewJobLo(e.target.value)}
                      placeholder="ຕຳແໜ່ງ"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Search for a person above, then click to add them with the selected department and job title.
                </p>
              </CardContent>
            )}
          </Card>

          {/* Existing Cast & Crew */}
          {currentMovie && (currentMovie.cast.length > 0 || currentMovie.crew.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Current Cast & Crew</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cast */}
                {currentMovie.cast.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Cast ({currentMovie.cast.length})</h3>
                    <div className="space-y-3">
                      {currentMovie.cast.map((member, index) => {
                        const key = `${member.person.id}`;
                        const isEditing = editingCast === key;
                        const trans = castTranslations[key] || { character_en: member.character.en || '', character_lo: member.character.lo || '' };
                        
                        return (
                          <div key={`cast-${member.person.id}-${index}`} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start gap-3">
                              {member.person.profile_path && (
                                <img
                                  src={`https://image.tmdb.org/t/p/w92${member.person.profile_path}`}
                                  alt={getLocalizedText(member.person.name, 'en')}
                                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm mb-1">
                                  {getLocalizedText(member.person.name, 'en')}
                                </p>
                                {!isEditing ? (
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium">EN:</span> {trans.character_en || '(not set)'}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium">LO:</span> {trans.character_lo || '(not set)'}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2 mt-2">
                                    <div>
                                      <Label className="text-xs">Character (English)</Label>
                                      <Input
                                        value={trans.character_en}
                                        onChange={(e) => {
                                          setCastTranslations(prev => ({
                                            ...prev,
                                            [key]: { ...prev[key], character_en: e.target.value }
                                          }));
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setEditingCast(null);
                                            saveCastCrewUpdates();
                                          }
                                        }}
                                        placeholder="Character name in English"
                                        className="text-xs h-8"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Character (Lao)</Label>
                                      <Input
                                        value={trans.character_lo}
                                        onChange={(e) => {
                                          setCastTranslations(prev => ({
                                            ...prev,
                                            [key]: { ...prev[key], character_lo: e.target.value }
                                          }));
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setEditingCast(null);
                                            saveCastCrewUpdates();
                                          }
                                        }}
                                        placeholder="ຊື່ຕົວລະຄອນເປັນພາສາລາວ"
                                        className="text-xs h-8"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Link href={`/admin/people/${member.person.id}`}>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                  >
                                    View Person
                                  </Button>
                                </Link>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (isEditing) {
                                      saveCastCrewUpdates();
                                    }
                                    setEditingCast(isEditing ? null : key);
                                  }}
                                >
                                  {isEditing ? 'Done' : 'Edit Role'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleRemoveCast(member.person.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Crew */}
                {currentMovie.crew.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Crew ({currentMovie.crew.length})</h3>
                    <div className="space-y-3">
                      {currentMovie.crew.map((member, index) => {
                        const key = `${member.person.id}-${member.department}`;
                        const isEditing = editingCrew === key;
                        const trans = crewTranslations[key] || { job_en: member.job.en || '', job_lo: member.job.lo || '' };
                        
                        return (
                          <div key={`crew-${member.person.id}-${index}`} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start gap-3">
                              {member.person.profile_path && (
                                <img
                                  src={`https://image.tmdb.org/t/p/w92${member.person.profile_path}`}
                                  alt={getLocalizedText(member.person.name, 'en')}
                                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm mb-1">
                                  {getLocalizedText(member.person.name, 'en')}
                                </p>
                                <p className="text-xs text-gray-500 mb-1">
                                  {member.department}
                                </p>
                                {!isEditing ? (
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium">EN:</span> {trans.job_en || '(not set)'}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium">LO:</span> {trans.job_lo || '(not set)'}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2 mt-2">
                                    <div>
                                      <Label className="text-xs">Job Title (English)</Label>
                                      <Input
                                        value={trans.job_en}
                                        onChange={(e) => {
                                          setCrewTranslations(prev => ({
                                            ...prev,
                                            [key]: { ...prev[key], job_en: e.target.value }
                                          }));
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setEditingCrew(null);
                                            saveCastCrewUpdates();
                                          }
                                        }}
                                        placeholder="Job title in English"
                                        className="text-xs h-8"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Job Title (Lao)</Label>
                                      <Input
                                        value={trans.job_lo}
                                        onChange={(e) => {
                                          setCrewTranslations(prev => ({
                                            ...prev,
                                            [key]: { ...prev[key], job_lo: e.target.value }
                                          }));
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setEditingCrew(null);
                                            saveCastCrewUpdates();
                                          }
                                        }}
                                        placeholder="ຊື່ຕຳແໜ່ງເປັນພາສາລາວ"
                                        className="text-xs h-8"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Link href={`/admin/people/${member.person.id}`}>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                  >
                                    View Person
                                  </Button>
                                </Link>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (isEditing) {
                                      saveCastCrewUpdates();
                                    }
                                    setEditingCrew(isEditing ? null : key);
                                  }}
                                >
                                  {isEditing ? 'Done' : 'Edit Role'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleRemoveCrew(member.person.id, member.department)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          </TabsContent>
        </form>
      </Tabs>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle className="text-xl">Movie Updated Successfully!</DialogTitle>
            </div>
            <DialogDescription>
              Your changes have been saved. The movie data has been refreshed with the latest updates.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={handleCloseSuccessModal} variant="outline" className="w-full">
              Keep Editing
            </Button>
            <Button onClick={handleBackToMovies} className="w-full">
              Back to Movies
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
