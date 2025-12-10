# Watch Progress Migration Fix

**Date**: December 6, 2025  
**Issue**: Continue watching didn't migrate when logging in  
**Status**: ✅ Fixed

## Problem

Watch progress was stored in **localStorage only** (via analytics system), never sent to the database. When user logged in, there was nothing to migrate!

**Flow before:**
```
User watches movie
  ↓
Video player → useVideoAnalytics
  ↓
saveSession() → localStorage ONLY
  ↓
User logs in
  ↓
Migration tries to migrate from database
  ↓
Nothing in database! ❌
```

## Solution

**Dual-write approach**: Save watch progress to BOTH localStorage (for analytics) AND database (for continue watching).

**Flow after:**
```
User watches movie
  ↓
Video player → useVideoAnalytics
  ↓
saveSessionDual() → localStorage (analytics) + Database API (continue watching)
  ↓
User logs in
  ↓
Migration: UPDATE watch_progress SET userId=X WHERE anonymousId=Y
  ↓
Continue watching works! ✅
```

## Files Modified

### `web/lib/analytics/tracker.ts`

**Changes:**
1. Added import: `import { updateWatchProgress } from '../api/watch-progress-client'`
2. Created `saveSessionDual()` function that:
   - Saves to localStorage (synchronous) - for analytics
   - Saves to database via API (async, non-blocking) - for continue watching
3. Replaced all `saveSession()` calls with `saveSessionDual()` (7 locations):
   - Session initialization (on resume)
   - trackPlay
   - trackPause
   - trackTimeUpdate (every 5 seconds)
   - trackComplete
   - trackEnd
   - Component unmount

## How It Works Now

### Anonymous User Watches Movie
```typescript
// Video player tracks progress
every 5 seconds:
  saveSessionDual(session, duration)
    ├─ localStorage: Save analytics data
    └─ API: POST /api/watch-progress/:movieId
        Headers: { X-Anonymous-Id: "anon_123..." }
        Body: { progressSeconds: 120, durationSeconds: 5400 }
        ↓
        Database: INSERT/UPDATE watch_progress(anonymousId, movieId, progressSeconds)
```

### User Logs In
```
Login/Register
  ↓
API: POST /api/users/migrate
  ↓
Database: UPDATE watch_progress 
          SET userId='user_456', anonymousId=NULL
          WHERE anonymousId='anon_123'
  ↓
Visit /profile/continue-watching
  ↓
API: GET /api/watch-progress
  ↓
Shows all movies in progress! ✅
```

## Benefits

✅ **Immediate Database Sync**: Progress saved to database in real-time  
✅ **Cross-Device (Anonymous)**: Same anonymousId works across devices  
✅ **Migration Works**: Database has data to migrate  
✅ **Non-Blocking**: Database sync doesn't slow down video playback  
✅ **Dual Purpose**: localStorage for analytics, database for continue watching  

## Error Handling

- Database saves are async and non-blocking
- If API call fails, it logs error but doesn't break playback
- localStorage still works for admin analytics dashboard
- User can keep watching even if backend is down

## Testing

### Test 1: Watch Progress Creation
```bash
1. Clear browser data
2. Visit movie and watch for 30+ seconds
3. Check Network tab: Should see PUT /api/watch-progress/:movieId every 5 seconds
4. Check database:
   SELECT * FROM watch_progress WHERE anonymous_id LIKE 'anon_%'
   → Should see progress record
```

### Test 2: Continue Watching (Anonymous)
```bash
1. Watch movie #1 for 2 minutes (don't finish)
2. Watch movie #2 for 1 minute (don't finish)
3. Visit /profile/continue-watching (as anonymous)
4. Should see both movies with progress bars
```

### Test 3: Migration
```bash
1. As anonymous, watch a movie for 2 minutes
2. Verify in database: watch_progress has anonymousId
3. Sign up/login
4. Check console: [Auth] Migration successful...
5. Verify in database: watch_progress now has userId, anonymousId=NULL
6. Visit /profile/continue-watching
7. Should see your movie! ✅
```

## Rollback Plan

If needed, revert `web/lib/analytics/tracker.ts`:
```bash
git diff HEAD~1 web/lib/analytics/tracker.ts
git checkout HEAD~1 -- web/lib/analytics/tracker.ts
```

This will restore localStorage-only approach.

---

**Status**: ✅ Fixed and ready for testing  
**Impact**: Continue watching now works for both anonymous and logged-in users
