# Refactoring: Person Credits Query Pattern

**Date**: December 11, 2025  
**Type**: Performance Optimization  
**Priority**: Low-Medium  
**Impact**: Eliminates N+1 query problem for person credits

## Problem

The `GET /api/people/:id` endpoint had a classic N+1 query problem when fetching a person's cast and crew credits. For each credit, it was making 3 separate database queries:

1. Fetch the movie
2. Fetch movie translations
3. Fetch character/job translations

**Example**: A person with 10 cast credits and 5 crew credits would trigger:
- 2 queries to get credits (cast + crew)
- 15 × 3 = **45 additional queries** for movie data
- **Total: 47 queries** for a single person page

This pattern was repeated identically for both cast and crew with only minor variations.

## Solution

Created a shared `buildPersonCredits()` helper in `movie-builder.ts` that uses batch queries and lookup maps to eliminate the N+1 problem.

**New query pattern**:
- 2 queries to get credits (cast + crew)
- 2 batch queries for all movies and translations
- 2 batch queries for character and job translations
- **Total: 6 queries** regardless of credit count

**Performance improvement**: ~87% reduction in queries (47 → 6 for the example above)

## Changes Made

### 1. Created `buildPersonCredits()` Helper

**File**: `api/src/lib/movie-builder.ts`

```typescript
export async function buildPersonCredits(
  personId: number,
  db: NodePgDatabase<any>,
  schema: any
) {
  // Fetch all cast and crew credits (2 queries)
  const [castCredits, crewCredits] = await Promise.all([...]);

  // Extract unique movie IDs
  const allMovieIds = [...new Set([...castMovieIds, ...crewMovieIds])];

  // Batch fetch movies and translations (2 queries)
  const [movies, movieTranslations] = await Promise.all([...]);

  // Batch fetch character and job translations (2 queries)
  const [characterTranslations, jobTranslations] = await Promise.all([...]);

  // Create lookup maps for O(1) access
  const moviesMap = new Map(movies.map(m => [m.id, m]));
  const movieTransMap = new Map<string, any[]>();
  const charTransMap = new Map<string, any[]>();
  const jobTransMap = new Map<string, any>();

  // Build cast and crew arrays using maps
  return { cast, crew };
}
```

**Key optimizations**:
- **Batch queries**: Fetch all data in 6 queries instead of 3N queries
- **Lookup maps**: O(1) access instead of nested loops
- **Single responsibility**: Handles both cast and crew credits
- **Consistent with existing patterns**: Mirrors `buildMovieWithRelations()` approach

### 2. Updated `people.ts` Route

**File**: `api/src/routes/people.ts`

**Before** (lines 214-290, ~77 lines):
```typescript
// Get cast credits
const castCredits = await db.select()...;
const cast = [];
for (const credit of castCredits) {
  const [movie] = await db.select()...;  // N+1 query
  const movieTranslations = await db.select()...;  // N+1 query
  const characterTranslations = await db.select()...;  // N+1 query
  // Build cast object
}

// Get crew credits (identical pattern)
const crewCredits = await db.select()...;
const crew = [];
for (const credit of crewCredits) {
  const [movie] = await db.select()...;  // N+1 query
  const movieTranslations = await db.select()...;  // N+1 query
  const jobTranslations = await db.select()...;  // N+1 query
  // Build crew object
}
```

**After** (1 line):
```typescript
// Get cast and crew credits using optimized batch queries
const { cast, crew } = await buildPersonCredits(personId, db, schema);
```

**Code reduction**: 77 lines → 1 line (98.7% reduction)

## Testing

All 20 existing tests pass without modification:

```
✓ src/routes/people.test.ts (20 tests) 1667ms
  ✓ GET /api/people (5 tests)
  ✓ POST /api/people (5 tests)
  ✓ GET /api/people/:id (4 tests)
    ✓ should include cast and crew credits ✅
  ✓ PUT /api/people/:id (6 tests)

Test Suites: 1 passed
Tests: 20 passed
```

The test "should include cast and crew credits" specifically validates that the refactored code returns the same data structure as before.

## Performance Impact

### Query Count Reduction

| Credits | Before | After | Improvement |
|---------|--------|-------|-------------|
| 5 total | 17 queries | 6 queries | 65% ↓ |
| 15 total | 47 queries | 6 queries | 87% ↓ |
| 50 total | 152 queries | 6 queries | 96% ↓ |

### Response Time (Estimated)

Assuming ~5ms per query on local database:
- **Before**: 15 credits = 47 × 5ms = **235ms**
- **After**: 15 credits = 6 × 5ms = **30ms**
- **Improvement**: ~87% faster

On production with network latency (~20ms per query):
- **Before**: 15 credits = 47 × 20ms = **940ms**
- **After**: 15 credits = 6 × 20ms = **120ms**
- **Improvement**: ~87% faster

## Benefits

### Performance
- ✅ **Eliminates N+1 queries** - Constant 6 queries regardless of credit count
- ✅ **Scales better** - Performance doesn't degrade with more credits
- ✅ **Reduced database load** - Fewer queries = less DB overhead

### Code Quality
- ✅ **DRY principle** - Eliminated duplicate code for cast/crew
- ✅ **Maintainability** - Single source of truth in `movie-builder.ts`
- ✅ **Consistency** - Uses same pattern as `buildMovieWithRelations()`
- ✅ **Testability** - Helper can be tested independently

### Developer Experience
- ✅ **Simpler route code** - 77 lines → 1 line
- ✅ **Clear intent** - Function name describes what it does
- ✅ **Reusable** - Can be used by other endpoints if needed

## Related Patterns

This refactoring follows the same optimization pattern used in `buildMovieWithRelations()`:

1. **Batch fetch** all related IDs
2. **Parallel queries** using `Promise.all()`
3. **Lookup maps** for O(1) access
4. **Filter/map** to build final objects

This pattern should be applied anywhere we fetch related data in loops.

## Future Considerations

### Potential Enhancements
- **Caching**: Add Redis cache for frequently accessed person credits
- **Pagination**: Add limit/offset for people with many credits
- **Sorting**: Add sort options (by date, popularity, etc.)
- **Filtering**: Filter by department, year, etc.

### Other Candidates for This Pattern
- Genre movies (if we add genre detail pages)
- Collection movies (if we add collection support)
- Any endpoint that fetches related entities in loops

## Files Changed

- ✅ `api/src/lib/movie-builder.ts` (+155 lines)
  - Added `buildPersonCredits()` function
- ✅ `api/src/routes/people.ts` (-76 lines, +1 line)
  - Replaced N+1 query loops with helper call
  - Added import for `buildPersonCredits`

**Net change**: +80 lines (but eliminated 77 lines of duplicated logic)

## Migration Notes

- ✅ **No breaking changes** - API response format unchanged
- ✅ **No database changes** - Uses existing schema
- ✅ **Backward compatible** - All tests pass
- ✅ **Safe to deploy** - No migration required

---

**Summary**: Successfully eliminated N+1 query problem in person credits endpoint, reducing query count by 87% and improving response time proportionally. Code is cleaner, more maintainable, and follows established patterns.
