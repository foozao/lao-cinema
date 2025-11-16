# Changelog

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
