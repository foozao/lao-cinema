// Shared helpers for movie route operations
// Reduces code duplication across movie CRUD, cast, crew, and image routes

import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

type Language = 'en' | 'lo';

// =============================================================================
// TRANSLATION HELPERS
// =============================================================================

/**
 * Build translation records from localized text object
 * Handles the common pattern of creating en/lo translations
 */
export function buildTranslations<T>(
  localizedText: { en: string; lo?: string },
  builder: (lang: Language, text: string) => T
): T[] {
  const translations: T[] = [];
  
  if (localizedText.en) {
    translations.push(builder('en', localizedText.en));
  }
  if (localizedText.lo) {
    translations.push(builder('lo', localizedText.lo));
  }
  
  return translations;
}

/**
 * Insert translations for a movie (title, overview, tagline)
 */
export async function insertMovieTranslations(
  db: NodePgDatabase<any>,
  schema: any,
  movieId: string,
  title: { en: string; lo?: string },
  overview?: { en?: string; lo?: string },
  tagline?: { en?: string; lo?: string }
) {
  const translations = [];
  
  if (title.en) {
    translations.push({
      movieId,
      language: 'en' as const,
      title: title.en,
      overview: overview?.en || '',
      tagline: tagline?.en || null,
    });
  }
  
  if (title.lo) {
    translations.push({
      movieId,
      language: 'lo' as const,
      title: title.lo,
      overview: overview?.lo || '',
      tagline: tagline?.lo || null,
    });
  }
  
  if (translations.length > 0) {
    await db.insert(schema.movieTranslations).values(translations);
  }
}

/**
 * Insert person translations (name, biography)
 */
export async function insertPersonTranslations(
  db: NodePgDatabase<any>,
  schema: any,
  personId: number,
  name: { en: string; lo?: string },
  biography?: { en?: string; lo?: string }
) {
  const translations = buildTranslations(name, (lang, text) => ({
    personId,
    language: lang,
    name: text,
    biography: biography?.[lang] || null,
  }));
  
  if (translations.length > 0) {
    await db.insert(schema.peopleTranslations).values(translations);
  }
}

/**
 * Insert genre translations
 */
export async function insertGenreTranslations(
  db: NodePgDatabase<any>,
  schema: any,
  genreId: number,
  name: { en: string; lo?: string }
) {
  const translations = buildTranslations(name, (lang, text) => ({
    genreId,
    language: lang,
    name: text,
  }));
  
  if (translations.length > 0) {
    await db.insert(schema.genreTranslations).values(translations);
  }
}

/**
 * Insert character translations for cast
 */
export async function insertCharacterTranslations(
  db: NodePgDatabase<any>,
  schema: any,
  movieId: string,
  personId: number,
  character: { en: string; lo?: string }
) {
  const translations = buildTranslations(character, (lang, text) => ({
    movieId,
    personId,
    language: lang,
    character: text,
  }));
  
  if (translations.length > 0) {
    await db.insert(schema.movieCastTranslations).values(translations);
  }
}

/**
 * Insert job translations for crew
 */
export async function insertJobTranslations(
  db: NodePgDatabase<any>,
  schema: any,
  movieId: string,
  personId: number,
  department: string,
  job: { en: string; lo?: string }
) {
  const translations = buildTranslations(job, (lang, text) => ({
    movieId,
    personId,
    department,
    language: lang,
    job: text,
  }));
  
  if (translations.length > 0) {
    await db.insert(schema.movieCrewTranslations).values(translations);
  }
}

// =============================================================================
// PERSON UPSERT HELPERS
// =============================================================================

interface PersonData {
  id: number;
  name: { en: string; lo?: string };
  known_for_department?: string;
  profile_path?: string;
}

/**
 * Ensure a person exists in the database, inserting if necessary
 * Returns true if person was inserted, false if already existed
 */
export async function ensurePersonExists(
  db: NodePgDatabase<any>,
  schema: any,
  person: PersonData,
  defaultDepartment: string = 'Acting'
): Promise<boolean> {
  const existing = await db.select()
    .from(schema.people)
    .where(eq(schema.people.id, person.id))
    .limit(1);

  if (existing.length > 0) {
    return false;
  }

  // Insert person
  const personInsertData: any = {
    id: person.id,
    knownForDepartment: person.known_for_department || defaultDepartment,
  };
  
  if (person.profile_path !== undefined) {
    personInsertData.profilePath = person.profile_path;
  }
  
  await db.insert(schema.people).values(personInsertData);

  // Insert translations
  await insertPersonTranslations(db, schema, person.id, person.name);

  return true;
}

// =============================================================================
// IMAGE HELPERS
// =============================================================================

interface ImageInput {
  type: 'poster' | 'backdrop' | 'logo';
  file_path: string;
  is_primary?: boolean;
  aspect_ratio?: number;
  height?: number;
  width?: number;
  iso_639_1?: string | null;
  vote_average?: number;
  vote_count?: number;
}

/**
 * Map image input to database values
 */
export function mapImageToDbValue(movieId: string, img: ImageInput): Record<string, any> {
  const value: any = {
    movieId,
    type: img.type,
    filePath: img.file_path,
    isPrimary: img.is_primary || false,
  };
  
  // Only include optional fields if they're defined
  if (img.aspect_ratio !== undefined) value.aspectRatio = img.aspect_ratio;
  if (img.height !== undefined) value.height = img.height;
  if (img.width !== undefined) value.width = img.width;
  if (img.iso_639_1 !== undefined) value.iso6391 = img.iso_639_1;
  if (img.vote_average !== undefined) value.voteAverage = img.vote_average;
  if (img.vote_count !== undefined) value.voteCount = img.vote_count;
  
  return value;
}

/**
 * Insert images for a movie
 */
export async function insertMovieImages(
  db: NodePgDatabase<any>,
  schema: any,
  movieId: string,
  images: ImageInput[]
) {
  if (!images || images.length === 0) return;
  
  const imageValues = images.map(img => mapImageToDbValue(movieId, img));
  await db.insert(schema.movieImages).values(imageValues);
}

/**
 * Find primary image of a given type from image array
 */
export function findPrimaryImage(
  images: ImageInput[],
  type: 'poster' | 'backdrop' | 'logo'
): ImageInput | undefined {
  return images.find(img => img.type === type && img.is_primary);
}

// =============================================================================
// MOVIE FIELD MAPPING HELPERS
// =============================================================================

interface MovieInput {
  tmdb_id?: number;
  imdb_id?: string;
  slug?: string;
  original_title?: string;
  original_language?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  adult?: boolean;
  availability_status?: string;
}

/**
 * Map API movie input to database insert values
 */
export function mapMovieToInsertData(
  movie: MovieInput,
  images?: ImageInput[]
): Record<string, any> {
  const data: any = {
    originalTitle: movie.original_title || 'Untitled',
    adult: movie.adult || false,
    availabilityStatus: movie.availability_status || null,
  };
  
  // Only include defined values to avoid PostgreSQL undefined errors
  if (movie.tmdb_id !== undefined) data.tmdbId = movie.tmdb_id;
  if (movie.imdb_id !== undefined) data.imdbId = movie.imdb_id;
  if (movie.slug !== undefined) data.slug = movie.slug;
  if (movie.original_language !== undefined) data.originalLanguage = movie.original_language;
  
  // Set poster/backdrop from primary images if available, otherwise from top-level fields
  if (images && images.length > 0) {
    const primaryPoster = findPrimaryImage(images, 'poster');
    const primaryBackdrop = findPrimaryImage(images, 'backdrop');
    if (primaryPoster) data.posterPath = primaryPoster.file_path;
    if (primaryBackdrop) data.backdropPath = primaryBackdrop.file_path;
  } else {
    if (movie.poster_path !== undefined) data.posterPath = movie.poster_path;
    if (movie.backdrop_path !== undefined) data.backdropPath = movie.backdrop_path;
  }
  
  if (movie.release_date !== undefined) data.releaseDate = movie.release_date;
  if (movie.runtime !== undefined) data.runtime = movie.runtime;
  if (movie.vote_average !== undefined) data.voteAverage = movie.vote_average;
  if (movie.vote_count !== undefined) data.voteCount = movie.vote_count;
  if (movie.popularity !== undefined) data.popularity = movie.popularity;
  
  return data;
}

/**
 * Map API movie input to database update values
 */
export function mapMovieToUpdateData(updates: Partial<MovieInput>): Record<string, any> {
  const data: any = {};
  
  if (updates.slug !== undefined) data.slug = updates.slug;
  if (updates.runtime !== undefined) data.runtime = updates.runtime;
  if (updates.vote_average !== undefined) data.voteAverage = updates.vote_average;
  if (updates.vote_count !== undefined) data.voteCount = updates.vote_count;
  if (updates.popularity !== undefined) data.popularity = updates.popularity;
  if (updates.release_date !== undefined) data.releaseDate = updates.release_date;
  if (updates.poster_path !== undefined) data.posterPath = updates.poster_path;
  if (updates.backdrop_path !== undefined) data.backdropPath = updates.backdrop_path;
  if (updates.availability_status !== undefined) data.availabilityStatus = updates.availability_status;
  
  // Always update the timestamp when any field is updated
  if (Object.keys(data).length > 0) {
    data.updatedAt = new Date();
  }
  
  return data;
}
