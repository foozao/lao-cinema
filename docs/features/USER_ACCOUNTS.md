# User Accounts Implementation

**Status**: Phase 1 & 2 Complete (Backend Foundation)  
**Last Updated**: December 6, 2025

## Overview

User accounts system with anonymous-first design. Users can browse, rent, and watch movies without creating an account. Accounts are optional for syncing data across devices.

## Architecture

### Design Principles

1. **Anonymous-First**: Full functionality without account creation
2. **OAuth-Ready**: Modular design supports Google/Apple login (future)
3. **Dual-Mode**: All APIs support both authenticated and anonymous users
4. **Secure**: bcrypt password hashing, session-based auth, rate limiting ready

### Database Schema

**Tables Created** (Migration 0011):
- `users` - Core user account data
- `user_sessions` - Session tokens for authentication
- `oauth_accounts` - OAuth provider linking (Google, Apple)
- `rentals` - Movie rentals (userId OR anonymousId)
- `watch_progress` - Continue watching (userId OR anonymousId)
- `video_analytics_events` - Enhanced with user tracking

**Key Features**:
- Nullable `passwordHash` for OAuth-only accounts
- Dual-mode support: `userId` OR `anonymousId` in rentals/progress
- Unique indexes for data integrity
- Cascade deletes for account cleanup

## Backend Implementation

### Files Created

**Authentication Core**:
- `api/src/lib/auth-utils.ts` - Password hashing, token generation, validation
- `api/src/lib/auth-service.ts` - Database operations for users/sessions
- `api/src/lib/auth-middleware.ts` - Fastify middleware for auth
- `api/src/routes/auth.ts` - Auth API endpoints

### API Endpoints

#### Authentication
```
POST   /api/auth/register       - Create account with email/password
POST   /api/auth/login          - Login with credentials
POST   /api/auth/logout         - Logout (delete session)
POST   /api/auth/logout-all     - Logout from all devices
GET    /api/auth/me             - Get current user profile
```

#### Profile Management
```
PATCH  /api/auth/me             - Update profile (displayName, profileImageUrl)
PATCH  /api/auth/me/password    - Change password
DELETE /api/auth/me             - Delete account
```

#### Rentals (Dual-Mode)
```
GET    /api/rentals             - Get all user rentals
GET    /api/rentals/:movieId    - Check rental status for movie
POST   /api/rentals/:movieId    - Purchase rental
POST   /api/rentals/migrate     - Migrate anonymous rentals
```

#### Watch Progress (Dual-Mode)
```
GET    /api/watch-progress      - Get all watch progress
GET    /api/watch-progress/:movieId  - Get progress for movie
PUT    /api/watch-progress/:movieId  - Update/create progress
DELETE /api/watch-progress/:movieId  - Delete progress
POST   /api/watch-progress/migrate   - Migrate anonymous progress
```

#### User Data
```
POST   /api/users/migrate       - Migrate all anonymous data (rentals + progress)
GET    /api/users/me/stats      - Get user statistics
```

### Middleware

**`optionalAuth`** - Extract user from token (doesn't block if missing)
```typescript
// Adds request.user, request.userId, request.anonymousId
```

**`requireAuth`** - Require authenticated user (blocks if missing)
```typescript
// Returns 401 if no valid session token
```

**`requireAdmin`** - Require admin role
```typescript
// Returns 403 if user is not admin
```

**`requireAuthOrAnonymous`** - Require either auth OR anonymous ID
```typescript
// Used for dual-mode endpoints (rentals, progress)
```

### Security Features

**Password Security**:
- Scrypt hashing with random salt
- Minimum 8 characters (configurable)
- Timing-safe comparison

**Session Management**:
- Secure random tokens (64 chars)
- 30-day expiration (configurable)
- IP address and user agent tracking
- Automatic cleanup of expired sessions

**OAuth Extensibility**:
- `OAuthProvider` interface for Google/Apple
- State parameter for CSRF protection
- Token refresh support
- Multiple providers per user

## Frontend Implementation

### Status: Foundation Complete ✅

**Files Created**:
- `web/lib/anonymous-id.ts` - Anonymous ID generation and management ✅
- `web/lib/auth/types.ts` - TypeScript type definitions ✅
- `web/lib/auth/api-client.ts` - Auth API client with session management ✅
- `web/lib/auth/auth-context.tsx` - React context with auto-migration ✅
- `web/lib/auth/index.ts` - Module exports ✅

**To Be Created**:
- `web/components/auth/` - Login/register forms
- `web/app/[locale]/login/` - Auth pages
- `web/app/[locale]/profile/` - Profile pages

## Data Migration Flow

### Anonymous to Authenticated

When user registers/logs in:
1. Extract `anonymousId` from localStorage
2. Call `POST /api/users/migrate` with `anonymousId`
3. Backend updates all rentals/progress: `anonymousId` → `userId`
4. Frontend clears localStorage
5. Show success message with migration stats

### Backend Migration Endpoint (To Be Implemented)
```typescript
POST /api/users/migrate
Body: { anonymousId: string }
Returns: { migratedRentals: number, migratedProgress: number }
```

## Usage Examples

### Registration
```typescript
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepass123",
  "displayName": "John Doe"
}

Response:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "user",
    "emailVerified": false
  },
  "session": {
    "token": "64-char-hex-token",
    "expiresAt": "2025-01-05T12:00:00Z"
  }
}
```

### Login
```typescript
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securepass123"
}

Response: Same as registration
```

### Authenticated Request
```typescript
GET /api/auth/me
Headers: {
  "Authorization": "Bearer <session-token>"
}

Response:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "user",
    "lastLoginAt": "2025-12-06T12:00:00Z"
  }
}
```

### Dual-Mode Request (Rental)
```typescript
// Authenticated user
POST /api/rentals/movie-123
Headers: {
  "Authorization": "Bearer <session-token>"
}

// Anonymous user
POST /api/rentals/movie-123
Headers: {
  "X-Anonymous-Id": "anon_1733478000_abc123_xyz789"
}
```

## Next Steps

### Phase 3: Frontend Integration (Pending)
1. Create auth context with anonymous ID system
2. Build login/register UI components
3. Add user menu to navigation
4. Update rental service for API calls
5. Update video player for progress sync

### Phase 4: Dual-Mode APIs (Pending)
1. Implement rental routes with dual-mode support
2. Implement watch progress routes
3. Update analytics to track users
4. Create data migration endpoint

### Phase 5: Profile & Polish (Pending)
1. Build profile pages
2. Add rental history view
3. Add continue watching feature
4. Implement account benefits prompts
5. Testing and bug fixes

## OAuth Integration (Future)

### Google Sign-In
```typescript
// To be implemented
interface GoogleOAuthProvider implements OAuthProvider {
  name: 'google',
  getAuthorizationUrl(redirectUri, state): string
  exchangeCodeForTokens(code, redirectUri): Promise<Tokens>
  getUserInfo(accessToken): Promise<UserInfo>
}
```

### Apple Sign-In
```typescript
// To be implemented
interface AppleOAuthProvider implements OAuthProvider {
  name: 'apple',
  // Same interface as Google
}
```

### OAuth Flow
1. User clicks "Sign in with Google"
2. Frontend redirects to OAuth provider
3. User authorizes
4. Provider redirects back with code
5. Backend exchanges code for tokens
6. Backend gets user info from provider
7. Backend creates/links user account
8. Backend creates session
9. Frontend receives session token

## Testing Checklist

### Backend (Ready to Test)
- [ ] User registration with email/password
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Session token validation
- [ ] Password change
- [ ] Profile update
- [ ] Account deletion
- [ ] Logout (single session)
- [ ] Logout all devices

### Frontend (Not Yet Implemented)
- [ ] Registration form
- [ ] Login form
- [ ] Auth context state management
- [ ] Anonymous ID generation
- [ ] Session persistence
- [ ] Protected route redirects

### Integration (Not Yet Implemented)
- [ ] Anonymous rental → API
- [ ] Authenticated rental → API
- [ ] Data migration on first login
- [ ] Watch progress sync
- [ ] Analytics with user tracking

## Configuration

### Environment Variables

**Required**:
- `DATABASE_URL` - PostgreSQL connection string

**Optional**:
- `SESSION_DURATION_MS` - Session expiration (default: 30 days)
- `CORS_ORIGIN` - Allowed origins (default: http://localhost:3000)

### Security Settings

**Password Requirements** (in `auth-utils.ts`):
```typescript
// Current: Minimum 8 characters
// Can be enhanced with uppercase, numbers, special chars
```

**Session Duration** (in `auth-utils.ts`):
```typescript
// Default: 30 days (30 * 24 * 60 * 60 * 1000)
// Configurable via getSessionExpiration()
```

## Database Migrations

**Migration 0011**: User accounts and authentication
- Created 6 new tables
- Added indexes for performance
- Added unique constraints for data integrity

**To run**:
```bash
cd db
npm run db:migrate
```

## API Documentation

Full API documentation available at:
- Swagger/OpenAPI (to be added)
- Postman collection (to be added)

## Related Documentation

- `docs/architecture/STACK.md` - Technology stack
- `docs/architecture/LANGUAGE_SYSTEM.md` - Multi-language system
- `docs/STATUS.md` - Project roadmap
- `AGENTS.md` - AI agent guidelines

---

**Implementation Progress**: 70% Complete (Backend + Foundation)
- ✅ Database schema (Migration 0011)
- ✅ Backend auth infrastructure (routes, middleware, services)
- ✅ Backend dual-mode APIs (rentals, watch progress, migration)
- ✅ Frontend auth system (context, anonymous ID, API client)
- ⏳ Frontend UI components (login/register forms)
- ⏳ Profile pages
- ⏳ OAuth providers (Google, Apple)
