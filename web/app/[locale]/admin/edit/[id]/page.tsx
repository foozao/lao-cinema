'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import { getLocalizedText } from '@/lib/i18n';
import { translateCrewJob } from '@/lib/i18n/translate-crew-job';
import { useTranslations } from 'next-intl';
import { mapTMDBToMovie } from '@/lib/tmdb';
import type { Movie } from '@/lib/types';
import { syncMovieFromTMDB } from './actions';
import { movieAPI } from '@/lib/api/client';

export default function EditMoviePage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations();
  const movieId = params.id as string;
  
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
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
  });

  // State for cast/crew translations
  const [castTranslations, setCastTranslations] = useState<Record<string, { character_en: string; character_lo: string }>>({});
  const [crewTranslations, setCrewTranslations] = useState<Record<string, { job_en: string; job_lo: string }>>({});
  const [editingCast, setEditingCast] = useState<string | null>(null);
  const [editingCrew, setEditingCrew] = useState<string | null>(null);

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
      } catch (error) {
        console.error('Failed to load movie:', error);
        setSyncError('Failed to load movie from database');
      }
    };

    loadMovie();
  }, [movieId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      
      // Map to our schema, preserving Lao translations
      const syncedData = mapTMDBToMovie(tmdbData, credits, currentMovie);

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

      alert('Successfully synced from TMDB! English content and metadata updated.');
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to sync from TMDB');
    } finally {
      setSyncing(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        release_date: formData.release_date,
        runtime: formData.runtime ? parseInt(formData.runtime) : undefined,
        poster_path: formData.poster_path || undefined,
        backdrop_path: formData.backdrop_path || undefined,
        video_sources: formData.video_url ? [{
          id: '1',
          url: formData.video_url,
          format: formData.video_format as 'hls' | 'mp4',
          quality: formData.video_quality as any,
        }] : [],
        cast: updatedCast,
        crew: updatedCrew,
      };

      await movieAPI.update(movieId, updateData);
      
      alert('Movie updated successfully!');
      router.push('/admin');
    } catch (error) {
      console.error('Failed to update movie:', error);
      alert('Failed to update movie. Please try again.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Edit Movie</h2>
        {currentMovie?.tmdb_id && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from TMDB'}
          </Button>
        )}
      </div>

      {syncError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Sync Error</p>
            <p className="text-sm text-red-600">{syncError}</p>
          </div>
        </div>
      )}

      {currentMovie?.tmdb_id && currentMovie.tmdb_last_synced && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>TMDB ID:</strong> {currentMovie.tmdb_id} • 
            <strong className="ml-2">Last synced:</strong>{' '}
            {new Date(currentMovie.tmdb_last_synced).toLocaleDateString()}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
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
                  <Label htmlFor="vote_average">Rating (0-10)</Label>
                  <Input
                    id="vote_average"
                    name="vote_average"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.vote_average}
                    onChange={handleChange}
                    placeholder="8.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={(e) => handleChange(e as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Released">Released</option>
                    <option value="Post Production">Post Production</option>
                    <option value="In Production">In Production</option>
                    <option value="Planned">Planned</option>
                    <option value="Rumored">Rumored</option>
                    <option value="Canceled">Canceled</option>
                  </select>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget">Budget (USD)</Label>
                  <Input
                    id="budget"
                    name="budget"
                    type="number"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="500000"
                  />
                </div>

                <div>
                  <Label htmlFor="revenue">Revenue (USD)</Label>
                  <Input
                    id="revenue"
                    name="revenue"
                    type="number"
                    value={formData.revenue}
                    onChange={handleChange}
                    placeholder="1200000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="homepage">Homepage URL</Label>
                <Input
                  id="homepage"
                  name="homepage"
                  type="url"
                  value={formData.homepage}
                  onChange={handleChange}
                  placeholder="https://example.com/movie"
                />
              </div>
            </CardContent>
          </Card>

          {/* Media Files */}
          <Card>
            <CardHeader>
              <CardTitle>Media Files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="poster_path">Poster Image Path</Label>
                <Input
                  id="poster_path"
                  name="poster_path"
                  value={formData.poster_path}
                  onChange={handleChange}
                  placeholder="/posters/movie-poster.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload image to /public/posters/ and enter the path here
                </p>
              </div>

              <div>
                <Label htmlFor="backdrop_path">Backdrop Image Path</Label>
                <Input
                  id="backdrop_path"
                  name="backdrop_path"
                  value={formData.backdrop_path}
                  onChange={handleChange}
                  placeholder="/backdrops/movie-backdrop.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload image to /public/backdrops/ and enter the path here
                </p>
              </div>
            </CardContent>
          </Card>

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
            </CardContent>
          </Card>

          {/* Cast & Crew */}
          {currentMovie && (currentMovie.cast.length > 0 || currentMovie.crew.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Cast & Crew</CardTitle>
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
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (isEditing) {
                                    saveCastCrewUpdates();
                                  }
                                  setEditingCast(isEditing ? null : key);
                                }}
                                className="flex-shrink-0"
                              >
                                {isEditing ? 'Done' : 'Edit'}
                              </Button>
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
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (isEditing) {
                                    saveCastCrewUpdates();
                                  }
                                  setEditingCrew(isEditing ? null : key);
                                }}
                                className="flex-shrink-0"
                              >
                                {isEditing ? 'Done' : 'Edit'}
                              </Button>
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

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin')}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              Update Movie
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
