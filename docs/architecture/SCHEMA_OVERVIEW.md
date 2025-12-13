# Database Schema Overview

Quick reference for the Lao Cinema PostgreSQL database schema.

**ORM**: Drizzle ORM  
**Schema Definition**: `db/src/schema.ts`  
**Migrations**: `db/migrations/`

---

## Entity Relationship Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CONTENT DOMAIN                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌────────────────────────┐
│     movies       │────────>│  movie_translations    │
│  ──────────────  │   1:N   │  ────────────────────  │
│  id (uuid) PK    │         │  movie_id FK           │
│  tmdb_id         │         │  language (en|lo)      │
│  imdb_id         │         │  title ★               │
│  slug            │         │  overview ★            │
│  original_title  │         │  tagline               │
│  poster_path     │         └────────────────────────┘
│  backdrop_path   │
│  release_date    │         ┌────────────────────────┐
│  runtime         │────────>│    movie_images        │
│  vote_average    │   1:N   │  ────────────────────  │
│  availability_   │         │  id (uuid) PK          │
│    status        │         │  movie_id FK           │
└────────┬─────────┘         │  type (poster|backdrop)│
         │                   │  file_path             │
         │                   │  is_primary            │
         │                   └────────────────────────┘
         │
         │                   ┌────────────────────────┐
         ├──────────────────>│    video_sources       │
         │             1:N   │  ────────────────────  │
         │                   │  id (uuid) PK          │
         │                   │  movie_id FK           │
         │                   │  quality (1080p|720p..)│
         │                   │  format (hls|mp4)      │
         │                   │  url                   │
         │                   │  aspect_ratio          │
         │                   │  width, height         │
         │                   └────────────────────────┘
         │
         │                   ┌────────────────────────┐
         ├──────────────────>│      trailers          │
         │             1:N   │  ────────────────────  │
         │                   │  id (uuid) PK          │
         │                   │  movie_id FK           │
         │                   │  type (youtube|video)  │
         │                   │  youtube_key           │
         │                   │  video_url             │
         │                   │  name, official        │
         │                   └────────────────────────┘
         │
         │                   ┌────────────────────────┐
         └──────────────────>│ movie_external_platforms│
                       1:N   │  ────────────────────  │
                             │  id (uuid) PK          │
                             │  movie_id FK           │
                             │  platform (netflix..)  │
                             │  url                   │
                             └────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                              PEOPLE & CREDITS                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌────────────────────────┐
│     people       │────────>│  people_translations   │
│  ──────────────  │   1:N   │  ────────────────────  │
│  id (int) PK     │         │  person_id FK          │
│  profile_path    │         │  language (en|lo)      │
│  birthday        │         │  name ★                │
│  deathday        │         │  biography             │
│  place_of_birth  │         │  nicknames (array)     │
│  known_for_dept  │         └────────────────────────┘
│  popularity      │
│  gender          │         ┌────────────────────────┐
│  imdb_id         │────────>│   person_aliases       │
│  homepage        │   1:N   │  ────────────────────  │
└────────┬─────────┘         │  tmdb_id PK            │
         │                   │  canonical_person_id FK│
         │                   └────────────────────────┘
         │
         │  ┌──────────────────────────────────────────────────────────┐
         │  │                     JUNCTION TABLES                       │
         │  └──────────────────────────────────────────────────────────┘
         │
         │         ┌────────────────────────┐     ┌──────────────────────────┐
         ├────────>│     movie_cast         │────>│ movie_cast_translations  │
         │    N:M  │  ────────────────────  │ 1:N │  ────────────────────    │
         │         │  movie_id FK (PK)      │     │  movie_id FK             │
         │         │  person_id FK (PK)     │     │  person_id FK            │
         │         │  order                 │     │  language (en|lo)        │
         │         └────────────────────────┘     │  character ★             │
         │                                        └──────────────────────────┘
         │
         │         ┌────────────────────────┐     ┌──────────────────────────┐
         └────────>│     movie_crew         │────>│ movie_crew_translations  │
              N:M  │  ────────────────────  │ 1:N │  ────────────────────    │
                   │  movie_id FK (PK)      │     │  movie_id FK             │
                   │  person_id FK (PK)     │     │  person_id FK            │
                   │  department (PK)       │     │  department              │
                   └────────────────────────┘     │  language (en|lo)        │
                                                  │  job ★                   │
                                                  └──────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                              GENRES                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌────────────────────────┐
│     genres       │────────>│  genre_translations    │
│  ──────────────  │   1:N   │  ────────────────────  │
│  id (int) PK     │         │  genre_id FK           │
└────────┬─────────┘         │  language (en|lo)      │
         │                   │  name ★                │
         │                   └────────────────────────┘
         │
         │         ┌────────────────────────┐
         └────────>│    movie_genres        │
              N:M  │  ────────────────────  │
                   │  movie_id FK           │
                   │  genre_id FK           │
                   └────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRODUCTION COMPANIES                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────┐     ┌─────────────────────────────┐
│ production_companies  │────>│ production_company_translations│
│  ───────────────────  │ 1:N │  ─────────────────────────  │
│  id (int) PK          │     │  company_id FK              │
│  slug (unique)        │     │  language (en|lo)           │
│  logo_path            │     │  name ★                     │
│  custom_logo_url      │     └─────────────────────────────┘
│  website_url          │
│  origin_country       │     ┌─────────────────────────────┐
└───────────┬───────────┘────>│ movie_production_companies   │
            │            N:M  │  ─────────────────────────  │
            └─────────────────│  movie_id FK                │
                              │  company_id FK              │
                              │  order                      │
                              └─────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER DOMAIN                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌────────────────────────┐
│     users        │────────>│    user_sessions       │
│  ──────────────  │   1:N   │  ────────────────────  │
│  id (uuid) PK    │         │  id (uuid) PK          │
│  email (unique)  │         │  user_id FK            │
│  password_hash   │         │  token (unique)        │
│  display_name    │         │  expires_at            │
│  role (user|admin)         │  ip_address            │
│  email_verified  │         │  user_agent            │
│  timezone        │         └────────────────────────┘
└────────┬─────────┘
         │                   ┌────────────────────────┐
         ├──────────────────>│    oauth_accounts      │
         │             1:N   │  ────────────────────  │
         │                   │  id (uuid) PK          │
         │                   │  user_id FK            │
         │                   │  provider (google|apple)│
         │                   │  provider_account_id   │
         │                   │  access_token          │
         │                   │  refresh_token         │
         │                   └────────────────────────┘
         │
         │                   ┌────────────────────────┐
         ├──────────────────>│      rentals           │
         │             1:N   │  ────────────────────  │
         │                   │  id (uuid) PK          │
         │                   │  user_id FK (nullable) │◄── Dual-mode
         │                   │  anonymous_id (nullable)│◄── support
         │                   │  movie_id FK           │
         │                   │  purchased_at          │
         │                   │  expires_at            │
         │                   │  transaction_id        │
         │                   │  amount (cents)        │
         │                   │  currency              │
         │                   └────────────────────────┘
         │
         │                   ┌────────────────────────┐
         └──────────────────>│    watch_progress      │
                       1:N   │  ────────────────────  │
                             │  id (uuid) PK          │
                             │  user_id FK (nullable) │◄── Dual-mode
                             │  anonymous_id (nullable)│◄── support
                             │  movie_id FK           │
                             │  progress_seconds      │
                             │  duration_seconds      │
                             │  completed             │
                             │  last_watched_at       │
                             └────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                              HOMEPAGE & ANALYTICS                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────┐         ┌────────────────────────────┐
│  homepage_featured     │         │  video_analytics_events    │
│  ────────────────────  │         │  ────────────────────────  │
│  id (uuid) PK          │         │  id (uuid) PK              │
│  movie_id FK (unique)  │         │  user_id FK (nullable)     │
│  order                 │         │  anonymous_id (nullable)   │
└────────────────────────┘         │  movie_id FK               │
                                   │  event_type                │
                                   │  progress_seconds          │
                                   │  device_type               │
                                   │  timestamp                 │
                                   └────────────────────────────┘

┌────────────────────────┐
│     audit_logs         │
│  ────────────────────  │
│  id (uuid) PK          │
│  user_id FK            │
│  action (enum)         │
│  entity_type (enum)    │
│  entity_id             │
│  entity_name           │
│  changes (JSON)        │
│  ip_address            │
│  user_agent            │
│  created_at            │
└────────────────────────┘
```

★ = LocalizedText field (stored in translation table)

---

## Enums

```typescript
// Language support
type Language = 'en' | 'lo';

// Video
type VideoFormat = 'mp4' | 'hls' | 'dash';
type VideoQuality = 'original' | '1080p' | '720p' | '480p' | '360p';
type TrailerType = 'youtube' | 'video';

// Images
type ImageType = 'poster' | 'backdrop' | 'logo';

// Availability
type AvailabilityStatus = 'auto' | 'available' | 'external' | 'unavailable' | 'coming_soon';

// External Platforms
type StreamingPlatform = 'netflix' | 'prime' | 'disney' | 'hbo' | 'apple' | 'hulu' | 'other';

// Auth
type UserRole = 'user' | 'editor' | 'admin';
type AuthProvider = 'email' | 'google' | 'apple';

// Audit
type AuditAction = 'create' | 'update' | 'delete' | 'add_cast' | 'remove_cast' | 
  'add_crew' | 'remove_crew' | 'add_image' | 'remove_image' | 'set_primary_image' |
  'add_video' | 'remove_video' | 'add_genre' | 'remove_genre' | 
  'add_production_company' | 'remove_production_company' | 'merge_people' | ...;
type AuditEntityType = 'movie' | 'person' | 'genre' | 'production_company' | 'user' | 'settings';
```

---

## Tables with LocalizedText

These tables store bilingual content:

| Table | LocalizedText Fields |
|-------|---------------------|
| `movie_translations` | `title`, `overview`, `tagline` |
| `people_translations` | `name`, `biography`, `nicknames` (array) |
| `genre_translations` | `name` |
| `movie_cast_translations` | `character` |
| `movie_crew_translations` | `job` |
| `production_company_translations` | `name` |

**Pattern**: Main table + `_translations` table with composite PK (entity_id, language).

---

## Foreign Key Behaviors

| Relationship | On Delete |
|-------------|-----------|
| `movies` → translations | CASCADE |
| `movies` → images | CASCADE |
| `movies` → video_sources | CASCADE |
| `movies` → external_platforms | CASCADE |
| `movies` → homepage_featured | CASCADE |
| `people` → translations | CASCADE |
| `users` → sessions | CASCADE |
| `users` → oauth_accounts | CASCADE |
| `users` → rentals | CASCADE |
| `users` → watch_progress | CASCADE |
| `users` → video_analytics_events | SET NULL |

---

## ID Conventions

| Table | ID Type | Notes |
|-------|---------|-------|
| `movies` | UUID | Auto-generated |
| `people` | Integer | TMDB ID (positive), Manual (negative) |
| `genres` | Integer | TMDB genre ID |
| `users` | UUID | Auto-generated |
| All other | UUID | Auto-generated |

**Why negative IDs for manual people?**
- Distinguishes manually-created people from TMDB imports
- Prevents ID collisions if TMDB person is imported later
- Generated as `MIN(existing_ids) - 1` or `-1` if table empty

---

## Common Query Patterns

### Get movie with all translations
```typescript
const movie = await db.select().from(movies).where(eq(movies.id, id));
const translations = await db.select()
  .from(movieTranslations)
  .where(eq(movieTranslations.movieId, id));
```

### Get movie with cast (using builder)
```typescript
import { buildMovieWithRelations } from '../lib/movie-builder.js';

const movieData = await buildMovieWithRelations(movie, db, schema, {
  includeCast: true,
  includeCrew: true,
  includeGenres: true,
  castLimit: 10,
});
```

### Dual-mode user/anonymous query
```typescript
const whereClause = userId 
  ? eq(rentals.userId, userId)
  : eq(rentals.anonymousId, anonymousId);

const userRentals = await db.select()
  .from(rentals)
  .where(whereClause);
```

---

## Migration History

| Migration | Description |
|-----------|-------------|
| 0000 | Initial schema (movies, people, genres) |
| 0001 | Add video_sources |
| 0002 | Add movie_images |
| 0003 | Add homepage_featured |
| 0004 | Add external_platforms |
| 0005 | Add slug to movies |
| 0006 | Add availability_status |
| 0007 | Add video source dimensions (width, height) |
| 0008-0010 | Availability status refinements |
| 0011 | Add user accounts, sessions, rentals, watch_progress |
| 0012-0014 | Production companies and movie associations |
| 0015 | Add auto availability status |
| 0016 | Additional schema refinements |
| 0017-0018 | Add person nicknames, trailers table |
| 0019-0020 | Audit logs and person aliases |

**Total migrations**: 22 (0000-0020)

Run migrations:
```bash
cd db
npm run db:migrate
```

---

## Tips for AI Assistants

1. **Always check translation tables** - Movie titles, person names, etc. are in separate tables
2. **Use the movie-builder** - Don't manually join all tables; use `buildMovieWithRelations()`
3. **Dual-mode awareness** - Rentals and watch_progress support both `userId` and `anonymousId`
4. **Cascade deletes** - Deleting a movie removes all related data automatically
5. **Negative IDs** - Manual people have negative IDs; don't assume all person IDs are positive
6. **Person aliases** - Check `person_aliases` before creating people to prevent duplicates from TMDB sync
7. **Audit logging** - Content changes are tracked in `audit_logs` for editor/admin accountability
8. **Three user roles** - `user` (viewers), `editor` (content management), `admin` (full access)
