# Refactoring: Cast/Crew Insertion Logic Deduplication

**Date**: December 11, 2025  
**Type**: Code Quality Improvement  
**Impact**: Reduced ~100 lines of duplicated code

## Problem

The logic for inserting cast and crew members was duplicated across two route files:
- `api/src/routes/movie-crud.ts` (lines 208-260)
- `api/src/routes/movie-update.ts` (lines 145-211)

Both files contained nearly identical functions:
- `insertCastMembers()` - Handle person data, resolve aliases, insert cast relationships and character translations
- `insertCrewMembers()` - Handle person data, resolve aliases, insert crew relationships and job translations

This duplication created maintenance burden and increased the risk of inconsistencies when updating the logic.

## Solution

### 1. Created Shared Functions in `movie-helpers.ts`

Added two new exported functions to `/api/src/lib/movie-helpers.ts`:

```typescript
export async function insertCastMembers(
  db: NodePgDatabase<any>,
  schema: any,
  cast: CastMemberInput[],
  movieId: string
)

export async function insertCrewMembers(
  db: NodePgDatabase<any>,
  schema: any,
  crew: CrewMemberInput[],
  movieId: string
)
```

**Features**:
- Handles both nested (TMDB) and flat (test) data formats
- Resolves person aliases (prevents recreating merged people)
- Inserts person records if they don't exist
- Creates movie-cast/crew relationships
- Inserts bilingual character/job translations

### 2. Updated Route Files

**`movie-crud.ts`**:
- Removed local `insertCastMembers()` and `insertCrewMembers()` functions
- Updated imports to use shared functions from `movie-helpers.ts`
- Updated function calls to pass `db` and `schema` parameters

**`movie-update.ts`**:
- Simplified `updateCastTranslations()` and `updateCrewTranslations()`
- Removed duplicate insertion logic
- Now calls shared functions after deleting existing records

## Files Changed

- ✅ `api/src/lib/movie-helpers.ts` - Added shared functions (+119 lines)
- ✅ `api/src/routes/movie-crud.ts` - Removed duplication (-55 lines)
- ✅ `api/src/routes/movie-update.ts` - Removed duplication (-64 lines)

**Net change**: ~100 lines of duplicated code eliminated

## Testing

All existing tests pass without modification:
- ✅ 34 movie route tests (including cast/crew creation and updates)
- ✅ Person alias resolution
- ✅ Bilingual translation handling
- ✅ TMDB import format compatibility

## Benefits

1. **Single Source of Truth**: Cast/crew insertion logic now lives in one place
2. **Easier Maintenance**: Changes only need to be made once
3. **Consistency**: Both create and update operations use identical logic
4. **Type Safety**: Proper TypeScript interfaces for input validation
5. **Testability**: Shared functions can be tested independently

## Future Improvements

This refactoring sets the stage for additional improvements:
- Extract `insertGenres()` to shared helper (currently only in movie-crud.ts)
- Consider extracting external platform and trailer insertion logic
- Add unit tests specifically for the shared helper functions

## Related

- Part of refactoring initiative documented in project notes
- Addresses code duplication identified in codebase analysis
- No breaking changes to API or database schema
