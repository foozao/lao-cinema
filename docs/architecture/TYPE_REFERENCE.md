# Type Reference Quick Sheet

Quick reference for the most-used types in the Lao Cinema codebase.

**Source**: `web/lib/types.ts` (420 lines)

---

## Core Pattern: LocalizedText

```typescript
interface LocalizedText {
  en: string;   // English (required, fallback)
  lo?: string;  // Lao (optional)
}
```

**Usage**: Always use `getLocalizedText(field, locale)` - never access `.en` or `.lo` directly.

```typescript
// ✅ Correct
import { getLocalizedText } from '@/lib/i18n';
const title = getLocalizedText(movie.title, locale);

// ❌ Wrong
const title = movie.title.lo || movie.title.en;
```

---

## Movie Types

| Type | When to Use | Key Fields |
|------|-------------|------------|
| `Movie` | Full movie object from API (single movie view) | All fields including `cast`, `crew`, `video_sources`, `images` |
| `MovieSummary` | Movie listings/grids (multiple movies) | `id`, `title`, `poster_path`, `release_date`, `runtime`, limited cast |
| `TMDBMovie` | Raw TMDB API response | English-only fields, no `LocalizedText` |

**Movie.type**: `'feature'` (default) or `'short'` (runtime ≤ 40 min)

---

## Person Types

| Type | When to Use |
|------|-------------|
| `Person` | Base person data (name, bio, profile) |
| `CastMember` | Person + character role in specific movie |
| `CrewMember` | Person + job/department in specific movie |

**Person.id**: 
- Positive integers = TMDB IDs
- Negative integers = Manually created (local-only)

---

## Video Types

| Type | Purpose |
|------|---------|
| `VideoSource` | HLS/MP4 video file (quality, format, URL, aspect_ratio) |
| `SubtitleTrack` | WebVTT subtitle file (language, label, URL) |
| `Trailer` | YouTube key OR self-hosted video URL |

**VideoSource.aspect_ratio**: `'16:9'`, `'2.35:1'`, `'2.39:1'`, `'mixed'`

---

## User & Rental Types

| Type | Key Point |
|------|-----------|
| `User` | Has `role`: `'user'` \| `'editor'` \| `'admin'` |
| `Rental` | Either `userId` XOR `anonymousId` (never both, never neither) |
| `WatchProgress` | Same dual-mode: `userId` XOR `anonymousId` |

**Rental target**: Either `movieId` XOR `shortPackId` (one must be set)

---

## Collection Types

| Type | Purpose |
|------|---------|
| `ShortPack` | Curated collection of short films |
| `ShortPackItem` | Movie + order within pack |
| `ShortPackSummary` | Listing view (no full movie data) |

---

## Awards Types

| Type | Hierarchy |
|------|-----------|
| `AwardShow` | Top level (e.g., "Luang Prabang Film Festival") |
| `AwardEdition` | Year/instance of show (e.g., "2024 LPFF") |
| `AwardCategory` | Award type (e.g., "Best Director") |
| `AwardNomination` | Specific nomination with `is_winner` flag |

**Nominee**: Can be `person` OR `movie` based on category's `nominee_type`

---

## Status Enums

### AvailabilityStatus
```typescript
type AvailabilityStatus = 
  | 'auto'        // Smart default based on video_sources
  | 'available'   // Rentable on platform
  | 'external'    // Available elsewhere (Netflix, etc.)
  | 'unavailable' // Not available
  | 'coming_soon' // Future release
```

### User Roles
```typescript
type UserRole = 'user' | 'editor' | 'admin';
// user: Can rent, watch, manage watchlist
// editor: Can edit movies, people, content
// admin: Full access including user management
```

---

## API Response Patterns

### Single Entity
```json
{ "movie": { ... } }
{ "person": { ... } }
{ "rental": { ... } }
```

### Collection
```json
{ "movies": [...], "total": 10 }
{ "people": [...] }
{ "rentals": [...], "total": 5 }
```

### Success Action
```json
{ "success": true, "message": "..." }
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Accessing `title.en` directly | Use `getLocalizedText(title, locale)` |
| Assuming person ID is positive | Check for negative IDs (manual entries) |
| Setting both `userId` and `anonymousId` | Only one should be set |
| Treating `MovieSummary` as `Movie` | Summary has limited fields |

---

## Import Locations

```typescript
// Frontend types
import type { Movie, Person, LocalizedText } from '@/lib/types';

// Backend (Drizzle inferred types)
import type { Movie, Person } from '../db/schema.js';

// i18n helper
import { getLocalizedText } from '@/lib/i18n';
```
