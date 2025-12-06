# Data Flow Architecture

Visual guide to how data flows through the Lao Cinema platform.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
│                            http://localhost:3000                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Pages              │  Components           │  Services                      │
│  ───────            │  ───────────          │  ────────                      │
│  /[locale]/         │  VideoPlayer          │  lib/api.ts (API client)       │
│  /movies/[id]       │  MovieCard            │  lib/rental.ts                 │
│  /movies/[id]/watch │  PaymentModal         │  lib/analytics/                │
│  /admin/*           │  Header/Footer        │  lib/video/ (hooks)            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP (REST)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Fastify)                               │
│                            http://localhost:3001                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Routes             │  Middleware           │  Services                      │
│  ──────             │  ──────────           │  ────────                      │
│  /api/movies        │  requireAuth          │  auth-service.ts               │
│  /api/people        │  requireAuthOrAnon    │  movie-builder.ts              │
│  /api/rentals       │  optionalAuth         │  movie-helpers.ts              │
│  /api/auth          │                       │                                │
│  /api/watch-progress│                       │                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Drizzle ORM
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE (PostgreSQL)                             │
│                            localhost:5432                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Content Tables     │  User Tables          │  Junction Tables               │
│  ──────────────     │  ───────────          │  ──────────────                │
│  movies             │  users                │  movie_genres                  │
│  movie_translations │  user_sessions        │  movie_cast                    │
│  people             │  oauth_accounts       │  movie_crew                    │
│  people_translations│  rentals              │  movie_cast_translations       │
│  genres             │  watch_progress       │  movie_crew_translations       │
│  video_sources      │  video_analytics      │  homepage_featured             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Data Flows

### 1. Movie Import from TMDB

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│    TMDB     │      │   Admin     │      │   Backend   │      │  Database   │
│    API      │      │   Panel     │      │   API       │      │             │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │                    │
       │  1. Fetch movie    │                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
       │  2. Return data    │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │  3. POST /movies   │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │                    │  4. Insert:        │
       │                    │                    │  - movies          │
       │                    │                    │  - translations    │
       │                    │                    │  - people          │
       │                    │                    │  - cast/crew       │
       │                    │                    │  - genres          │
       │                    │                    │  - images          │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │  5. Return movie   │                    │
       │                    │<───────────────────│                    │
       │                    │                    │                    │
       │                    │  6. Redirect to    │                    │
       │                    │     edit page      │                    │
       │                    │                    │                    │
```

**Key Points:**
- TMDB data is fetched client-side in admin panel
- Backend receives pre-processed data with English translations
- Lao translations added manually via edit page
- People are created if they don't exist (uses TMDB IDs)

---

### 2. Video Playback Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │      │   Backend   │      │    GCS      │      │  Database   │
│   Player    │      │   API       │      │   Bucket    │      │             │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │                    │
       │  1. GET movie      │                    │                    │
       │───────────────────>│                    │                    │
       │                    │  2. Query          │                    │
       │                    │───────────────────────────────────────>│
       │                    │                    │                    │
       │  3. Return movie   │                    │                    │
       │     + video_sources│                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
       │  4. Request HLS    │                    │                    │
       │     master.m3u8    │                    │                    │
       │─────────────────────────────────────────>│                    │
       │                    │                    │                    │
       │  5. Return playlist│                    │                    │
       │<─────────────────────────────────────────│                    │
       │                    │                    │                    │
       │  6. Request chunks │                    │                    │
       │─────────────────────────────────────────>│                    │
       │                    │                    │                    │
       │  7. Stream video   │                    │                    │
       │<─────────────────────────────────────────│                    │
       │                    │                    │                    │
```

**Video Source Resolution:**
```
Dev environment:  /videos/hls/{movie_slug}/master.m3u8 (local)
Prod environment: https://storage.googleapis.com/lao-cinema-videos/... (GCS)
```

**HLS Quality Variants:**
- 1080p (5000kbps)
- 720p (2800kbps)
- 480p (1400kbps)
- 360p (800kbps)

---

### 3. Rental Purchase Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │      │  Payment    │      │   Backend   │      │  Database   │
│             │      │  Provider   │      │   API       │      │             │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │                    │
       │  1. Click "Rent"   │                    │                    │
       │  Open PaymentModal │                    │                    │
       │                    │                    │                    │
       │  2. Process payment│                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │  3. Return txn_id  │                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
       │  4. POST /rentals/:movieId              │                    │
       │     { transactionId, amount }           │                    │
       │────────────────────────────────────────>│                    │
       │                    │                    │                    │
       │                    │                    │  5. Check existing │
       │                    │                    │     rental         │
       │                    │                    │<──────────────────>│
       │                    │                    │                    │
       │                    │                    │  6. Create rental  │
       │                    │                    │     (24hr expiry)  │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │  7. Return rental  │                    │                    │
       │<────────────────────────────────────────│                    │
       │                    │                    │                    │
       │  8. Redirect to    │                    │                    │
       │     watch page     │                    │                    │
       │                    │                    │                    │
```

**Rental Validation on Watch Page:**
```
1. Page loads → Check rental via GET /rentals/:movieId
2. If no rental or expired → Redirect to movie page with ?rental=required
3. Movie page detects param → Auto-open PaymentModal
```

---

### 4. Watch Progress Tracking

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Video     │      │   Backend   │      │  Database   │
│   Player    │      │   API       │      │             │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │  1. Video starts   │                    │
       │     Load saved     │                    │
       │     position       │                    │
       │───────────────────>│                    │
       │                    │  2. Query progress │
       │                    │───────────────────>│
       │                    │                    │
       │  3. Return progress│                    │
       │     (if exists)    │                    │
       │<───────────────────│                    │
       │                    │                    │
       │  4. Show "Continue │                    │
       │     watching?"     │                    │
       │     dialog         │                    │
       │                    │                    │
       │  ... playback ...  │                    │
       │                    │                    │
       │  5. Every 30s:     │                    │
       │     PUT progress   │                    │
       │───────────────────>│                    │
       │                    │  6. Upsert         │
       │                    │───────────────────>│
       │                    │                    │
       │  7. On pause/exit: │                    │
       │     Save final     │                    │
       │     position       │                    │
       │───────────────────>│                    │
       │                    │                    │
```

**Progress Data:**
- `progressSeconds`: Current playback position
- `durationSeconds`: Total video length
- `completed`: Auto-set true if >90% watched
- `lastWatchedAt`: Timestamp for "Continue Watching" sorting

---

### 5. Anonymous → Authenticated Migration

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │      │   Backend   │      │  Database   │
│             │      │   API       │      │             │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │  1. User has been  │                    │
       │     browsing with  │                    │
       │     anonymousId    │                    │
       │     (localStorage) │                    │
       │                    │                    │
       │  2. User registers │                    │
       │     POST /auth/reg │                    │
       │───────────────────>│                    │
       │                    │                    │
       │  3. Return session │                    │
       │<───────────────────│                    │
       │                    │                    │
       │  4. POST /users/   │                    │
       │     migrate        │                    │
       │     { anonymousId }│                    │
       │───────────────────>│                    │
       │                    │  5. UPDATE rentals │
       │                    │     SET userId,    │
       │                    │     anonymousId=null│
       │                    │───────────────────>│
       │                    │                    │
       │                    │  6. UPDATE watch_  │
       │                    │     progress       │
       │                    │───────────────────>│
       │                    │                    │
       │  7. Return counts  │                    │
       │<───────────────────│                    │
       │                    │                    │
       │  8. Clear local    │                    │
       │     anonymousId    │                    │
       │                    │                    │
```

**Dual-Mode Tables:**
- `rentals`: Has both `userId` (nullable) and `anonymousId` (nullable)
- `watch_progress`: Same dual-mode support
- Exactly one should be set per record

---

## Translation Data Flow

```
┌───────────────────────────────────────────────────────────────┐
│                    CONTENT DATA (Database)                     │
│                                                                │
│  movies ─────────────────> movie_translations                  │
│    │                         ├─ en: "The Signal"               │
│    │                         └─ lo: "ສັນຍານ"                    │
│    │                                                           │
│    └─> movie_cast ───────> movie_cast_translations             │
│          │                   ├─ en: "Tyler Durden"             │
│          │                   └─ lo: "ໄທເລີ ເດີເດັນ"              │
│          │                                                     │
│          └─> people ─────> people_translations                 │
│                              ├─ en: "Brad Pitt"                │
│                              └─ lo: "ແບຣດ ພິດ"                  │
└───────────────────────────────────────────────────────────────┘
                              │
                              │ API Response
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                    API RESPONSE FORMAT                         │
│                                                                │
│  {                                                             │
│    "title": { "en": "The Signal", "lo": "ສັນຍານ" },            │
│    "cast": [{                                                  │
│      "person": { "name": { "en": "...", "lo": "..." } },       │
│      "character": { "en": "...", "lo": "..." }                 │
│    }]                                                          │
│  }                                                             │
└───────────────────────────────────────────────────────────────┘
                              │
                              │ getLocalizedText(field, locale)
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                    FRONTEND DISPLAY                            │
│                                                                │
│  locale = 'lo'  →  "ສັນຍານ"                                    │
│  locale = 'en'  →  "The Signal"                                │
│                                                                │
│  Fallback: lo → en if Lao not available                        │
└───────────────────────────────────────────────────────────────┘
```

---

## Storage Locations

| Data Type | Storage | Notes |
|-----------|---------|-------|
| Movie metadata | PostgreSQL | Via API |
| Video files | GCS / Local | Environment-dependent |
| User sessions | PostgreSQL | 30-day expiry |
| Anonymous ID | localStorage | Browser-only |
| UI translations | JSON files | `messages/en.json`, `messages/lo.json` |
