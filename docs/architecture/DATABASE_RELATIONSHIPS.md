# Database Relationships

Visual reference for table relationships and cascade effects.

**Source**: `db/src/schema.ts` (748 lines, 43 migrations)

---

## Core Content Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                           MOVIES                                 │
│  id (UUID, PK)                                                  │
│  tmdb_id, slug, type (feature/short)                           │
└─────────────────────────────────────────────────────────────────┘
        │
        │ CASCADE DELETE →
        │
        ├──► movie_translations (movieId, language) [PK composite]
        ├──► movie_images (movieId)
        ├──► movie_genres (movieId, genreId) → genres
        ├──► video_sources (movieId)
        ├──► subtitle_tracks (movieId)
        ├──► trailers (movieId)
        ├──► movie_external_platforms (movieId)
        ├──► movie_production_companies (movieId) → production_companies
        ├──► homepage_featured (movieId) [unique]
        │
        │ Cast & Crew (through people)
        ├──► movie_cast (movieId, personId) [PK composite]
        │       └──► movie_cast_translations (movieId, personId, language)
        └──► movie_crew (movieId, personId, department) [PK composite]
                └──► movie_crew_translations (movieId, personId, dept, language)
```

---

## People Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                           PEOPLE                                 │
│  id (INTEGER, PK) - TMDB ID or negative for manual              │
│  known_for_department, birthday, profile_path                   │
└─────────────────────────────────────────────────────────────────┘
        │
        │ CASCADE DELETE →
        │
        ├──► people_translations (personId, language) [PK composite]
        ├──► person_images (personId)
        ├──► person_aliases (canonical_person_id) - merged TMDB IDs
        ├──► movie_cast (personId) → movies
        │       └──► movie_cast_translations
        └──► movie_crew (personId) → movies
                └──► movie_crew_translations
```

---

## Genre Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                           GENRES                                 │
│  id (INTEGER, PK) - TMDB ID or negative for custom              │
│  is_visible (controls UI display)                               │
└─────────────────────────────────────────────────────────────────┘
        │
        │ CASCADE DELETE →
        │
        ├──► genre_translations (genreId, language) [PK composite]
        └──► movie_genres (genreId) → movies
```

---

## User & Auth Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                           USERS                                  │
│  id (UUID, PK)                                                  │
│  email, password_hash, role (user/editor/admin)                 │
└─────────────────────────────────────────────────────────────────┘
        │
        │ CASCADE DELETE →
        │
        ├──► user_sessions (userId) - auth tokens
        ├──► oauth_accounts (userId) - Google/Apple links
        ├──► password_reset_tokens (userId)
        ├──► email_verification_tokens (userId)
        ├──► rentals (userId) - nullable for anonymous
        ├──► watch_progress (userId) - nullable for anonymous
        ├──► user_watchlist (userId)
        ├──► movie_notifications (userId)
        │
        │ SET NULL on delete →
        ├──► video_analytics_events (userId)
        └──► audit_logs (userId)
```

---

## Short Packs

```
┌─────────────────────────────────────────────────────────────────┐
│                       SHORT_PACKS                                │
│  id (UUID, PK)                                                  │
│  slug, is_published                                             │
└─────────────────────────────────────────────────────────────────┘
        │
        │ CASCADE DELETE →
        │
        ├──► short_pack_translations (packId, language) [PK composite]
        ├──► short_pack_items (packId, movieId) → movies
        └──► rentals (short_pack_id) - pack rentals
```

---

## Awards System

```
┌─────────────────────────────────────────────────────────────────┐
│                       AWARD_SHOWS                                │
│  id (UUID, PK)                                                  │
│  slug, country, city                                            │
└─────────────────────────────────────────────────────────────────┘
        │
        │ CASCADE DELETE →
        │
        ├──► award_show_translations (showId, language)
        ├──► award_editions (showId) ─┐
        │       └──► award_edition_translations
        │                              │
        └──► award_categories (showId) │
                └──► award_category_translations
                               │
                               ▼
                    award_nominations (editionId, categoryId)
                        ├──► personId → people (nullable)
                        ├──► movieId → movies (nullable)
                        ├──► forMovieId → movies (SET NULL)
                        └──► award_nomination_translations
```

---

## Production Companies

```
┌─────────────────────────────────────────────────────────────────┐
│                   PRODUCTION_COMPANIES                           │
│  id (INTEGER, PK) - TMDB ID or negative for manual              │
│  slug, logo_path, website_url                                   │
└─────────────────────────────────────────────────────────────────┘
        │
        │ CASCADE DELETE →
        │
        ├──► production_company_translations (companyId, language)
        └──► movie_production_companies (companyId) → movies
```

---

## Key Constraints & Rules

### Dual-Mode Tables (userId XOR anonymousId)
These tables support both authenticated and anonymous users:
- `rentals` - One of userId/anonymousId must be set
- `watch_progress` - One of userId/anonymousId must be set
- `video_analytics_events` - Both can be null

### Composite Primary Keys
Most junction and translation tables use composite PKs:
```sql
-- Translation tables
PRIMARY KEY (entity_id, language)

-- Junction tables
PRIMARY KEY (movie_id, person_id)
PRIMARY KEY (movie_id, person_id, department)  -- crew has 3-part key
```

### Delete Behavior
| Relationship | Behavior | Example |
|--------------|----------|---------|
| CASCADE | Deletes related rows | Deleting movie deletes all translations |
| SET NULL | Sets FK to null | Deleting movie sets nomination.forMovieId to null |

### ID Conventions
| Entity | ID Type | Notes |
|--------|---------|-------|
| movies | UUID | Auto-generated |
| people | INTEGER | Positive = TMDB, Negative = manual |
| genres | INTEGER | Positive = TMDB, Negative = custom |
| production_companies | INTEGER | Positive = TMDB, Negative = manual |
| users | UUID | Auto-generated |

---

## Table Truncation Order (for tests)

When cleaning up test data, respect foreign key dependencies:

```sql
-- 1. User-related (can be independent)
TRUNCATE user_sessions, oauth_accounts, password_reset_tokens,
         email_verification_tokens, user_watchlist, movie_notifications CASCADE;

-- 2. User data tables
TRUNCATE rentals, watch_progress, video_analytics_events, audit_logs CASCADE;

-- 3. Content junction tables
TRUNCATE movie_cast_translations, movie_crew_translations,
         movie_cast, movie_crew, movie_genres, movie_images,
         video_sources, subtitle_tracks, trailers,
         movie_external_platforms, movie_production_companies,
         homepage_featured CASCADE;

-- 4. Translation tables
TRUNCATE movie_translations, people_translations,
         genre_translations, production_company_translations CASCADE;

-- 5. Awards
TRUNCATE award_nomination_translations, award_nominations,
         award_category_translations, award_categories,
         award_edition_translations, award_editions,
         award_show_translations, award_shows CASCADE;

-- 6. Short packs
TRUNCATE short_pack_items, short_pack_translations, short_packs CASCADE;

-- 7. Core tables (last)
TRUNCATE movies, people, genres, production_companies, users CASCADE;
```

Or simply:
```sql
TRUNCATE TABLE users, movies RESTART IDENTITY CASCADE;
```

---

## Related Files

- `db/src/schema.ts` - Full schema definitions
- `db/migrations/` - 43 migration files
- `api/src/test/fixtures.ts` - Test data creation utilities
