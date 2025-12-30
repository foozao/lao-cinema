import { pgTable, text, integer, real, boolean, timestamp, uuid, pgEnum, primaryKey } from "drizzle-orm/pg-core";
const languageEnum = pgEnum("language", ["en", "lo"]);
const videoFormatEnum = pgEnum("video_format", ["mp4", "hls", "dash"]);
const videoQualityEnum = pgEnum("video_quality", ["original", "1080p", "720p", "480p", "360p"]);
const imageTypeEnum = pgEnum("image_type", ["poster", "backdrop", "logo"]);
const streamingPlatformEnum = pgEnum("streaming_platform", ["netflix", "prime", "disney", "hbo", "apple", "hulu", "other"]);
const availabilityStatusEnum = pgEnum("availability_status", ["auto", "available", "external", "unavailable", "coming_soon"]);
const userRoleEnum = pgEnum("user_role", ["user", "editor", "admin"]);
const authProviderEnum = pgEnum("auth_provider", ["email", "google", "apple"]);
const trailerTypeEnum = pgEnum("trailer_type", ["youtube", "video"]);
const movieTypeEnum = pgEnum("movie_type", ["feature", "short"]);
const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "add_cast",
  "remove_cast",
  "update_cast",
  "add_crew",
  "remove_crew",
  "update_crew",
  "add_image",
  "remove_image",
  "set_primary_image",
  "add_video",
  "remove_video",
  "update_video",
  "add_subtitle",
  "remove_subtitle",
  "update_subtitle",
  "add_genre",
  "remove_genre",
  "add_production_company",
  "remove_production_company",
  "add_platform",
  "remove_platform",
  "update_platform",
  "feature_movie",
  "unfeature_movie",
  "merge_people",
  "update_person"
]);
const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "movie",
  "person",
  "genre",
  "production_company",
  "user",
  "settings"
]);
const movies = pgTable("movies", {
  id: uuid("id").defaultRandom().primaryKey(),
  tmdbId: integer("tmdb_id").unique(),
  imdbId: text("imdb_id").unique(),
  slug: text("slug").unique(),
  // Vanity URL slug (e.g., 'the-signal')
  type: movieTypeEnum("type").default("feature").notNull(),
  // 'feature' or 'short'
  originalTitle: text("original_title").notNull(),
  originalLanguage: text("original_language"),
  // Media paths
  posterPath: text("poster_path"),
  backdropPath: text("backdrop_path"),
  // Details
  releaseDate: text("release_date"),
  runtime: integer("runtime"),
  voteAverage: real("vote_average").default(0),
  voteCount: integer("vote_count").default(0),
  popularity: real("popularity").default(0),
  adult: boolean("adult").default(false),
  // Availability ('auto' = uses smart defaults based on video_sources and external_platforms)
  availabilityStatus: availabilityStatusEnum("availability_status").default("auto"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const movieTranslations = pgTable("movie_translations", {
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  language: languageEnum("language").notNull(),
  title: text("title").notNull(),
  overview: text("overview").notNull(),
  tagline: text("tagline"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.language] })
}));
const movieImages = pgTable("movie_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  type: imageTypeEnum("type").notNull(),
  filePath: text("file_path").notNull(),
  // TMDB image path
  aspectRatio: real("aspect_ratio"),
  height: integer("height"),
  width: integer("width"),
  iso6391: text("iso_639_1"),
  // Language code for poster (null for no language)
  voteAverage: real("vote_average"),
  voteCount: integer("vote_count"),
  isPrimary: boolean("is_primary").default(false),
  // Primary poster/backdrop to display
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const genres = pgTable("genres", {
  id: integer("id").primaryKey(),
  isVisible: boolean("is_visible").default(true).notNull()
  // Control which genres show in UI
});
const genreTranslations = pgTable("genre_translations", {
  genreId: integer("genre_id").references(() => genres.id, { onDelete: "cascade" }).notNull(),
  language: languageEnum("language").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.genreId, table.language] })
}));
const movieGenres = pgTable("movie_genres", {
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  genreId: integer("genre_id").references(() => genres.id, { onDelete: "cascade" }).notNull()
});
const people = pgTable("people", {
  id: integer("id").primaryKey(),
  // TMDB person ID
  profilePath: text("profile_path"),
  birthday: text("birthday"),
  // ISO date string
  deathday: text("deathday"),
  // ISO date string
  placeOfBirth: text("place_of_birth"),
  knownForDepartment: text("known_for_department"),
  // Acting, Directing, etc.
  popularity: real("popularity").default(0),
  gender: integer("gender"),
  // 0=unknown, 1=female, 2=male, 3=non-binary
  imdbId: text("imdb_id"),
  homepage: text("homepage"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const peopleTranslations = pgTable("people_translations", {
  personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }).notNull(),
  language: languageEnum("language").notNull(),
  name: text("name").notNull(),
  biography: text("biography"),
  nicknames: text("nicknames").array(),
  // Array of nicknames in this language
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.personId, table.language] })
}));
const personImages = pgTable("person_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }).notNull(),
  filePath: text("file_path").notNull(),
  // Image path (TMDB or uploaded)
  aspectRatio: real("aspect_ratio"),
  height: integer("height"),
  width: integer("width"),
  voteAverage: real("vote_average"),
  voteCount: integer("vote_count"),
  isPrimary: boolean("is_primary").default(false),
  // Primary profile photo to display
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const personAliases = pgTable("person_aliases", {
  tmdbId: integer("tmdb_id").primaryKey(),
  // The TMDB ID that was merged away
  canonicalPersonId: integer("canonical_person_id").references(() => people.id, { onDelete: "cascade" }).notNull(),
  // The person it was merged into
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const movieCast = pgTable("movie_cast", {
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }).notNull(),
  order: integer("order").notNull(),
  // Billing order
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.personId] })
}));
const movieCastTranslations = pgTable("movie_cast_translations", {
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }).notNull(),
  language: languageEnum("language").notNull(),
  character: text("character").notNull(),
  // Character name
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.personId, table.language] })
}));
const movieCrew = pgTable("movie_crew", {
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }).notNull(),
  department: text("department").notNull(),
  // Production, Directing, Writing, etc.
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.personId, table.department] })
}));
const movieCrewTranslations = pgTable("movie_crew_translations", {
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }).notNull(),
  department: text("department").notNull(),
  language: languageEnum("language").notNull(),
  job: text("job").notNull(),
  // Director, Producer, Writer, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.personId, table.department, table.language] })
}));
const videoSources = pgTable("video_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  quality: videoQualityEnum("quality").notNull(),
  format: videoFormatEnum("format").notNull(),
  url: text("url").notNull(),
  sizeBytes: integer("size_bytes"),
  width: integer("width"),
  height: integer("height"),
  aspectRatio: text("aspect_ratio"),
  // e.g., '16:9', '2.35:1', 'mixed'
  // Burned-in (hardcoded) subtitles - permanently part of video file
  hasBurnedSubtitles: boolean("has_burned_subtitles").default(false).notNull(),
  burnedSubtitlesLanguage: text("burned_subtitles_language"),
  // ISO 639-1 code (e.g., 'en', 'lo', 'th')
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const subtitleTracks = pgTable("subtitle_tracks", {
  id: uuid("id").defaultRandom().primaryKey(),
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  language: text("language").notNull(),
  // ISO 639-1 code (en, lo, th, etc.)
  label: text("label").notNull(),
  // Display name (e.g., 'English', 'ລາວ', 'ไทย')
  url: text("url").notNull(),
  // URL to .vtt file
  isDefault: boolean("is_default").default(false).notNull(),
  // Default subtitle track
  kind: text("kind").default("subtitles").notNull(),
  // 'subtitles', 'captions', 'descriptions'
  linePosition: integer("line_position").default(85).notNull(),
  // VTT line position (0-100%, default 85 = bottom)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const trailers = pgTable("trailers", {
  id: uuid("id").defaultRandom().primaryKey(),
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  type: trailerTypeEnum("type").notNull(),
  // YouTube trailer fields
  youtubeKey: text("youtube_key"),
  // Video file trailer fields
  videoUrl: text("video_url"),
  videoFormat: videoFormatEnum("video_format"),
  videoQuality: videoQualityEnum("video_quality"),
  sizeBytes: integer("size_bytes"),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: integer("duration_seconds"),
  thumbnailUrl: text("thumbnail_url"),
  // Thumbnail image for video trailers
  // Common fields
  name: text("name").notNull(),
  official: boolean("official").default(false),
  language: text("language"),
  // ISO 639-1 language code
  publishedAt: text("published_at"),
  order: integer("order").default(0),
  // Display order
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const homepageFeatured = pgTable("homepage_featured", {
  id: uuid("id").defaultRandom().primaryKey(),
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull().unique(),
  order: integer("order").notNull(),
  // Display order on homepage
  heroStartTime: integer("hero_start_time"),
  // Start time in seconds for hero trailer clip
  heroEndTime: integer("hero_end_time"),
  // End time in seconds for hero trailer clip
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const heroTypeEnum = pgEnum("hero_type", ["disabled", "video", "image"]);
const homepageSettings = pgTable("homepage_settings", {
  id: integer("id").primaryKey().default(1),
  // Single row table
  randomizeFeatured: boolean("randomize_featured").default(false).notNull(),
  // Randomize featured films order
  heroType: heroTypeEnum("hero_type").default("video").notNull(),
  // Hero section style
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const movieExternalPlatforms = pgTable("movie_external_platforms", {
  id: uuid("id").defaultRandom().primaryKey(),
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  platform: streamingPlatformEnum("platform").notNull(),
  url: text("url"),
  // Optional link to the film on that platform
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const productionCompanies = pgTable("production_companies", {
  id: integer("id").primaryKey(),
  // Use TMDB ID or negative for manual entries
  slug: text("slug").unique(),
  // Vanity URL (e.g., /production/hoppin-film)
  logoPath: text("logo_path"),
  // TMDB logo path
  customLogoUrl: text("custom_logo_url"),
  // User-uploaded logo URL
  websiteUrl: text("website_url"),
  // Company website
  originCountry: text("origin_country"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const productionCompanyTranslations = pgTable("production_company_translations", {
  companyId: integer("company_id").references(() => productionCompanies.id, { onDelete: "cascade" }).notNull(),
  language: languageEnum("language").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.companyId, table.language] })
}));
const movieProductionCompanies = pgTable("movie_production_companies", {
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  companyId: integer("company_id").references(() => productionCompanies.id, { onDelete: "cascade" }).notNull(),
  order: integer("order").default(0),
  // Display order
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.movieId, table.companyId] })
}));
const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  // Nullable for OAuth-only accounts
  displayName: text("display_name"),
  profileImageUrl: text("profile_image_url"),
  timezone: text("timezone").default("Asia/Vientiane"),
  // IANA timezone
  preferredSubtitleLanguage: text("preferred_subtitle_language"),
  // ISO 639-1 code (en, lo, th, etc.)
  alwaysShowSubtitles: boolean("always_show_subtitles").default(false).notNull(),
  // Show subtitles even if movie is in preferred language
  role: userRoleEnum("role").default("user").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
  deletedAt: timestamp("deleted_at")
  // Soft-delete: when set, user is considered deleted and PII is anonymized
});
const oauthAccounts = pgTable("oauth_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: authProviderEnum("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  // OAuth provider's user ID
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const userSessions = pgTable("user_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent")
});
const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  // Null until token is used
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  // Null until token is used
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const shortPacks = pgTable("short_packs", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").unique(),
  // Vanity URL (e.g., 'lao-voices-2024')
  // Media paths
  posterPath: text("poster_path"),
  backdropPath: text("backdrop_path"),
  // Status
  isPublished: boolean("is_published").default(false).notNull(),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const shortPackTranslations = pgTable("short_pack_translations", {
  packId: uuid("pack_id").references(() => shortPacks.id, { onDelete: "cascade" }).notNull(),
  language: languageEnum("language").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  tagline: text("tagline"),
  // Short promotional text
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.packId, table.language] })
}));
const shortPackItems = pgTable("short_pack_items", {
  packId: uuid("pack_id").references(() => shortPacks.id, { onDelete: "cascade" }).notNull(),
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  order: integer("order").notNull(),
  // Display/playback order within the pack
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.packId, table.movieId] })
}));
const rentals = pgTable("rentals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  // Nullable for anonymous
  anonymousId: text("anonymous_id"),
  // Nullable for authenticated
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }),
  // Nullable if renting a pack
  shortPackId: uuid("short_pack_id").references(() => shortPacks.id, { onDelete: "cascade" }),
  // Nullable if renting a movie
  currentShortId: uuid("current_short_id").references(() => movies.id, { onDelete: "set null" }),
  // For pack rentals: tracks which short is currently being watched
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  transactionId: text("transaction_id").notNull(),
  amount: integer("amount").notNull(),
  // Amount in cents
  currency: text("currency").default("USD").notNull(),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const watchProgress = pgTable("watch_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  // Nullable for anonymous
  anonymousId: text("anonymous_id"),
  // Nullable for authenticated
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  progressSeconds: integer("progress_seconds").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  completed: boolean("completed").default(false).notNull(),
  lastWatchedAt: timestamp("last_watched_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const videoAnalyticsEvents = pgTable("video_analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  // Nullable
  anonymousId: text("anonymous_id"),
  // Nullable
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  eventType: text("event_type").notNull(),
  // 'movie_start', 'movie_progress', 'movie_pause', etc.
  progressSeconds: integer("progress_seconds"),
  durationSeconds: integer("duration_seconds"),
  deviceType: text("device_type"),
  source: text("source"),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});
const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }).notNull(),
  action: auditActionEnum("action").notNull(),
  entityType: auditEntityTypeEnum("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  // UUID or ID of the entity (movie, person, etc.)
  entityName: text("entity_name"),
  // Human-readable name (movie title, person name, etc.)
  changes: text("changes"),
  // JSON string of what changed (before/after values)
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const movieNotifications = pgTable("movie_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  notifiedAt: timestamp("notified_at"),
  // Null until notification sent
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const userWatchlist = pgTable("user_watchlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const awardNomineeTypeEnum = pgEnum("award_nominee_type", ["person", "movie"]);
const awardShows = pgTable("award_shows", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").unique(),
  // Vanity URL (e.g., 'lpff')
  country: text("country"),
  // ISO 3166-1 country code
  city: text("city"),
  websiteUrl: text("website_url"),
  logoPath: text("logo_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const awardShowTranslations = pgTable("award_show_translations", {
  showId: uuid("show_id").references(() => awardShows.id, { onDelete: "cascade" }).notNull(),
  language: languageEnum("language").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.showId, table.language] })
}));
const awardEditions = pgTable("award_editions", {
  id: uuid("id").defaultRandom().primaryKey(),
  showId: uuid("show_id").references(() => awardShows.id, { onDelete: "cascade" }).notNull(),
  year: integer("year").notNull(),
  // The year of this edition
  editionNumber: integer("edition_number"),
  // Optional edition number (e.g., "14th Annual")
  startDate: text("start_date"),
  // ISO date string
  endDate: text("end_date"),
  // ISO date string
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const awardEditionTranslations = pgTable("award_edition_translations", {
  editionId: uuid("edition_id").references(() => awardEditions.id, { onDelete: "cascade" }).notNull(),
  language: languageEnum("language").notNull(),
  name: text("name"),
  // Optional override name (e.g., "Special Anniversary Edition")
  theme: text("theme"),
  // Optional theme for this edition
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.editionId, table.language] })
}));
const awardCategories = pgTable("award_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  showId: uuid("show_id").references(() => awardShows.id, { onDelete: "cascade" }).notNull(),
  nomineeType: awardNomineeTypeEnum("nominee_type").notNull(),
  // 'person' or 'movie'
  sortOrder: integer("sort_order").default(0),
  // Display order
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const awardCategoryTranslations = pgTable("award_category_translations", {
  categoryId: uuid("category_id").references(() => awardCategories.id, { onDelete: "cascade" }).notNull(),
  language: languageEnum("language").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.categoryId, table.language] })
}));
const awardNominations = pgTable("award_nominations", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionId: uuid("edition_id").references(() => awardEditions.id, { onDelete: "cascade" }).notNull(),
  categoryId: uuid("category_id").references(() => awardCategories.id, { onDelete: "cascade" }).notNull(),
  // The nominee - either a person OR a movie (based on category's nomineeType)
  personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }),
  // Nullable
  movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }),
  // Nullable
  // For person nominations, optionally link to the movie they're nominated for
  forMovieId: uuid("for_movie_id").references(() => movies.id, { onDelete: "set null" }),
  isWinner: boolean("is_winner").default(false).notNull(),
  sortOrder: integer("sort_order").default(0),
  // Display order within category
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const awardNominationTranslations = pgTable("award_nomination_translations", {
  nominationId: uuid("nomination_id").references(() => awardNominations.id, { onDelete: "cascade" }).notNull(),
  language: languageEnum("language").notNull(),
  workTitle: text("work_title"),
  // Custom work title if different from movie title
  notes: text("notes"),
  // Additional notes about the nomination
  recognitionType: text("recognition_type"),
  // E.g., "Special Mention", "Honorable Mention", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.nominationId, table.language] })
}));
export {
  auditActionEnum,
  auditEntityTypeEnum,
  auditLogs,
  authProviderEnum,
  availabilityStatusEnum,
  awardCategories,
  awardCategoryTranslations,
  awardEditionTranslations,
  awardEditions,
  awardNominationTranslations,
  awardNominations,
  awardNomineeTypeEnum,
  awardShowTranslations,
  awardShows,
  emailVerificationTokens,
  genreTranslations,
  genres,
  heroTypeEnum,
  homepageFeatured,
  homepageSettings,
  imageTypeEnum,
  languageEnum,
  movieCast,
  movieCastTranslations,
  movieCrew,
  movieCrewTranslations,
  movieExternalPlatforms,
  movieGenres,
  movieImages,
  movieNotifications,
  movieProductionCompanies,
  movieTranslations,
  movieTypeEnum,
  movies,
  oauthAccounts,
  passwordResetTokens,
  people,
  peopleTranslations,
  personAliases,
  personImages,
  productionCompanies,
  productionCompanyTranslations,
  rentals,
  shortPackItems,
  shortPackTranslations,
  shortPacks,
  streamingPlatformEnum,
  subtitleTracks,
  trailerTypeEnum,
  trailers,
  userRoleEnum,
  userSessions,
  userWatchlist,
  users,
  videoAnalyticsEvents,
  videoFormatEnum,
  videoQualityEnum,
  videoSources,
  watchProgress
};
