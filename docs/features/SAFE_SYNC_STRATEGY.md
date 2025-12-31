# Safe Sync Strategy for TMDB Re-syncing

## Overview

When you re-sync a movie from TMDB, the system uses a **"Safe Sync"** strategy that preserves all custom Lao translations while updating English text and metadata from TMDB.

## What Gets Updated ✅

### English Text (from TMDB)
- Movie title (English)
- Movie overview (English)
- Movie tagline (English)
- Actor names (English)
- Character names (English)
- Crew names (English - Director, Writer, Producer, etc.)
- Job titles (English)
- Genre names (English)
- Collection names (English)

### Metadata (from TMDB)
- Ratings (`vote_average`, `vote_count`)
- Popularity score
- Budget
- Revenue
- Runtime
- Status (Released, Post Production, etc.)
- Poster path (primary poster)
- Backdrop path (primary backdrop)
- Release date
- IMDB ID

## What Gets Preserved ✅

### Lao Translations (NEVER overwritten)
- Movie title (Lao) - `title.lo`
- Movie overview (Lao) - `overview.lo`
- Movie tagline (Lao) - `tagline.lo`
- Actor names (Lao) - `cast[].person.name.lo`
- Character names (Lao) - `cast[].character.lo`
- Crew names (Lao) - `crew[].person.name.lo`
- Job titles (Lao) - `crew[].job.lo`
- Genre names (Lao) - `genres[].name.lo`
- Collection names (Lao) - `belongs_to_collection.name.lo`

### Custom Data
- Video sources (your uploaded/linked videos)
- Created/updated timestamps
- Database UUID

## Example Scenarios

### Scenario 1: Actor Name Changes on TMDB

**Before Sync:**
```json
{
  "cast": [{
    "person": {
      "id": 31,
      "name": {
        "en": "Tom Hanks",
        "lo": "ທອມ ແຮງສ໌"
      }
    },
    "character": {
      "en": "Forrest Gump",
      "lo": "ຟໍເຣດສ໌ ກຳ"
    }
  }]
}
```

**TMDB Updates:** English name to "Thomas J. Hanks"

**After Re-sync:**
```json
{
  "cast": [{
    "person": {
      "id": 31,
      "name": {
        "en": "Thomas J. Hanks",  // ✅ Updated from TMDB
        "lo": "ທອມ ແຮງສ໌"          // ✅ Preserved!
      }
    },
    "character": {
      "en": "Forrest Gump",        // ✅ Updated from TMDB
      "lo": "ຟໍເຣດສ໌ ກຳ"            // ✅ Preserved!
    }
  }]
}
```

### Scenario 2: New Cast Member Added on TMDB

**Before Sync:** 5 cast members

**After Re-sync:** 6 cast members
- First 5 members: English updated, Lao preserved
- 6th member: New person with English only (Lao empty for manual translation)

### Scenario 3: Cast Member Removed from TMDB

**Before Sync:** 10 cast members in your database

**After Re-sync:** TMDB now has 8 cast members (removed 2)
- Result: Your movie now has 8 cast members (matching TMDB)
- Removed members: Their Lao translations are lost (they're no longer in the movie)

### Scenario 4: Genre Renamed on TMDB

**Before Sync:**
```json
{
  "genres": [
    { "id": 18, "name": { "en": "Drama", "lo": "ລະຄອນ" } }
  ]
}
```

**TMDB Updates:** English name to "Dramatic"

**After Re-sync:**
```json
{
  "genres": [
    { "id": 18, "name": { "en": "Dramatic", "lo": "ລະຄອນ" } }  // ✅ Lao preserved!
  ]
}
```

## How It Works

The mapper uses person/genre IDs to match existing entries:

```typescript
// For cast members
const existingCastMember = existingMovie?.cast?.find(ec => ec.person.id === c.id);
// If found, preserve Lao translation: existingCastMember?.person.name?.lo

// For crew members  
const existingCrewMember = existingMovie?.crew?.find(
  ec => ec.person.id === c.id && ec.department === c.department
);
// If found, preserve Lao translations

// For genres
const existingGenre = existingMovie?.genres?.find(eg => eg.id === g.id);
// If found, preserve Lao translation: existingGenre?.name?.lo
```

## When to Re-sync

Re-sync is safe and recommended when:

✅ **TMDB has updated information**
- New cast members added
- Corrected actor names
- Updated ratings/popularity
- Budget/revenue figures added
- Better quality poster uploaded

✅ **You want latest metadata**
- Current box office numbers
- Updated vote counts
- Latest popularity scores

✅ **English text has errors**
- Typos in titles
- Incorrect character names
- Wrong job titles

## When NOT to Re-sync

⚠️ **Be careful if:**
- You've manually reordered cast (order will reset to TMDB's order)
- You've added custom cast not in TMDB (they'll be removed)
- TMDB has incomplete data (you'll lose completeness)

## Manual Override

If you need to prevent re-sync for a movie:
1. Set `tmdb_sync_enabled: false` in the database
2. The movie will not be re-synced automatically
3. You can still manually update any field

## Implementation

The safe sync is implemented in `/web/lib/tmdb/mapper.ts`:

```typescript
export function mapTMDBToMovie(
  tmdbData: TMDBMovieDetails,      // Fresh data from TMDB
  credits?: TMDBCredits,            // Fresh credits from TMDB
  existingMovie?: Partial<Movie>   // Your existing movie with Lao translations
): Movie {
  // For every field with LocalizedText:
  // 1. Take English from TMDB (tmdbData)
  // 2. Take Lao from existingMovie (if exists)
  // 3. Merge them together
}
```

## Testing

To verify safe sync is working:

1. Import a movie from TMDB
2. Add Lao translations for cast names
3. Re-import the same movie
4. Verify Lao translations are still there

```bash
# In admin import page:
1. Import movie (e.g., TMDB ID 15 - Citizen Kane)
2. Edit movie, add Lao translations
3. Re-import same TMDB ID 15
4. Check that Lao translations remain
```

## Summary

**Safe Sync = Smart Merge**

```
New Movie = TMDB English + Your Lao + TMDB Metadata
```

You never lose your Lao translations during re-sync. English text stays fresh from TMDB, Lao translations stay preserved from your database.

This gives you the best of both worlds:
- ✅ Up-to-date English content
- ✅ Preserved Lao translations  
- ✅ Latest metadata and ratings
- ✅ No manual re-translation needed
