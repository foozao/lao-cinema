// Database schema using Drizzle ORM
// Matches the Movie type from the frontend

import { pgTable, text, integer, boolean, timestamp, jsonb, real, uuid } from 'drizzle-orm/pg-core';

// Movies table
export const movies = pgTable('movies', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // TMDB integration
  tmdb_id: integer('tmdb_id').unique(),
  imdb_id: text('imdb_id'),
  tmdb_last_synced: timestamp('tmdb_last_synced'),
  tmdb_sync_enabled: boolean('tmdb_sync_enabled').default(false),
  
  // Basic info
  original_title: text('original_title'),
  original_language: text('original_language'),
  poster_path: text('poster_path'),
  backdrop_path: text('backdrop_path'),
  release_date: text('release_date').notNull(),
  runtime: integer('runtime'),
  vote_average: real('vote_average'),
  vote_count: integer('vote_count'),
  popularity: real('popularity'),
  adult: boolean('adult').notNull().default(false),
  video: boolean('video').default(false),
  
  // Production details
  budget: integer('budget'),
  revenue: integer('revenue'),
  status: text('status'), // 'Released', 'Post Production', etc.
  homepage: text('homepage'),
  
  // Localized content (stored as JSONB)
  // Format: { en: string, lo?: string }
  title: jsonb('title').notNull(),
  overview: jsonb('overview').notNull(),
  tagline: jsonb('tagline'),
  
  // Relationships (stored as JSONB arrays)
  genres: jsonb('genres').notNull().default('[]'),
  production_companies: jsonb('production_companies').default('[]'),
  production_countries: jsonb('production_countries').default('[]'),
  spoken_languages: jsonb('spoken_languages').default('[]'),
  belongs_to_collection: jsonb('belongs_to_collection'),
  
  // Video sources (custom for streaming)
  video_sources: jsonb('video_sources').notNull().default('[]'),
  
  // Cast and crew
  cast: jsonb('cast').notNull().default('[]'),
  crew: jsonb('crew').notNull().default('[]'),
  
  // Metadata
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Genres table (for reference and filtering)
export const genres = pgTable('genres', {
  id: integer('id').primaryKey(),
  name: jsonb('name').notNull(), // { en: string, lo?: string }
});

// Type exports for TypeScript
export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;
export type Genre = typeof genres.$inferSelect;
export type NewGenre = typeof genres.$inferInsert;
