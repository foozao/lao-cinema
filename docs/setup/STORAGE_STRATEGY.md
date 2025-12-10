# Storage Strategy

**Status**: Simplified Approach  
**Last Updated**: December 6, 2025

## Overview

This document clarifies what data is stored where in the Lao Cinema platform.

## Storage Breakdown

### Database (Primary Storage)

All user data is stored in the database, accessible via API:

**✅ Rentals**
- Stored in: `rentals` table
- Fields: `userId`, `anonymousId`, `movieId`, `purchasedAt`, `expiresAt`, `transactionId`
- API: `POST /api/rentals/:movieId`, `GET /api/rentals`
- Service: `web/lib/rental-service.ts` (new)

**✅ Watch Progress**
- Stored in: `watch_progress` table
- Fields: `userId`, `anonymousId`, `movieId`, `progressSeconds`, `durationSeconds`, `completed`
- API: `PUT /api/watch-progress/:movieId`, `GET /api/watch-progress`
- Client: `web/lib/api/watch-progress-client.ts`

**✅ User Sessions**
- Stored in: `user_sessions` table
- Fields: `userId`, `token`, `expiresAt`, `ipAddress`, `userAgent`
- API: `POST /api/auth/login`, `POST /api/auth/logout`
- Client: `web/lib/auth/api-client.ts`

### localStorage (Client-Only)

Only used for client-side state management:

**✅ Anonymous ID** (`lao_cinema_anonymous_id`)
- Purpose: Identify anonymous users across sessions
- Format: `anon_{timestamp}_{fingerprint}_{random}`
- Used for: Attaching data to anonymous users before they sign up
- File: `web/lib/anonymous-id.ts`

**✅ Session Token** (`lao_cinema_session_token`)
- Purpose: Store auth session token
- Format: 64-character hex string
- Used for: Authentication in API calls
- File: `web/lib/auth/api-client.ts`

**❌ Analytics (TO BE REMOVED)**
- Currently: `web/lib/analytics/storage.ts` uses localStorage
- Future: Will use `video_analytics_events` table via API
- Status: Pending migration

### What Changed

**OLD Approach (localStorage-based):**
```
Anonymous user rents movie
  ↓
Stored in localStorage only
  ↓
User logs in
  ↓
Complex migration: localStorage → API → Database
```

**NEW Approach (Database-first):**
```
Anonymous user rents movie
  ↓
Sent to API with X-Anonymous-Id header
  ↓
Stored in database with anonymousId
  ↓
User logs in
  ↓
Simple migration: UPDATE rentals SET userId = X WHERE anonymousId = Y
```

## Files Updated

### New Files
- `web/lib/rental-service.ts` - Database-backed rental service

### Modified Files
- `web/lib/auth/auth-context.tsx` - Simplified migration (database-only)

### Removed Files
- `web/lib/auth/localStorage-migration.ts` - Complex localStorage migration (deleted)
- `web/lib/rental.ts` - Old localStorage-based rental (deleted)

## Implementation Plan

### Phase 1: Rentals (Current)
✅ Created new `rental-service.ts` that uses database API
✅ Simplified auth migration to database-only
⏳ Update payment flow to use new service
⏳ Update watch page rental checks to use new service

### Phase 2: Analytics
⏳ Create analytics API endpoints
⏳ Update `web/lib/analytics/tracker.ts` to use API
⏳ Remove `web/lib/analytics/storage.ts` (localStorage)

### Phase 3: Cleanup
✅ Removed old `web/lib/rental.ts` (localStorage version)
✅ Removed `web/lib/auth/localStorage-migration.ts`
⏳ Update tests

## Migration Flow (Simplified)

### Anonymous User Workflow
```typescript
// 1. Get/create anonymous ID
const anonymousId = getAnonymousId(); // from localStorage

// 2. Rent a movie (goes straight to database)
await fetch('/api/rentals/movieId', {
  method: 'POST',
  headers: {
    'X-Anonymous-Id': anonymousId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ transactionId: '...' })
});
// → Creates record in database with anonymousId

// 3. User signs up/logs in
await register({ email, password });
// → Auto-migrates: UPDATE rentals SET userId = X WHERE anonymousId = Y

// 4. Clear anonymous ID
clearAnonymousId(); // from localStorage
```

### No localStorage → Database Migration Needed!
The data is already in the database because:
- Rentals are created via API with `X-Anonymous-Id` header
- Watch progress is updated via API with `X-Anonymous-Id` header
- Both already have `anonymousId` in the database

## Usage Examples

### Check if Movie is Rented
```typescript
import { hasActiveRental } from '@/lib/rental-service';

const canWatch = await hasActiveRental(movieId);
```

### Create a Rental
```typescript
import { purchaseRental } from '@/lib/rental-service';

const rental = await purchaseRental(
  movieId,
  'txn_demo_123',
  500,
  'demo'
);
```

### Update Watch Progress
```typescript
import { updateWatchProgress } from '@/lib/api/watch-progress-client';

await updateWatchProgress(movieId, {
  progressSeconds: 1200,
  durationSeconds: 5400,
  completed: false
});
```

## Benefits of This Approach

✅ **Simpler**: No complex localStorage migration  
✅ **Real-time**: Data syncs immediately, not on next login  
✅ **Reliable**: Database is source of truth from the start  
✅ **Scalable**: Works across devices for anonymous users too  
✅ **Cleaner**: Less code, less complexity  

## Testing

### Test 1: Anonymous Rental
1. Clear browser data
2. Visit a movie page (not logged in)
3. Click "Rent Now"
4. Check database: `SELECT * FROM rentals WHERE anonymous_id = 'anon_...'`
5. Should see rental record immediately

### Test 2: Login Migration
1. As anonymous user, rent a movie
2. Verify rental in database with `anonymousId`
3. Sign up/log in
4. Check database: rental should now have `userId` and `anonymousId = null`
5. Visit `/profile/rentals` - should see the rental

### Test 3: Cross-Device (Authenticated)
1. Login on Device A
2. Rent a movie
3. Login on Device B (same account)
4. Visit `/profile/rentals` - should see the rental

## Next Steps

1. ✅ Create new rental-service.ts
2. ✅ Simplify auth migration
3. ⏳ Update payment modal to use new service
4. ⏳ Update watch page to use new service
5. ⏳ Update analytics to use database API
6. ⏳ Remove deprecated files

---

**Key Takeaway**: Everything goes to the database immediately. localStorage is only for anonymous ID and session token.
