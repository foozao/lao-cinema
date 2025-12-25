import { pgTable, text, integer, real, boolean, timestamp, uuid, pgEnum, primaryKey } from 'drizzle-orm/pg-core';

// Enums
export const languageEnum = pgEnum('language', ['en', 'lo']);
export const videoFormatEnum = pgEnum('video_format', ['mp4', 'hls', 'dash']);
export const videoQualityEnum = pgEnum('video_quality', ['original', '1080p', '720p', '480p', '360p']);
export const imageTypeEnum = pgEnum('image_type', ['poster', 'backdrop', 'logo']);
export const streamingPlatformEnum = pgEnum('streaming_platform', ['netflix', 'prime', 'disney', 'hbo', 'apple', 'hulu', 'other']);
export const availabilityStatusEnum = pgEnum('availability_status', ['auto', 'available', 'external', 'unavailable', 'coming_soon']);
export const userRoleEnum = pgEnum('user_role', ['user', 'editor', 'admin']);
export const authProviderEnum = pgEnum('auth_provider', ['email', 'google', 'apple']);
export const trailerTypeEnum = pgEnum('trailer_type', ['youtube', 'video']);
export const movieTypeEnum = pgEnum('movie_type', ['feature', 'short']);
export const auditActionEnum = pgEnum('audit_action', [
  'create', 'update', 'delete',
  'add_cast', 'remove_cast', 'update_cast',
  'add_crew', 'remove_crew', 'update_crew',
  'add_image', 'remove_image', 'set_primary_image',
  'add_video', 'remove_video', 'update_video',
  'add_genre', 'remove_genre',
  'add_production_company', 'remove_production_company',
  'add_platform', 'remove_platform', 'update_platform',
  'feature_movie', 'unfeature_movie',
  'merge_people', 'update_person',
]);
export const auditEntityTypeEnum = pgEnum('audit_entity_type', [
  'movie', 'person', 'genre', 'production_company', 'user', 'settings'
]);

// Movies table - language-agnostic data only
export const movies = pgTable('movies', {
  id: uuid('id').defaultRandom().primaryKey(),
  tmdbId: integer('tmdb_id').unique(),
  imdbId: text('imdb_id').unique(),
  slug: text('slug').unique(), // Vanity URL slug (e.g., 'the-signal')
  type: movieTypeEnum('type').default('feature').notNull(), // 'feature' or 'short'
  
  originalTitle: text('original_title').notNull(),
  originalLanguage: text('original_language'),
  
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
  
  // Availability ('auto' = uses smart defaults based on video_sources and external_platforms)
  availabilityStatus: availabilityStatusEnum('availability_status').default('auto'),
  
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
  tagline: text('tagline'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.language] }),
}));

// Movie images table - stores multiple posters/backdrops from TMDB
export const movieImages = pgTable('movie_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  type: imageTypeEnum('type').notNull(),
  filePath: text('file_path').notNull(), // TMDB image path
  aspectRatio: real('aspect_ratio'),
  height: integer('height'),
  width: integer('width'),
  iso6391: text('iso_639_1'), // Language code for poster (null for no language)
  voteAverage: real('vote_average'),
  voteCount: integer('vote_count'),
  isPrimary: boolean('is_primary').default(false), // Primary poster/backdrop to display
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Genres table
export const genres = pgTable('genres', {
  id: integer('id').primaryKey(),
  isVisible: boolean('is_visible').default(true).notNull(), // Control which genres show in UI
});

// Genre translations table
export const genreTranslations = pgTable('genre_translations', {
  genreId: integer('genre_id').references(() => genres.id, { onDelete: 'cascade' }).notNull(),
  language: languageEnum('language').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  nicknames: text('nicknames').array(), // Array of nicknames in this language
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.personId, table.language] }),
}));

// Person images table - stores profile photos
export const personImages = pgTable('person_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }).notNull(),
  filePath: text('file_path').notNull(), // Image path (TMDB or uploaded)
  aspectRatio: real('aspect_ratio'),
  height: integer('height'),
  width: integer('width'),
  voteAverage: real('vote_average'),
  voteCount: integer('vote_count'),
  isPrimary: boolean('is_primary').default(false), // Primary profile photo to display
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Person aliases table - tracks merged TMDB person IDs
// When person A is merged into person B, we create an alias: tmdbId=A -> canonicalPersonId=B
// This ensures TMDB syncs don't recreate deleted duplicates
export const personAliases = pgTable('person_aliases', {
  tmdbId: integer('tmdb_id').primaryKey(), // The TMDB ID that was merged away
  canonicalPersonId: integer('canonical_person_id').references(() => people.id, { onDelete: 'cascade' }).notNull(), // The person it was merged into
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Movie-Cast junction table (actors in movies)
export const movieCast = pgTable('movie_cast', {
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }).notNull(),
  order: integer('order').notNull(), // Billing order
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.personId] }),
}));

// Movie-Cast character translations (role-specific)
export const movieCastTranslations = pgTable('movie_cast_translations', {
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }).notNull(),
  language: languageEnum('language').notNull(),
  character: text('character').notNull(), // Character name
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.personId, table.language] }),
}));

// Movie-Crew junction table (crew members in movies)
export const movieCrew = pgTable('movie_crew', {
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }).notNull(),
  department: text('department').notNull(), // Production, Directing, Writing, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  width: integer('width'),
  height: integer('height'),
  aspectRatio: text('aspect_ratio'), // e.g., '16:9', '2.35:1', 'mixed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Subtitle tracks table - WebVTT subtitle files for movies
export const subtitleTracks = pgTable('subtitle_tracks', {
  id: uuid('id').defaultRandom().primaryKey(),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  language: text('language').notNull(), // ISO 639-1 code (en, lo, th, etc.)
  label: text('label').notNull(), // Display name (e.g., 'English', 'ລາວ', 'ไทย')
  url: text('url').notNull(), // URL to .vtt file
  isDefault: boolean('is_default').default(false).notNull(), // Default subtitle track
  kind: text('kind').default('subtitles').notNull(), // 'subtitles', 'captions', 'descriptions'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Trailers table - supports both YouTube and self-hosted video trailers
export const trailers = pgTable('trailers', {
  id: uuid('id').defaultRandom().primaryKey(),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  type: trailerTypeEnum('type').notNull(),
  
  // YouTube trailer fields
  youtubeKey: text('youtube_key'),
  
  // Video file trailer fields
  videoUrl: text('video_url'),
  videoFormat: videoFormatEnum('video_format'),
  videoQuality: videoQualityEnum('video_quality'),
  sizeBytes: integer('size_bytes'),
  width: integer('width'),
  height: integer('height'),
  durationSeconds: integer('duration_seconds'),
  
  // Common fields
  name: text('name').notNull(),
  official: boolean('official').default(false),
  language: text('language'), // ISO 639-1 language code
  publishedAt: text('published_at'),
  order: integer('order').default(0), // Display order
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Homepage featured films table
export const homepageFeatured = pgTable('homepage_featured', {
  id: uuid('id').defaultRandom().primaryKey(),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull().unique(),
  order: integer('order').notNull(), // Display order on homepage
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Homepage settings table
export const homepageSettings = pgTable('homepage_settings', {
  id: integer('id').primaryKey().default(1), // Single row table
  randomizeFeatured: boolean('randomize_featured').default(false).notNull(), // Randomize featured films order
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// External platforms table - tracks where films are available externally (e.g., Netflix)
export const movieExternalPlatforms = pgTable('movie_external_platforms', {
  id: uuid('id').defaultRandom().primaryKey(),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  platform: streamingPlatformEnum('platform').notNull(),
  url: text('url'), // Optional link to the film on that platform
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Production companies table
export const productionCompanies = pgTable('production_companies', {
  id: integer('id').primaryKey(), // Use TMDB ID or negative for manual entries
  slug: text('slug').unique(), // Vanity URL (e.g., /production/hoppin-film)
  logoPath: text('logo_path'), // TMDB logo path
  customLogoUrl: text('custom_logo_url'), // User-uploaded logo URL
  websiteUrl: text('website_url'), // Company website
  originCountry: text('origin_country'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Production company translations table
export const productionCompanyTranslations = pgTable('production_company_translations', {
  companyId: integer('company_id').references(() => productionCompanies.id, { onDelete: 'cascade' }).notNull(),
  language: languageEnum('language').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.companyId, table.language] }),
}));

// Movie-Production company junction table
export const movieProductionCompanies = pgTable('movie_production_companies', {
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  companyId: integer('company_id').references(() => productionCompanies.id, { onDelete: 'cascade' }).notNull(),
  order: integer('order').default(0), // Display order
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.companyId] }),
}));

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

export type SubtitleTrack = typeof subtitleTracks.$inferSelect;
export type NewSubtitleTrack = typeof subtitleTracks.$inferInsert;

export type HomepageFeatured = typeof homepageFeatured.$inferSelect;
export type NewHomepageFeatured = typeof homepageFeatured.$inferInsert;

export type MovieImage = typeof movieImages.$inferSelect;
export type NewMovieImage = typeof movieImages.$inferInsert;

export type MovieExternalPlatform = typeof movieExternalPlatforms.$inferSelect;
export type NewMovieExternalPlatform = typeof movieExternalPlatforms.$inferInsert;

export type ProductionCompany = typeof productionCompanies.$inferSelect;
export type NewProductionCompany = typeof productionCompanies.$inferInsert;
export type ProductionCompanyTranslation = typeof productionCompanyTranslations.$inferSelect;
export type NewProductionCompanyTranslation = typeof productionCompanyTranslations.$inferInsert;
export type MovieProductionCompany = typeof movieProductionCompanies.$inferSelect;
export type NewMovieProductionCompany = typeof movieProductionCompanies.$inferInsert;

// =============================================================================
// USER ACCOUNTS & AUTHENTICATION
// =============================================================================

// Users table - core user account data
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash'), // Nullable for OAuth-only accounts
  displayName: text('display_name'),
  profileImageUrl: text('profile_image_url'),
  timezone: text('timezone').default('Asia/Vientiane'), // IANA timezone
  role: userRoleEnum('role').default('user').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
});

// OAuth accounts table - links users to external OAuth providers
// Allows multiple OAuth providers per user (e.g., Google + Apple)
export const oauthAccounts = pgTable('oauth_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: authProviderEnum('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(), // OAuth provider's user ID
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User sessions table - tracks active login sessions
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

// Password reset tokens table - for forgot password flow
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'), // Null until token is used
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Email verification tokens table - for verifying user email addresses
export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'), // Null until token is used
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// =============================================================================
// SHORT FILM PACKS
// =============================================================================

// Short packs table - curated collections of short films
export const shortPacks = pgTable('short_packs', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').unique(), // Vanity URL (e.g., 'lao-voices-2024')
  
  // Media paths
  posterPath: text('poster_path'),
  backdropPath: text('backdrop_path'),
  
  // Status
  isPublished: boolean('is_published').default(false).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Short pack translations table
export const shortPackTranslations = pgTable('short_pack_translations', {
  packId: uuid('pack_id').references(() => shortPacks.id, { onDelete: 'cascade' }).notNull(),
  language: languageEnum('language').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  tagline: text('tagline'), // Short promotional text
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.packId, table.language] }),
}));

// Short pack items table - junction between packs and shorts (movies with type='short')
export const shortPackItems = pgTable('short_pack_items', {
  packId: uuid('pack_id').references(() => shortPacks.id, { onDelete: 'cascade' }).notNull(),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  order: integer('order').notNull(), // Display/playback order within the pack
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.packId, table.movieId] }),
}));

// Types for TypeScript
export type ShortPack = typeof shortPacks.$inferSelect;
export type NewShortPack = typeof shortPacks.$inferInsert;
export type ShortPackTranslation = typeof shortPackTranslations.$inferSelect;
export type NewShortPackTranslation = typeof shortPackTranslations.$inferInsert;
export type ShortPackItem = typeof shortPackItems.$inferSelect;
export type NewShortPackItem = typeof shortPackItems.$inferInsert;

// Rentals table - supports both authenticated and anonymous users
// Can rent either a movie OR a short pack (exactly one must be set)
export const rentals = pgTable('rentals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // Nullable for anonymous
  anonymousId: text('anonymous_id'), // Nullable for authenticated
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }), // Nullable if renting a pack
  shortPackId: uuid('short_pack_id').references(() => shortPacks.id, { onDelete: 'cascade' }), // Nullable if renting a movie
  currentShortId: uuid('current_short_id').references(() => movies.id, { onDelete: 'set null' }), // For pack rentals: tracks which short is currently being watched
  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  transactionId: text('transaction_id').notNull(),
  amount: integer('amount').notNull(), // Amount in cents
  currency: text('currency').default('USD').notNull(),
  paymentMethod: text('payment_method'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Watch progress table - supports both authenticated and anonymous users
export const watchProgress = pgTable('watch_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // Nullable for anonymous
  anonymousId: text('anonymous_id'), // Nullable for authenticated
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  progressSeconds: integer('progress_seconds').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  completed: boolean('completed').default(false).notNull(),
  lastWatchedAt: timestamp('last_watched_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Video analytics events table - enhanced with user tracking
export const videoAnalyticsEvents = pgTable('video_analytics_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Nullable
  anonymousId: text('anonymous_id'), // Nullable
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  eventType: text('event_type').notNull(), // 'movie_start', 'movie_progress', 'movie_pause', etc.
  progressSeconds: integer('progress_seconds'),
  durationSeconds: integer('duration_seconds'),
  deviceType: text('device_type'),
  source: text('source'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Audit logs table - tracks all content changes by editors/admins
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }).notNull(),
  action: auditActionEnum('action').notNull(),
  entityType: auditEntityTypeEnum('entity_type').notNull(),
  entityId: text('entity_id').notNull(), // UUID or ID of the entity (movie, person, etc.)
  entityName: text('entity_name'), // Human-readable name (movie title, person name, etc.)
  changes: text('changes'), // JSON string of what changed (before/after values)
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Movie release notifications - users request to be notified when a movie becomes available
export const movieNotifications = pgTable('movie_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  notifiedAt: timestamp('notified_at'), // Null until notification sent
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User watchlist - movies users want to watch later
export const userWatchlist = pgTable('user_watchlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type NewOAuthAccount = typeof oauthAccounts.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

export type Rental = typeof rentals.$inferSelect;
export type NewRental = typeof rentals.$inferInsert;

export type WatchProgress = typeof watchProgress.$inferSelect;
export type NewWatchProgress = typeof watchProgress.$inferInsert;

export type VideoAnalyticsEvent = typeof videoAnalyticsEvents.$inferSelect;
export type NewVideoAnalyticsEvent = typeof videoAnalyticsEvents.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type MovieNotification = typeof movieNotifications.$inferSelect;
export type NewMovieNotification = typeof movieNotifications.$inferInsert;

export type UserWatchlistItem = typeof userWatchlist.$inferSelect;
export type NewUserWatchlistItem = typeof userWatchlist.$inferInsert;

export type HomepageSettings = typeof homepageSettings.$inferSelect;
export type NewHomepageSettings = typeof homepageSettings.$inferInsert;
