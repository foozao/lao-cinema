# Refactoring: Auth Headers Utility Extraction

**Date**: December 11, 2025  
**Type**: Code Quality Improvement  
**Impact**: Eliminated duplicate auth header logic, improved maintainability

## Problem

The `getAuthHeaders()` function was duplicated across two API client files:
- `web/lib/api/rentals-client.ts` (lines 56-73)
- `web/lib/api/watch-progress-client.ts` (lines 49-66)

Both files contained identical logic for building authenticated request headers:
- Setting `Content-Type: application/json`
- Adding `Authorization: Bearer {token}` for authenticated users
- Adding `X-Anonymous-Id: {id}` for anonymous users

This duplication meant:
- Changes to auth logic needed to be made in multiple places
- Risk of inconsistency if one file was updated but not the other
- Future API clients would need to duplicate this logic again

## Solution

### 1. Created Shared Utility

Created `/web/lib/api/auth-headers.ts` with a single exported function:

```typescript
export function getAuthHeaders(): Record<string, string>
```

**Features**:
- Automatically detects authenticated vs anonymous users
- Includes proper headers for both modes
- Well-documented with JSDoc comments
- Reusable across all API client modules

### 2. Updated API Clients

**`rentals-client.ts`**:
- Removed local `getAuthHeaders()` function
- Removed imports for `getAnonymousId` and `getRawSessionToken`
- Added import for shared `getAuthHeaders` utility
- All API functions now use shared implementation

**`watch-progress-client.ts`**:
- Removed local `getAuthHeaders()` function
- Removed imports for `getAnonymousId` and `getRawSessionToken`
- Added import for shared `getAuthHeaders` utility
- All API functions now use shared implementation

## Files Changed

- ✅ `web/lib/api/auth-headers.ts` - New shared utility (+38 lines)
- ✅ `web/lib/api/rentals-client.ts` - Removed duplication (-20 lines)
- ✅ `web/lib/api/watch-progress-client.ts` - Removed duplication (-20 lines)

**Net change**: ~40 lines of duplicated code eliminated

## Testing

- ✅ TypeScript compilation passes with no errors
- ✅ No changes to function behavior or API contracts
- ✅ Both authenticated and anonymous user flows work identically

## Benefits

1. **Single Source of Truth**: Auth header logic now lives in one place
2. **Easier Maintenance**: Changes to auth logic only need to be made once
3. **Consistency**: All API clients use identical header logic
4. **Reusability**: Future API clients can import and use immediately
5. **Better Documentation**: Centralized JSDoc explains the dual-mode behavior

## Future Use Cases

This shared utility can be used by:
- Future API client modules (analytics, user profile, etc.)
- Any component making direct API calls
- Server-side API requests in Server Components

## Example Usage

```typescript
import { getAuthHeaders } from './auth-headers';

export async function fetchUserData() {
  const response = await fetch(`${API_URL}/user/profile`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}
```

## Related

- Part of refactoring initiative documented in project notes
- Complements the cast/crew insertion refactoring (completed earlier)
- Supports the dual-mode authentication architecture (user accounts + anonymous)
- No breaking changes to API or authentication flow
