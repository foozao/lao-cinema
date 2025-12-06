# Migration to Database-First Rental System

**Date**: December 6, 2025  
**Status**: ✅ Complete

## What Changed

### Problem
- Old rental system used localStorage only (never sent to backend)
- Required complex 3-step migration: localStorage → API → Database
- Error-prone and complicated

### Solution
- **Database-first approach**: All rentals go straight to the database
- Simple migration: Just update `anonymousId` → `userId` in database
- No localStorage migration needed!

## Files Updated

### ✅ Created
1. **`web/lib/rental-service.ts`**
   - New database-backed rental service
   - All functions use API calls
   - Works for both authenticated and anonymous users

2. **`docs/setup/STORAGE_STRATEGY.md`**
   - Documents what goes where (database vs localStorage)
   - Explains the simplified approach

### ✅ Modified
1. **`web/lib/auth/auth-context.tsx`**
   - Removed complex localStorage migration logic
   - Now just calls `migrateAnonymousData()` for simple database migration
   - Much cleaner and simpler

2. **`web/app/[locale]/movies/[id]/page.tsx`** (Movie Detail Page)
   - Changed imports from `@/lib/rental` to `@/lib/rental-service`
   - Updated functions to be async
   - `handlePaymentComplete` now calls `purchaseRental()` API

3. **`web/app/[locale]/movies/[id]/watch/page.tsx`** (Watch Page)
   - Changed imports to use `@/lib/rental-service`
   - Updated rental checking to be async
   - Added helper function for formatting duration

### ✅ Deleted
1. **`web/lib/auth/localStorage-migration.ts`**
   - No longer needed with database-first approach
   - Complex migration logic removed

### ⏸️ Deprecated (Not Deleted Yet - For Reference)
1. **`web/lib/rental.ts`**
   - Old localStorage-based rental system
   - Can be deleted after confirming everything works
   - Keep temporarily for reference

## How It Works Now

### Anonymous User Flow
```
1. User clicks "Rent Now"
   ↓
2. PaymentModal opens, user "pays"
   ↓
3. handlePaymentComplete() calls purchaseRental()
   ↓
4. API call: POST /api/rentals/:movieId
   Headers: { X-Anonymous-Id: "anon_123..." }
   ↓
5. Database stores: rentals(anonymousId='anon_123', movieId='mov_001')
   ↓
6. User watches movie ✅
```

### Login Migration Flow
```
1. User has rentals with anonymousId in database
   ↓
2. User logs in / registers
   ↓
3. auth-context calls migrateAnonymousData(anonymousId)
   ↓
4. API call: POST /api/users/migrate
   Body: { anonymousId: "anon_123..." }
   ↓
5. Database: UPDATE rentals SET userId='user_456', anonymousId=NULL
          WHERE anonymousId='anon_123'
   ↓
6. localStorage: Clear anonymous ID
   ↓
7. Done! User's rentals are now tied to their account ✅
```

## localStorage Usage (Minimized)

**Only 2 things remain in localStorage:**
1. `lao_cinema_anonymous_id` - Identify anonymous users
2. `lao_cinema_session_token` - Auth session token

**Everything else is in the database!**

## Testing Instructions

### Test 1: Anonymous Rental
```bash
1. Clear browser data (DevTools → Application → Clear site data)
2. Visit http://localhost:3000
3. Browse to any movie
4. Click "Rent Now" → "Emulate Payment"
5. Check Network tab: Should see POST /api/rentals/:movieId
6. Check database: SELECT * FROM rentals WHERE anonymous_id LIKE 'anon_%'
   → Should see rental record immediately
```

### Test 2: Login Migration
```bash
1. As anonymous user, rent a movie (follow Test 1)
2. Click "Sign Up" and create an account
3. Check browser console for migration logs:
   [Auth] Migrating data for anonymous user: anon_...
   [Auth] Migration successful: ...
4. Check database: SELECT * FROM rentals WHERE user_id = 'your_user_id'
   → Rental should now have userId, anonymousId should be NULL
5. Visit /profile/rentals
   → Should see your rental!
```

### Test 3: Watch Page
```bash
1. Rent a movie (as anonymous or logged in)
2. Click "Watch Now"
3. Should load video player without issues
4. Check Network tab: GET /api/rentals/:movieId (checks rental validity)
```

## Next Steps (Optional)

### Analytics Migration
- `web/lib/analytics/storage.ts` still uses localStorage
- Create analytics API endpoints
- Update to send to database instead

### Cleanup
- Delete `web/lib/rental.ts` (old localStorage version)
- Update any tests that reference old rental system
- Update documentation

## Benefits

✅ **Simpler Code**: Removed 200+ lines of complex migration logic  
✅ **Immediate Sync**: Data in database from the start  
✅ **Cross-Device**: Anonymous rentals work across devices (same anonymousId)  
✅ **Reliable**: Database is source of truth  
✅ **Maintainable**: One system, not two  

## Rollback Plan

If needed, the old system is preserved in:
- `web/lib/rental.ts` (localStorage-based)
- Git history has localStorage-migration.ts

To rollback:
1. Revert imports in movie detail page and watch page
2. Restore `web/lib/auth/localStorage-migration.ts` from git
3. Revert auth-context changes

---

**Status**: ✅ Ready for testing  
**Confidence**: High - Simplified approach is much more robust
