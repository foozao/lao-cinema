// Map TMDB API responses to our Movie schema

import { Movie, Genre, ProductionCompany, ProductionCountry, SpokenLanguage, Collection, CastMember, CrewMember, Person } from '../types';
import { createLocalizedText } from '../i18n';
import { TMDBMovieDetails, TMDBCredits, TMDBPersonDetails } from './client';

/**
 * Map TMDB movie details to our Movie schema
 * 
 * Strategy:
 * - English content comes from TMDB
 * - Lao content is left empty for manual translation
 * - Metadata (budget, revenue, etc.) is synced
 * - Preserves existing Lao translations if provided
 */
export function mapTMDBToMovie(
  tmdbData: TMDBMovieDetails,
  credits?: TMDBCredits,
  existingMovie?: Partial<Movie>
): Omit<Movie, 'id' | 'created_at' | 'updated_at' | 'video_sources'> {
  // Map genres
  const genres: Genre[] = tmdbData.genres.map((g) => ({
    id: g.id,
    name: createLocalizedText(g.name, undefined), // English only, Lao added manually
  }));

  // Map production companies
  const production_companies: ProductionCompany[] = tmdbData.production_companies.map((pc) => ({
    id: pc.id,
    name: pc.name,
    logo_path: pc.logo_path || undefined,
    origin_country: pc.origin_country,
  }));

  // Map production countries
  const production_countries: ProductionCountry[] = tmdbData.production_countries.map((pc) => ({
    iso_3166_1: pc.iso_3166_1,
    name: pc.name,
  }));

  // Map spoken languages
  const spoken_languages: SpokenLanguage[] = tmdbData.spoken_languages.map((sl) => ({
    iso_639_1: sl.iso_639_1,
    english_name: sl.english_name,
    name: sl.name,
  }));

  // Map collection if exists
  const belongs_to_collection: Collection | null = tmdbData.belongs_to_collection
    ? {
        id: tmdbData.belongs_to_collection.id,
        name: createLocalizedText(tmdbData.belongs_to_collection.name, undefined),
        poster_path: tmdbData.belongs_to_collection.poster_path || undefined,
        backdrop_path: tmdbData.belongs_to_collection.backdrop_path || undefined,
      }
    : null;

  // Map cast (top 20 actors)
  // Note: This creates minimal Person objects from credits data
  // Full person details should be fetched separately via getPersonDetails()
  const cast: CastMember[] = credits?.cast.slice(0, 20).map((c) => ({
    person: {
      id: c.id,
      name: createLocalizedText(c.name, undefined), // English only, Lao added manually
      profile_path: c.profile_path || undefined,
      known_for_department: c.known_for_department,
      gender: c.gender,
    },
    character: createLocalizedText(c.character, undefined),
    order: c.order,
  })) || [];

  // Map crew (directors, writers, producers)
  const importantJobs = ['Director', 'Writer', 'Screenplay', 'Producer', 'Executive Producer', 'Director of Photography', 'Original Music Composer'];
  const crew: CrewMember[] = credits?.crew
    .filter((c) => importantJobs.includes(c.job))
    .map((c) => ({
      person: {
        id: c.id,
        name: createLocalizedText(c.name, undefined),
        profile_path: c.profile_path || undefined,
        known_for_department: c.department,
        gender: c.gender,
      },
      job: createLocalizedText(c.job, undefined),
      department: c.department,
    })) || [];

  // Preserve existing Lao translations if available
  const existingLaoTitle = existingMovie?.title?.lo;
  const existingLaoOverview = existingMovie?.overview?.lo;
  const existingLaoTagline = existingMovie?.tagline?.lo;

  return {
    // TMDB metadata
    tmdb_id: tmdbData.id,
    imdb_id: tmdbData.imdb_id || undefined,
    tmdb_last_synced: new Date().toISOString(),
    tmdb_sync_enabled: true,

    // Localized content
    title: createLocalizedText(tmdbData.title, existingLaoTitle),
    overview: createLocalizedText(tmdbData.overview, existingLaoOverview),
    tagline: tmdbData.tagline
      ? createLocalizedText(tmdbData.tagline, existingLaoTagline)
      : undefined,

    // Basic info
    original_title: tmdbData.original_title,
    original_language: tmdbData.original_language,
    poster_path: tmdbData.poster_path || undefined,
    backdrop_path: tmdbData.backdrop_path || undefined,
    release_date: tmdbData.release_date,
    runtime: tmdbData.runtime || undefined,
    vote_average: tmdbData.vote_average,
    vote_count: tmdbData.vote_count,
    popularity: tmdbData.popularity,
    adult: tmdbData.adult,
    video: tmdbData.video,

    // Financial & status
    budget: tmdbData.budget || undefined,
    revenue: tmdbData.revenue || undefined,
    status: mapTMDBStatus(tmdbData.status),
    homepage: tmdbData.homepage || undefined,

    // Relationships
    genres,
    production_companies,
    production_countries,
    spoken_languages,
    belongs_to_collection,

    // People
    cast,
    crew,
  };
}

/**
 * Map TMDB status string to our typed status
 */
function mapTMDBStatus(
  status: string
): 'Rumored' | 'Planned' | 'In Production' | 'Post Production' | 'Released' | 'Canceled' {
  const statusMap: Record<string, Movie['status']> = {
    'Rumored': 'Rumored',
    'Planned': 'Planned',
    'In Production': 'In Production',
    'Post Production': 'Post Production',
    'Released': 'Released',
    'Canceled': 'Canceled',
  };

  return statusMap[status] || 'Released';
}

/**
 * Get a summary of what fields are missing translations
 */
export function getMissingTranslations(movie: Partial<Movie>): string[] {
  const missing: string[] = [];

  if (!movie.title?.lo) missing.push('Title (Lao)');
  if (!movie.overview?.lo) missing.push('Overview (Lao)');
  if (movie.tagline && !movie.tagline.lo) missing.push('Tagline (Lao)');

  return missing;
}

/**
 * Get fields that should be synced from TMDB
 * (excludes Lao translations and custom content)
 */
export const SYNCABLE_FIELDS = [
  'vote_average',
  'vote_count',
  'popularity',
  'budget',
  'revenue',
  'runtime',
  'status',
  'poster_path',
  'backdrop_path',
] as const;

export type SyncableField = typeof SYNCABLE_FIELDS[number];

/**
 * Map TMDB person details to our Person schema
 * 
 * Strategy:
 * - English content comes from TMDB
 * - Lao content is left empty for manual translation
 * - Preserves existing Lao translations if provided
 */
export function mapTMDBToPerson(
  tmdbData: TMDBPersonDetails,
  existingPerson?: Partial<Person>
): Person {
  // Preserve existing Lao translations if available
  const existingLaoName = existingPerson?.name?.lo;
  const existingLaoBio = existingPerson?.biography?.lo;

  return {
    id: tmdbData.id,
    name: createLocalizedText(tmdbData.name, existingLaoName),
    biography: tmdbData.biography
      ? createLocalizedText(tmdbData.biography, existingLaoBio)
      : undefined,
    profile_path: tmdbData.profile_path || undefined,
    birthday: tmdbData.birthday || undefined,
    deathday: tmdbData.deathday || undefined,
    place_of_birth: tmdbData.place_of_birth || undefined,
    known_for_department: tmdbData.known_for_department,
    popularity: tmdbData.popularity,
    gender: tmdbData.gender,
    imdb_id: tmdbData.imdb_id || undefined,
    homepage: tmdbData.homepage || undefined,
  };
}
