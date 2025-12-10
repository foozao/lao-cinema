# Changelog

## 2025-12-10 - Documentation Cleanup

### Changed
- Consolidated root-level fix files into changelog
- Moved `DEPLOYMENT_WORKFLOWS.md` to `docs/setup/`
- Created `docs/archive/` for detailed fix documentation
- Created `docs/planning/` for planned but unimplemented features
- Moved `LOADING_INDICATORS.md` to `docs/planning/`
- Updated all references to deleted files (`rental.ts`, `localStorage-migration.ts`)
- Cleaned up documentation structure

---

## 2025-12-08 - Critical Bug Fixes & System Improvements

### Fixed

**Cast & Crew Data Loss Bug** (CRITICAL):
- Fixed default cast limit bug that caused data loss during movie edits
- Issue: API returned only 3 cast members due to default `castLimit: 3` in `movie-builder.ts`
- Issue: Update logic only touched translations, didn't manage relationships
- Solution: Fixed JavaScript destructuring defaults to handle `undefined` properly
- Solution: Added explicit `castLimit: undefined` for single movie GET endpoint
- Solution: Rewrote cast/crew update logic to use delete-and-insert pattern
- Files: `api/src/lib/movie-builder.ts`, `api/src/routes/movie-crud.ts`, `api/src/routes/movie-update.ts`
- All 20 cast members for "The Signal" restored via TMDB sync

**Cross-Device Watch Progress Sync**:
- Watch progress now syncs across devices for logged-in users
- Issue: Video player only checked localStorage (device-specific)
- Solution: Modified `useContinueWatching` hook to fetch from backend API first
- Implements smart merge logic when both backend and localStorage have data
- Files: `web/lib/video/use-continue-watching.ts`, `web/components/video-player.tsx`
- Benefits: Seamless resume on any device when logged in

**Mobile Video Player Fixes**:
- Fixed fullscreen button not working on mobile Chrome/Safari
- Fixed excessive video container height with black bars
- Fixed progress bar not responding to touch on mobile devices
- Issue: Mobile browsers require fullscreen on `<video>` element, not container
- Issue: Desktop height constraints applied to mobile
- Solution: Device detection with different fullscreen targets (video vs container)
- Solution: Mobile-specific height optimization (aspect ratio vs viewport)
- Solution: Added touch event handlers (`onTouchStart`, `onTouchMove`) for progress bar
- Files: `web/components/video-player.tsx`, `web/components/video/video-controls.tsx`, `web/app/[locale]/movies/[id]/watch/page.tsx`

**Watch Progress Migration**:
- Continue watching now migrates properly when user logs in
- Issue: Watch progress was only saved to localStorage, not database
- Solution: Dual-write approach - save to both localStorage (analytics) and database (sync)
- Updated `useVideoAnalytics` to call both storage methods
- Files: `web/lib/analytics/tracker.ts`
- Benefits: Cross-device sync for anonymous users, smooth migration on login

### Changed

**Rental System Migration to Database-First**:
- Migrated from localStorage-based to database-first rental system
- Old: Complex 3-step migration (localStorage → API → Database)
- New: Direct database storage with simple anonymousId → userId migration
- Created `web/lib/rental-service.ts` (database-backed)
- Updated movie detail page and watch page to use new service
- Simplified auth migration logic (database-only, no localStorage)
- Files: `web/lib/rental-service.ts`, `web/lib/auth/auth-context.tsx`, `web/app/[locale]/movies/[id]/page.tsx`, `web/app/[locale]/movies/[id]/watch/page.tsx`

**Admin UX Improvements**:
- TMDB sync now shows modal with changes detected
- Form only marked as changed if sync found updates
- Added auto-translation for crew job titles (Director, Writer, etc.)
- Files: `web/app/[locale]/admin/edit/[id]/page.tsx`, `web/lib/tmdb/mapper.ts`

### Removed
- `web/lib/rental.ts` - Old localStorage-based rental system
- `web/lib/auth/localStorage-migration.ts` - Complex migration logic no longer needed

### Documentation
- Created `docs/setup/STORAGE_STRATEGY.md` - What goes where (database vs localStorage)
- See archived fix files for detailed technical documentation

---

## 2025-12-06 - User Accounts & Authentication

### Added

**User Accounts Backend** (Migration 0011):
- Database schema: `users`, `user_sessions`, `oauth_accounts` tables
- Dual-mode support: `rentals` and `watch_progress` support userId OR anonymousId
- Enhanced `video_analytics_events` with user tracking
- Password hashing with scrypt
- Session-based authentication (30-day expiration)
- OAuth-ready architecture (Google/Apple provider interfaces)

**Authentication Infrastructure**:
- `api/src/lib/auth-utils.ts` - Password hashing, token generation, validation
- `api/src/lib/auth-service.ts` - User CRUD, authentication, session management
- `api/src/lib/auth-middleware.ts` - `optionalAuth`, `requireAuth`, `requireAdmin`, `requireAuthOrAnonymous`
- `api/src/routes/auth.ts` - Registration, login, logout, profile management

**Authentication Endpoints**:
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout current session
- `POST /api/auth/logout-all` - Logout all devices
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update profile
- `PATCH /api/auth/me/password` - Change password
- `DELETE /api/auth/me` - Delete account

**Dual-Mode APIs**:
- `POST /api/rentals/:movieId` - Purchase rental (auth or anonymous)
- `GET /api/rentals` - Get all rentals
- `PUT /api/watch-progress/:movieId` - Update watch progress
- `GET /api/watch-progress` - Get all watch progress
- `POST /api/users/migrate` - Migrate anonymous data on login

**Frontend Auth Foundation**:
- `web/lib/anonymous-id.ts` - Anonymous ID generation and management
- `web/lib/auth/types.ts` - TypeScript type definitions
- `web/lib/auth/api-client.ts` - Auth API client with session management
- `web/lib/auth/auth-context.tsx` - React context with auto-migration

### Documentation
- `docs/features/USER_ACCOUNTS.md` - Complete user accounts documentation
- `docs/setup/USER_ACCOUNTS_SETUP.md` - Setup and testing guide

---

## 2025-12 - Video Delivery, Analytics, Rentals & Auth

### Added

**Video Streaming (Production)**:
- Google Cloud Storage integration for HLS videos
- Environment-aware video URLs (local dev vs GCS)
- `video_sources` table with full metadata support
- Aspect ratio handling for different video formats

**Analytics Framework** (`/web/lib/analytics/`):
- Video watch tracking (start, progress, pause, complete, end)
- Session storage with localStorage persistence
- Admin analytics dashboard (`/admin/analytics`)
- Per-movie analytics view
- Export and data management

**Rental System**:
- Movie rental with expiration
- Database-backed persistence
- Watch page rental validation with redirect
- Payment modal integration

**User Features**:
- Continue watching / resume playback
- Person detail pages (`/people/[id]`)
- Cast & crew pages (`/movies/[id]/cast-crew`)

**Authentication**:
- HTTP Basic Auth via Next.js middleware
- Role-based access control (admin/viewer)
- Password protection for GCP deployments
- Multi-user support with `AUTH_USERS` env var

**Admin Panel Expansion**:
- Analytics dashboard (`/admin/analytics`)
- Homepage management (`/admin/homepage`)
- Movies list view (`/admin/movies`)
- Person add/edit pages (`/admin/people/add`, `/admin/people/[id]`)

**Deployment**:
- GCP Cloud Run deployment scripts
- Database sync scripts (to/from cloud)
- CORS configuration for GCS

### Documentation
- `PASSWORD_PROTECTION.md` - Auth setup guide
- `AUTH_EXAMPLE.md` - Auth flow examples
- `VIDEO_ENV_COMPLETE.md` - Video URL environment setup
- `VIDEO_UPLOAD_GCS.md` - GCS upload guide

---

## 2024-11-16 - Backend, Database & Admin Features

### Added

**Backend API** (`/api`):
- Fastify REST API server
- PostgreSQL database integration
- Drizzle ORM with type-safe schema
- Movie CRUD endpoints (`GET`, `POST`, `PUT`, `DELETE`)
- Health check endpoint
- CORS configuration for frontend integration

**Database** (`/db`):
- PostgreSQL schema with separate translation tables
- People-centric architecture (actors, directors, crew)
- Bilingual support via translation tables
- Drizzle migrations and seed scripts
- Docker Compose setup for local development

**Admin Features** (`/web/app/[locale]/admin/`):
- TMDB import interface (`/admin/import`)
- Movie edit interface (`/admin/edit/[id]`)
- Real-time TMDB data preview
- Cast and crew import (top 20 actors)
- Genre and metadata sync

**TMDB Integration**:
- `TMDBClient` with typed responses
- Movie details fetching
- Movie credits (cast/crew) fetching
- Person details fetching
- Data mapping to local schema
- Preserves Lao translations on sync

**Testing Framework**:
- Jest configuration
- React Testing Library setup
- 70 unit tests for i18n, images, and utilities
- Test coverage reporting
- Watch mode support

### Changed

**Type System**:
- `CastMember` now contains nested `person: Person` object
- `CrewMember` now contains nested `person: Person` object
- Added `Person` interface with biography, birthday, etc.

**Database Schema**:
- Migrated from embedded cast/crew to separate `people` table
- Added junction tables (`movie_cast`, `movie_crew`)
- Added translation tables for bilingual support
- Person data stored once, referenced by movies

### Documentation

**New Files**:
- `BACKEND_SETUP.md` - Backend setup guide
- `DATABASE_SETUP.md` - Database setup guide
- `TMDB_SETUP.md` - TMDB integration guide
- `PEOPLE_ARCHITECTURE.md` - People system architecture
- `PEOPLE_MIGRATION.md` - Migration guide for people tables
- `CHANGELOG_PEOPLE.md` - People feature changelog
- `TESTING.md` - Testing guide and practices
- `I18N_SETUP.md` - next-intl setup guide

**Updated Files**:
- `CAST_CREW.md` - Reflects new people architecture
- `NEXT_STEPS.md` - Current status and roadmap
- `AGENTS.md` - Updated project structure

## 2024-11-14 - Multi-Language System Refactor

### Changed

**Refactored from hardcoded language suffixes to flexible multi-language system**

#### Before:
```typescript
interface Movie {
  title: string;           // English only
  title_lao: string;       // Lao only
  overview: string;        // English only
  overview_lao: string;    // Lao only
}
```

#### After:
```typescript
interface LocalizedText {
  en: string;   // English (required, fallback)
  lo?: string;  // Lao (optional)
}

interface Movie {
  title: LocalizedText;    // Supports both languages
  overview: LocalizedText; // Supports both languages
}
```

### Added

1. **New Type System** (`/web/lib/types.ts`):
   - `Language` type: `'en' | 'lo'`
   - `LocalizedText` interface with English as required fallback
   - Updated `Movie`, `Genre`, `CastMember`, `CrewMember` to use `LocalizedText`

2. **i18n Utilities** (`/web/lib/i18n.ts`):
   - `getLocalizedText(text, language)` - Get text in preferred language with fallback
   - `createLocalizedText(en, lo?)` - Helper to create LocalizedText objects

3. **Language Context** (`/web/lib/language-context.tsx`):
   - React Context for managing language state
   - `LanguageProvider` component
   - `useLanguage()` hook

4. **Language Switcher** (`/web/components/language-switcher.tsx`):
   - UI component to toggle between languages
   - Can be added to header/navigation

5. **Documentation** (`/LANGUAGE_SYSTEM.md`):
   - Complete guide to the multi-language system
   - Usage examples
   - Best practices
   - Future enhancement ideas

### Updated

1. **Sample Data** (`/web/lib/data/movies.ts`):
   - All movie, genre, cast, and crew data now uses `createLocalizedText()`
   - English provided as default, Lao as optional translation

2. **MovieCard Component** (`/web/components/movie-card.tsx`):
   - Added `language` prop (defaults to 'lo')
   - Uses `getLocalizedText()` for all displayed text
   - Shows both Lao and English titles

3. **Movie Detail Page** (`/web/app/movies/[id]/page.tsx`):
   - Uses `getLocalizedText()` for all movie information
   - Displays primary language (Lao) with English subtitle
   - Properly handles cast, crew, and genre translations

### Benefits

1. **Flexibility**: Easy to add more languages (Thai, Vietnamese, etc.)
2. **Fallback**: English always available if translation missing
3. **Scalability**: Can extend to support unlimited languages
4. **Type Safety**: TypeScript ensures proper usage
5. **TMDB Compatible**: English data from TMDB can be used directly
6. **User Choice**: Can implement language switcher for user preference

### Migration Notes

- All existing code using `title_lao`, `overview_lao`, etc. has been updated
- No breaking changes to external APIs (when implemented)
- Database schema (future) will need to support this structure

### Next Steps

1. Implement language switcher in UI
2. Store user language preference
3. Add more Lao translations to sample data
4. Consider database schema for translations
5. Add language-specific SEO metadata
