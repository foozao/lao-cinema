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
  releaseDate: text('release_date'),
  runtime: integer('runtime'),
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

// People table - actors, directors, crew members
export const people = pgTable('people', {
  id: integer('id').primaryKey(), // TMDB person ID
  profilePath: text('profile_path'),
  birthday: text('birthday'), // ISO date string
  deathday: text('deathday'), // ISO date string
  placeOfBirth: text('place_of_birth'),
  knownForDepartment: text('known_for_department'), // Acting, Directing, etc.
  popularity: real('popularity').default(0),
  gender: integer('gender'), // 0=unknown, 1=female, 2=male, 3=non-binary
  imdbId: text('imdb_id'),
  homepage: text('homepage'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// People translations table
export const peopleTranslations = pgTable('people_translations', {
  personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }).notNull(),
  language: languageEnum('language').notNull(),
  name: text('name').notNull(),
  biography: text('biography'),
}, (table) => ({
  pk: primaryKey({ columns: [table.personId, table.language] }),
}));

// Movie-Cast junction table (actors in movies)
export const movieCast = pgTable('movie_cast', {
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }).notNull(),
  order: integer('order').notNull(), // Billing order
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.personId] }),
}));

// Movie-Cast character translations (role-specific)
export const movieCastTranslations = pgTable('movie_cast_translations', {
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }).notNull(),
  language: languageEnum('language').notNull(),
  character: text('character').notNull(), // Character name
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.personId, table.language] }),
}));

// Movie-Crew junction table (crew members in movies)
export const movieCrew = pgTable('movie_crew', {
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }).notNull(),
  department: text('department').notNull(), // Production, Directing, Writing, etc.
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.personId, table.department] }),
}));

// Movie-Crew job translations (role-specific)
export const movieCrewTranslations = pgTable('movie_crew_translations', {
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }).notNull(),
  department: text('department').notNull(),
  language: languageEnum('language').notNull(),
  job: text('job').notNull(), // Director, Producer, Writer, etc.
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.personId, table.department, table.language] }),
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

export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type PersonTranslation = typeof peopleTranslations.$inferSelect;
export type NewPersonTranslation = typeof peopleTranslations.$inferInsert;

export type MovieCast = typeof movieCast.$inferSelect;
export type NewMovieCast = typeof movieCast.$inferInsert;
export type MovieCastTranslation = typeof movieCastTranslations.$inferSelect;
export type NewMovieCastTranslation = typeof movieCastTranslations.$inferInsert;

export type MovieCrew = typeof movieCrew.$inferSelect;
export type NewMovieCrew = typeof movieCrew.$inferInsert;
export type MovieCrewTranslation = typeof movieCrewTranslations.$inferSelect;
export type NewMovieCrewTranslation = typeof movieCrewTranslations.$inferInsert;

export type VideoSource = typeof videoSources.$inferSelect;
export type NewVideoSource = typeof videoSources.$inferInsert;
