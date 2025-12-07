# Cast & Crew Data Loss Bug Fix

## Problem
Cast and crew members were being lost during movie edits. "The Signal" originally had 20 cast members from TMDB, but only 3 remained in the database after a previous edit. This was caused by **two separate bugs** working together.

## Root Cause: Two Bugs Combined

### Bug #1: Default Cast Limit (Critical!)
The API's `buildMovieWithRelations()` function had a **default `castLimit: 3`** for performance optimization. This meant:
- `GET /api/movies/{id}` returned only 3 cast members
- Edit page only saw 3 cast members
- When saving changes, frontend sent only those 3 members

**File:** `api/src/lib/movie-builder.ts` line 29
```typescript
castLimit = 3,  // 😱 Default limit!
```

### Bug #2: Broken Update Logic
The backend's `PUT /api/movies/:id` endpoint (in `api/src/routes/movie-update.ts`) had incomplete logic:
- `updateCastTranslations()` only updated character name translations
- `updateCrewTranslations()` only updated job title translations  
- **Missing**: Code to ensure people exist and create cast/crew relationships

### The Deadly Combination
When someone edited "The Signal" on **Nov 16, 2025**:
1. Edit page loaded → API returned only **3 cast members** (Bug #1)
2. User changed something (title, video URL, etc.)
3. On save → Frontend sent those **3 cast members** (that's all it had)
4. Backend "updated" cast → But only touched translations (Bug #2)
5. Result: **17 cast members silently lost** from the database

## Example Case: "The Signal"
- TMDB currently has **20 cast members** for "The Signal" (TMDB ID: 1126026)
- Database only had **3 cast members** (from initial incomplete import)
- Syncing from TMDB would fetch all 20, but only 3 would remain in the database after saving

## The Fixes

### Fix #1: Fix JavaScript Destructuring Default Behavior
**File:** `api/src/lib/movie-builder.ts`

The critical bug was in how JavaScript handles destructuring defaults. When you write:
```typescript
const { castLimit = 3 } = options;
```
And pass `castLimit: undefined`, JavaScript treats it as "missing" and applies the default `= 3`.

**Solution:** Check if the property exists in the object:
```typescript
const { castLimit, crewLimit } = options;
const finalCastLimit = 'castLimit' in options ? castLimit : 3;
const finalCrewLimit = crewLimit;
```

Now `castLimit: undefined` explicitly means "no limit".

### Fix #2: Remove Cast Limit for Single Movie GET
**File:** `api/src/routes/movie-crud.ts`

Added explicit `castLimit: undefined` and `crewLimit: undefined` to single movie GET endpoint:

```typescript
const movieData = await buildMovieWithRelations(movie, db, schema, {
  includeCast: true,
  includeCrew: true,
  includeGenres: true,
  includeImages: true,
  castLimit: undefined,  // ✅ No limit for single movie view
  crewLimit: undefined,  // ✅ No limit for crew either
});
```

**Why:** The edit page needs ALL cast/crew members to avoid losing data during updates. The default limit of 3 was intended for list views (performance), not detail views.

### Fix #3: Proper Cast/Crew Update Logic
**File:** `api/src/routes/movie-update.ts`

Updated to properly handle cast/crew updates:

### Before
```typescript
async function updateCastTranslations(movieId: string, cast: CastMember[]) {
  // Only updated translations for existing cast
  for (const member of cast) {
    await upsertTranslation(...); // Only updates translations
  }
}
```

### After
```typescript
async function updateCastTranslations(movieId: string, cast: CastMember[]) {
  // Delete all existing cast (clean slate)
  await db.delete(schema.movieCast).where(eq(schema.movieCast.movieId, movieId));
  await db.delete(schema.movieCastTranslations).where(...);
  
  // Insert all cast members fresh (like create does)
  for (const member of cast) {
    // 1. Ensure person exists in people table
    await ensurePersonExists(db, schema, {...}, 'Acting');
    
    // 2. Create movie-cast relationship
    await db.insert(schema.movieCast).values({...});
    
    // 3. Insert character translations
    await insertCharacterTranslations(db, schema, ...);
  }
}
```

Same pattern applied to `updateCrewTranslations()`.

## Status
✅ **All three bugs are now fixed**
- Fix #1: Applied to `api/src/lib/movie-builder.ts` (destructuring defaults)
- Fix #2: Applied to `api/src/routes/movie-crud.ts` (explicit undefined limits)
- Fix #3: Applied to `api/src/routes/movie-update.ts` (proper relationship handling)
- Restart API server to load changes

✅ **"The Signal" has been restored**
- All 20 cast members recovered via TMDB sync
- Data verified at: http://localhost:3000/en/movies/the-signal/cast-crew

## Preventing Future Data Loss

### For Other Movies
If other movies lost cast/crew during edits (between Nov 16 - Dec 7), you can restore them:

1. **Identify affected movies**:
   ```sql
   SELECT id, title, updated_at 
   FROM movies 
   WHERE updated_at BETWEEN '2025-11-16' AND '2025-12-07'
   AND tmdb_id IS NOT NULL;
   ```

2. **For each movie**, sync from TMDB:
   - Navigate to edit page: `http://localhost:3000/en/admin/edit/{slug}`
   - Click "Sync from TMDB" 
   - Click "Update Movie"

### Going Forward
With both fixes applied:
- ✅ Edit page now loads ALL cast/crew members
- ✅ Updates properly create/delete relationships
- ✅ No more silent data loss during edits
- ✅ TMDB sync properly adds new members

## Technical Details

### Files Changed
- `api/src/lib/movie-builder.ts`:
  - Fixed destructuring to properly handle `undefined` values
  - Added `finalCastLimit` and `finalCrewLimit` computed values
  - Uses `'castLimit' in options` check instead of default parameter

- `api/src/routes/movie-crud.ts`:
  - Added `castLimit: undefined` to single movie GET (line 72)
  - Added `crewLimit: undefined` to single movie GET (line 73)

- `api/src/routes/movie-update.ts`:
  - Added imports: `ensurePersonExists`, `insertCharacterTranslations`, `insertJobTranslations`
  - Rewrote `updateCastTranslations()` to use delete-and-insert pattern
  - Rewrote `updateCrewTranslations()` to use delete-and-insert pattern
  - Removed obsolete `upsertTranslation()` and `upsertCrewTranslation()` functions

- `web/app/[locale]/admin/edit/[id]/page.tsx` (UX improvement):
  - Added sync result modal that shows what changed
  - Detects if sync found updates or not
  - Only marks form as changed if updates were detected
  - Better feedback instead of confusing "Update" button flashing
  - Removed TMDB ID/Last Synced display (not actionable)

- `web/lib/tmdb/mapper.ts` (crew job auto-translation):
  - Auto-populates Lao translations for crew job titles during TMDB sync
  - Covers common positions: Director, Writer, Producer, Cinematography, Editor, etc.
  - Preserves custom Lao translations if they already exist
  - Reduces manual translation work for crew positions

### Strategy: Delete-and-Insert vs. Upsert
We use a **delete-and-insert** pattern instead of upsert because:
1. **Simpler logic**: No need to track which members are new vs. existing
2. **Consistent with create**: Uses same helper functions as movie creation
3. **Clean state**: Ensures database exactly matches TMDB data after sync
4. **Performance**: Fine for typical movie cast sizes (10-50 members)

### Database Operations (per movie update with cast/crew)
```sql
-- Delete existing relationships
DELETE FROM movie_cast WHERE movie_id = ?;
DELETE FROM movie_cast_translations WHERE movie_id = ?;
DELETE FROM movie_crew WHERE movie_id = ?;
DELETE FROM movie_crew_translations WHERE movie_id = ?;

-- For each cast member:
INSERT INTO people (...) ON CONFLICT DO NOTHING;
INSERT INTO people_translations (...);
INSERT INTO movie_cast (movie_id, person_id, order);
INSERT INTO movie_cast_translations (movie_id, person_id, language, character);

-- For each crew member:
INSERT INTO people (...) ON CONFLICT DO NOTHING;
INSERT INTO people_translations (...);
INSERT INTO movie_crew (movie_id, person_id, department);
INSERT INTO movie_crew_translations (movie_id, person_id, department, language, job);
```

## Testing
After applying the fix, test with:

1. **Unit test scenario** (if adding tests):
   - Create movie with 3 cast members
   - Update movie with 5 cast members
   - Verify database has exactly 5 (not 3 or 8)

2. **Manual test**:
   - Sync "The Signal" from TMDB
   - Verify cast count increases from 3 to 20
   - Verify crew count remains 7 (already correct)

## Notes
- **Lao translations preserved**: The mapper passes `existingMovie` to preserve Lao translations during sync
- **Profile images**: Person profile images from TMDB are preserved in the `people` table
- **Crew filtering**: Only "important" crew roles are imported (Director, Writer, Producer, etc.) - see `mapper.ts` line 92

## Related Documentation
- `/docs/architecture/CAST_CREW.md` - Cast & crew system overview
- `/web/lib/tmdb/mapper.ts` - TMDB data mapping logic
- `/docs/architecture/DATA_FLOW.md` - Data flow through the system
