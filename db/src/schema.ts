import { pgTable, text, integer, real, boolean, timestamp, uuid, pgEnum, primaryKey } from 'drizzle-orm/pg-core';

// Enums
export const languageEnum = pgEnum('language', ['en', 'lo']);
export const videoFormatEnum = pgEnum('video_format', ['mp4', 'hls', 'dash']);
export const videoQualityEnum = pgEnum('video_quality', ['original', '1080p', '720p', '480p', '360p']);

// Movies table - language-agnostic data only
export const movies = pgTable('movies', {
  id: uuid('id').defaultRandom().primaryKey(),
  tmdbId: integer('tmdb_id').unique(),
  imdbId: text('imdb_id').unique(),
  
  originalTitle: text('original_title').notNull(),
  
  // Media paths
  posterPath: text('poster_path'),
  backdropPath: text('backdrop_path'),
  
  // Details
  releaseDate: text('release_date').notNull(),
  runtime: integer('runtime').notNull(),
  voteAverage: real('vote_average').default(0),
  voteCount: integer('vote_count').default(0),
  popularity: real('popularity').default(0),
  adult: boolean('adult').default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Movie translations table
export const movieTranslations = pgTable('movie_translations', {
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  language: languageEnum('language').notNull(),
  title: text('title').notNull(),
  overview: text('overview').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.language] }),
}));

// Genres table
export const genres = pgTable('genres', {
  id: integer('id').primaryKey(),
});

// Genre translations table
export const genreTranslations = pgTable('genre_translations', {
  genreId: integer('genre_id').references(() => genres.id, { onDelete: 'cascade' }).notNull(),
  language: languageEnum('language').notNull(),
  name: text('name').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.genreId, table.language] }),
}));

// Movie-Genre junction table
export const movieGenres = pgTable('movie_genres', {
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  genreId: integer('genre_id').references(() => genres.id, { onDelete: 'cascade' }).notNull(),
});

// Cast table
export const cast = pgTable('cast', {
  id: uuid('id').defaultRandom().primaryKey(),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  profilePath: text('profile_path'),
  order: integer('order').notNull(),
});

// Cast translations table
export const castTranslations = pgTable('cast_translations', {
  castId: uuid('cast_id').references(() => cast.id, { onDelete: 'cascade' }).notNull(),
  language: languageEnum('language').notNull(),
  name: text('name').notNull(),
  character: text('character').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.castId, table.language] }),
}));

// Crew table
export const crew = pgTable('crew', {
  id: uuid('id').defaultRandom().primaryKey(),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  department: text('department').notNull(),
  profilePath: text('profile_path'),
});

// Crew translations table
export const crewTranslations = pgTable('crew_translations', {
  crewId: uuid('crew_id').references(() => crew.id, { onDelete: 'cascade' }).notNull(),
  language: languageEnum('language').notNull(),
  name: text('name').notNull(),
  job: text('job').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.crewId, table.language] }),
}));

// Video sources table
export const videoSources = pgTable('video_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  quality: videoQualityEnum('quality').notNull(),
  format: videoFormatEnum('format').notNull(),
  url: text('url').notNull(),
  sizeBytes: integer('size_bytes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Types for TypeScript
export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;
export type MovieTranslation = typeof movieTranslations.$inferSelect;
export type NewMovieTranslation = typeof movieTranslations.$inferInsert;

export type Genre = typeof genres.$inferSelect;
export type NewGenre = typeof genres.$inferInsert;
export type GenreTranslation = typeof genreTranslations.$inferSelect;
export type NewGenreTranslation = typeof genreTranslations.$inferInsert;

export type Cast = typeof cast.$inferSelect;
export type NewCast = typeof cast.$inferInsert;
export type CastTranslation = typeof castTranslations.$inferSelect;
export type NewCastTranslation = typeof castTranslations.$inferInsert;

export type Crew = typeof crew.$inferSelect;
export type NewCrew = typeof crew.$inferInsert;
export type CrewTranslation = typeof crewTranslations.$inferSelect;
export type NewCrewTranslation = typeof crewTranslations.$inferInsert;

export type VideoSource = typeof videoSources.$inferSelect;
export type NewVideoSource = typeof videoSources.$inferInsert;
