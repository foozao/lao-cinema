/**
 * Test Fixtures
 * 
 * Common data creation utilities for tests.
 * These functions create entities directly in the database.
 */

import { db, schema } from '../db/index.js';
import { hashPassword, generateSessionToken } from '../lib/auth-utils.js';

// =============================================================================
// MOVIES
// =============================================================================

export interface TestMovieOptions {
  originalTitle?: string;
  releaseDate?: string;
  runtime?: number;
  adult?: boolean;
  posterPath?: string;
  backdropPath?: string;
}

/**
 * Create a test movie directly in the database
 */
export async function createTestMovie(options: TestMovieOptions = {}): Promise<{ id: string; originalTitle: string }> {
  const [movie] = await db.insert(schema.movies).values({
    originalTitle: options.originalTitle ?? 'Test Movie',
    releaseDate: options.releaseDate ?? '2024-01-01',
    runtime: options.runtime,
    adult: options.adult ?? false,
    posterPath: options.posterPath,
    backdropPath: options.backdropPath,
  }).returning();
  
  return { id: movie.id, originalTitle: movie.originalTitle };
}

/**
 * Create a short film (runtime <= 40 minutes)
 */
export async function createTestShortFilm(options: Omit<TestMovieOptions, 'runtime'> & { runtime?: number } = {}): Promise<{ id: string; originalTitle: string }> {
  return createTestMovie({
    ...options,
    runtime: options.runtime ?? 15, // Default 15 minutes
    originalTitle: options.originalTitle ?? 'Test Short Film',
  });
}

/**
 * Create a movie with translations
 */
export async function createTestMovieWithTranslations(options: TestMovieOptions & {
  title?: { en: string; lo?: string };
  overview?: { en: string; lo?: string };
} = {}): Promise<{ id: string; originalTitle: string }> {
  const movie = await createTestMovie(options);
  
  const title = options.title ?? { en: 'Test Movie' };
  const overview = options.overview ?? { en: 'A test movie' };
  
  // Insert English translation
  await db.insert(schema.movieTranslations).values({
    movieId: movie.id,
    language: 'en',
    title: title.en,
    overview: overview.en,
  });
  
  // Insert Lao translation if provided
  if (title.lo || overview.lo) {
    await db.insert(schema.movieTranslations).values({
      movieId: movie.id,
      language: 'lo',
      title: title.lo ?? title.en,
      overview: overview.lo ?? overview.en,
    });
  }
  
  return movie;
}

// =============================================================================
// PEOPLE
// =============================================================================

export interface TestPersonOptions {
  id?: number;
  knownForDepartment?: string;
  profilePath?: string;
  name?: { en: string; lo?: string };
  biography?: { en?: string; lo?: string };
}

/**
 * Create a test person directly in the database
 */
export async function createTestPerson(options: TestPersonOptions = {}): Promise<{ id: number }> {
  const [person] = await db.insert(schema.people).values({
    id: options.id ?? -Math.floor(Math.random() * 1000000), // Negative IDs for manual entries
    knownForDepartment: options.knownForDepartment ?? 'Acting',
    profilePath: options.profilePath,
  }).returning();
  
  // Add translations if name provided
  if (options.name) {
    await db.insert(schema.peopleTranslations).values({
      personId: person.id,
      language: 'en',
      name: options.name.en,
      biography: options.biography?.en,
    });
    
    if (options.name.lo) {
      await db.insert(schema.peopleTranslations).values({
        personId: person.id,
        language: 'lo',
        name: options.name.lo,
        biography: options.biography?.lo,
      });
    }
  }
  
  return { id: person.id };
}

// =============================================================================
// SHORT PACKS
// =============================================================================

export interface TestShortPackOptions {
  slug?: string;
  isPublished?: boolean;
  posterPath?: string;
  backdropPath?: string;
  title?: { en: string; lo?: string };
  description?: { en?: string; lo?: string };
}

/**
 * Create a test short pack directly in the database
 */
export async function createTestShortPack(options: TestShortPackOptions = {}): Promise<{ id: string; slug: string | null }> {
  const [pack] = await db.insert(schema.shortPacks).values({
    slug: options.slug ?? `test-pack-${Date.now()}`,
    isPublished: options.isPublished ?? false,
    posterPath: options.posterPath,
    backdropPath: options.backdropPath,
  }).returning();
  
  // Add translations
  const title = options.title ?? { en: 'Test Pack' };
  
  await db.insert(schema.shortPackTranslations).values({
    packId: pack.id,
    language: 'en',
    title: title.en,
    description: options.description?.en,
  });
  
  if (title.lo) {
    await db.insert(schema.shortPackTranslations).values({
      packId: pack.id,
      language: 'lo',
      title: title.lo,
      description: options.description?.lo,
    });
  }
  
  return { id: pack.id, slug: pack.slug };
}

/**
 * Add a short film to a pack
 */
export async function addShortToPack(packId: string, movieId: string, order?: number): Promise<void> {
  const orderValue = order ?? 0;
  await db.insert(schema.shortPackItems).values({
    packId,
    movieId,
    order: orderValue,
  });
}

// =============================================================================
// GENRES
// =============================================================================

export interface TestGenreOptions {
  id?: number; // TMDB genre ID
  name?: { en: string; lo?: string };
  isVisible?: boolean;
}

/**
 * Create a test genre directly in the database
 * Note: Genre id IS the TMDB genre ID (integer)
 */
export async function createTestGenre(options: TestGenreOptions = {}): Promise<{ id: number }> {
  const genreId = options.id ?? Math.floor(Math.random() * 10000);
  
  const [genre] = await db.insert(schema.genres).values({
    id: genreId,
    isVisible: options.isVisible ?? true,
  }).returning();
  
  const name = options.name ?? { en: 'Test Genre' };
  
  await db.insert(schema.genreTranslations).values({
    genreId: genre.id,
    language: 'en',
    name: name.en,
  });
  
  if (name.lo) {
    await db.insert(schema.genreTranslations).values({
      genreId: genre.id,
      language: 'lo',
      name: name.lo,
    });
  }
  
  return { id: genre.id };
}

// =============================================================================
// USERS
// =============================================================================

export interface TestUserOptions {
  email?: string;
  password?: string;
  displayName?: string;
  role?: 'user' | 'editor' | 'admin';
}

export interface TestUserResult {
  userId: string;
  email: string;
  token: string;
  headers: { authorization: string };
}

/**
 * Create a test user and session
 */
export async function createTestUser(options: TestUserOptions = {}): Promise<TestUserResult> {
  const email = options.email ?? `user-${Date.now()}@test.com`;
  const passwordHash = await hashPassword(options.password ?? 'testpassword123');
  
  const [user] = await db.insert(schema.users).values({
    email,
    passwordHash,
    displayName: options.displayName ?? 'Test User',
    role: options.role ?? 'user',
  }).returning();
  
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await db.insert(schema.userSessions).values({
    userId: user.id,
    token,
    expiresAt,
  });
  
  return {
    userId: user.id,
    email: user.email,
    token,
    headers: { authorization: `Bearer ${token}` },
  };
}

// =============================================================================
// RENTALS
// =============================================================================

export interface TestRentalOptions {
  userId?: string;
  anonymousId?: string;
  movieId?: string;
  shortPackId?: string;
  expiresInHours?: number;
  expired?: boolean;
  amount?: number;
  paymentMethod?: string;
}

/**
 * Create a test rental directly in the database
 */
export async function createTestRental(options: TestRentalOptions): Promise<{ id: string }> {
  const now = new Date();
  let expiresAt: Date;
  
  if (options.expired) {
    expiresAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  } else {
    const hours = options.expiresInHours ?? 48;
    expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
  }
  
  const [rental] = await db.insert(schema.rentals).values({
    userId: options.userId,
    anonymousId: options.anonymousId,
    movieId: options.movieId,
    shortPackId: options.shortPackId,
    purchasedAt: now,
    expiresAt,
    transactionId: `txn_test_${Date.now()}`,
    amount: options.amount ?? 500,
    paymentMethod: options.paymentMethod ?? 'demo',
  }).returning();
  
  return { id: rental.id };
}

// =============================================================================
// WATCH PROGRESS
// =============================================================================

export interface TestWatchProgressOptions {
  userId?: string;
  anonymousId?: string;
  movieId: string;
  progressSeconds?: number;
  durationSeconds?: number;
  completed?: boolean;
}

/**
 * Create test watch progress directly in the database
 */
export async function createTestWatchProgress(options: TestWatchProgressOptions): Promise<{ id: string }> {
  const [progress] = await db.insert(schema.watchProgress).values({
    userId: options.userId,
    anonymousId: options.anonymousId,
    movieId: options.movieId,
    progressSeconds: options.progressSeconds ?? 300,
    durationSeconds: options.durationSeconds ?? 5400,
    completed: options.completed ?? false,
    lastWatchedAt: new Date(),
  }).returning();
  
  return { id: progress.id };
}

// =============================================================================
// CLEANUP UTILITIES
// =============================================================================

/**
 * Clean up all user-related data (sessions and users)
 */
export async function cleanupUsers(): Promise<void> {
  await db.delete(schema.userSessions);
  await db.delete(schema.users);
}

/**
 * Clean up all movie-related data
 */
export async function cleanupMovies(): Promise<void> {
  await db.delete(schema.movieImages);
  await db.delete(schema.movieCastTranslations);
  await db.delete(schema.movieCrewTranslations);
  await db.delete(schema.movieCast);
  await db.delete(schema.movieCrew);
  await db.delete(schema.movieGenres);
  await db.delete(schema.videoSources);
  await db.delete(schema.movieTranslations);
  await db.delete(schema.movies);
}

/**
 * Clean up all people-related data
 */
export async function cleanupPeople(): Promise<void> {
  await db.delete(schema.movieCastTranslations);
  await db.delete(schema.movieCrewTranslations);
  await db.delete(schema.movieCast);
  await db.delete(schema.movieCrew);
  await db.delete(schema.peopleTranslations);
  await db.delete(schema.people);
}

/**
 * Clean up all short pack-related data
 */
export async function cleanupShortPacks(): Promise<void> {
  await db.delete(schema.shortPackItems);
  await db.delete(schema.shortPackTranslations);
  await db.delete(schema.shortPacks);
}

/**
 * Clean up all rental-related data
 */
export async function cleanupRentals(): Promise<void> {
  await db.delete(schema.rentals);
}

/**
 * Clean up all watch progress data
 */
export async function cleanupWatchProgress(): Promise<void> {
  await db.delete(schema.watchProgress);
}

/**
 * Clean up all genre-related data
 */
export async function cleanupGenres(): Promise<void> {
  await db.delete(schema.movieGenres);
  await db.delete(schema.genreTranslations);
  await db.delete(schema.genres);
}
