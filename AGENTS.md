# AI Agent Guidelines for Lao Cinema

This document provides context and guidelines for AI coding assistants working on the Lao Cinema streaming platform.

## Project Overview

Lao Cinema is a streaming platform for Lao films with:
- **Web App**: Next.js 16.0.3 with React 19.2.0, TypeScript, Tailwind CSS v4, and HLS video player (`/web`)
- **Backend API**: Fastify API with PostgreSQL 16 and Drizzle ORM (`/api`)
- **Database**: PostgreSQL with Docker Compose setup (`/db`)
- **Admin Panel**: TMDB import and movie editing interface
- **Testing**: Vitest with 339+ unit tests
- **Future Mobile**: React Native (Expo) companion app
- **Video Delivery**: HLS streaming (Cloudflare Stream or Bunny Stream - to be configured)

## Project Structure

```
/lao-cinema
├── /web          # Next.js 16 frontend (port 3000)
│   ├── /app/[locale]/        # Internationalized routes
│   ├── /components/          # React components
│   ├── /lib/                 # Utilities, types, API clients
│   ├── /i18n/                # next-intl configuration
│   └── /messages/            # Translation files (en.json, lo.json)
├── /api          # Fastify backend API (port 3001)
│   ├── /src/db/              # Database schema and connection
│   └── /src/routes/          # API endpoints
├── /db           # Database utilities
│   ├── /src/schema.ts        # Drizzle schema definitions
│   └── /drizzle/             # Migration files
└── [docs]        # Architecture and setup documentation
```

## Development Servers

**Start Web App:**
```bash
cd /Users/brandon/home/Workspace/lao-cinema/web
npm run dev
```
Runs on `http://localhost:3000`

**Start Backend API:**
```bash
cd /Users/brandon/home/Workspace/lao-cinema/api
npm run dev
```
Runs on `http://localhost:3001`

## Key Architecture Principles

### 1. Multi-Language System

**Critical**: This platform supports bilingual content (English/Lao) with **URL-based routing** for SEO.

**Two Systems:**
1. **next-intl** for UI text (buttons, labels) - See `/web/I18N_SETUP.md`
2. **LocalizedText** for content data (movie titles, descriptions) - See `LANGUAGE_SYSTEM.md`

**URL Structure:**
- English: `/en/movies/123`
- Lao: `/lo/movies/123`

**UI Text Example:**
```typescript
// ✅ Correct - Use next-intl for UI
import { useTranslations } from 'next-intl';
const t = useTranslations();
<h1>{t('home.featured')}</h1>
```

**Content Data Example:**
```typescript
// ✅ Correct - Use LocalizedText for content
import { useLocale } from 'next-intl';
import { getLocalizedText } from '@/lib/i18n';

const locale = useLocale() as 'en' | 'lo';
const title = getLocalizedText(movie.title, locale);
```

**Navigation:**
```typescript
// ✅ Correct - Use i18n routing
import { Link } from '@/i18n/routing';
<Link href="/movies/123">View Movie</Link>
```

### 2. TMDB-Compatible Schema

The data structure mirrors TMDB's API for easy integration:
- Use TMDB field names (`poster_path`, `backdrop_path`, `vote_average`, etc.)
- Extend with Lao-specific fields when needed
- See `/web/lib/types.ts` for complete type definitions

### 3. Type Safety

- **Always use TypeScript** with strict mode
- Import types from `/web/lib/types.ts`
- Never use `any` - use proper types or `unknown`
- Validate external data with Zod schemas in API routes

## Code Style Guidelines

### Frontend (Next.js)

1. **App Router**: Use Next.js 16 App Router conventions
   - Server Components by default
   - Add `'use client'` only when needed (hooks, events, context)
   - Use Server Actions for mutations

2. **Component Structure**:
   ```typescript
   // ✅ Preferred structure
   export function MovieCard({ movie }: { movie: Movie }) {
     return (
       <div className="...">
         {/* Component content */}
       </div>
     );
   }
   ```

3. **Styling**:
   - Use Tailwind CSS v4 utility classes
   - Use shadcn/ui components when available
   - Follow responsive-first design (mobile → desktop)
   - Use Lucide React for icons

4. **File Organization**:
   ```
   /app         - Pages and routes
   /components  - Reusable components
   /lib         - Utilities, types, data
   /public      - Static assets
   ```

### Backend (Implemented)

The backend is fully implemented:

1. **Framework**: Fastify with TypeScript (`/api`)
2. **Database**: PostgreSQL 16 with Drizzle ORM (`/db`)
3. **API Style**: RESTful endpoints (see `docs/architecture/STACK.md`)
4. **Auth**: HTTP Basic Auth with role-based access (admin/viewer)
5. **Validation**: Zod for request/response schemas

## Common Tasks

### Adding a New Movie

**Via Admin Panel (Recommended):**
1. Navigate to `/admin/import`
2. Enter TMDB ID and fetch movie data
3. Click "Import Movie" to save to database
4. Edit Lao translations on the edit page

**Via API:**
1. POST to `/api/movies` with movie data
2. Provide both English and Lao text for all localized fields
3. Include all required fields (see `Movie` type)
4. Add video sources via `/api/movies/:id` PUT or admin panel

### Creating a New Component

1. Place in `/web/components/` (or `/web/components/ui/` for shadcn)
2. Use TypeScript with proper prop types
3. Follow existing naming conventions (kebab-case files, PascalCase components)
4. Make it responsive by default
5. Support both languages if displaying text

### Adding a New Page

1. Create in `/web/app/` following App Router conventions
2. Use Server Components when possible
3. Implement proper metadata for SEO
4. Handle loading and error states

### Working with Video

- Use HLS format (`.m3u8`) for streaming
- Support MP4 as fallback
- Always include multiple quality levels
- Use the existing `VideoPlayer` component
- Generate signed URLs for security (backend)

## Important Files

| File | Purpose |
|------|---------|
| `docs/architecture/STACK.md` | Complete technology stack and architecture |
| `docs/architecture/API_REFERENCE.md` | All API endpoints with request/response shapes |
| `docs/architecture/DATA_FLOW.md` | How data flows through the system |
| `docs/architecture/SCHEMA_OVERVIEW.md` | Database tables and relationships |
| `docs/architecture/LANGUAGE_SYSTEM.md` | Multi-language system documentation |
| `web/COMPONENTS.md` | Component inventory with props and usage |
| `docs/STATUS.md` | Development roadmap and project status |
| `/web/lib/types.ts` | All TypeScript type definitions |
| `/db/src/schema.ts` | Database schema (Drizzle ORM) |

## Development Workflow

### Before Making Changes

1. Read relevant documentation files
2. Check existing types in `/web/lib/types.ts`
3. Review similar existing code
4. Understand the multi-language system

### When Adding Features

1. Update types first if needed
2. Implement with type safety
3. Add both English and Lao support
4. Test responsive design
5. Follow existing patterns

### When Fixing Bugs

1. Identify root cause
2. Check if it affects both languages
3. Fix at the source, not with workarounds
4. Verify the fix doesn't break existing functionality

## Testing Checklist

When implementing changes, verify:

- [ ] TypeScript compiles without errors
- [ ] Both English and Lao text display correctly
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] Video player functions properly
- [ ] No console errors or warnings
- [ ] Follows existing code style
- [ ] Uses proper types (no `any`)

## Known Issues / Workarounds

### Rental System & Watch Progress
**Current**: Database-first approach. Rentals and watch progress are saved to the backend API immediately (with anonymous ID for non-logged-in users). On login, anonymous data is migrated via simple UPDATE query.

**Old approach**: localStorage-based (removed in December 2025).

**Files involved**: 
- `web/lib/rental-service.ts` (current implementation)
- `web/lib/api/rentals-client.ts` (API client)
- `web/lib/api/watch-progress-client.ts` (API client)
- See `docs/setup/STORAGE_STRATEGY.md` for details

### Video Letterboxing
Some video files have letterboxing (black bars) baked into the video encoding itself, causing excessive padding on the watch page even when aspect ratio metadata is set correctly.

**Problem**: Films encoded as 16:9 containers with cinemascope (2.35:1 or 2.39:1) content have black bars as part of the video pixels. CSS aspect ratio adjustments cannot remove these baked-in bars.

**Workaround**: Either re-encode videos to crop to actual content aspect ratio, or accept as-is (some films intentionally use letterboxing for cinematic presentation).

**Files involved**: `web/components/video-player.tsx`, `db/src/schema.ts` (video_sources table)

### Next.js 16 Quirks
- **Turbopack**: Still experimental; use `npm run dev` (not `--turbo`) for stability
- **Server Actions**: Must be in separate files or marked with `'use server'`
- **Parallel Routes**: Not currently used, but avoid `@folder` naming in `/app`

### Drizzle ORM Gotchas
- **Migration order matters**: When truncating tables in tests, order by foreign key dependencies (`users`, `movies` first, then dependent tables)
- **CASCADE in schema**: All `onDelete: 'cascade'` - deleting a movie removes all translations, cast, crew, etc.
- **Composite PKs**: Translation tables use composite primary keys `(entityId, language)` - can't use auto-increment

### Testing Patterns
- **Always use TEST_DATABASE_URL**: Tests verify the URL contains `_test` to prevent running against production
- **Clean up in beforeEach**: Truncate tables at start of each test, not afterEach (ensures clean state even if test crashes)
- **Use app builder options**: `build({ includeAuth: true })` to include only needed routes

### API Conventions
- **Dual-mode auth**: Rentals/watch-progress support both `userId` and `anonymousId` - exactly one should be set
- **Negative person IDs**: Manually-created people use negative IDs to distinguish from TMDB imports
- **LocalizedText everywhere**: Never access `movie.title` directly - always `getLocalizedText(movie.title, locale)`

---

## Common Pitfalls

### ❌ Don't Do This

```typescript
// Hardcoded text without localization
<h1>Welcome to Lao Cinema</h1>

// Direct language property access
const title = movie.title.lo || movie.title.en;

// Using 'any' type
function processMovie(movie: any) { }

// Inline styles instead of Tailwind
<div style={{ color: 'red' }}>

// Client Component when Server Component would work
'use client'
export default function StaticContent() { }
```

### ✅ Do This Instead

```typescript
// Localized text with helper
const title = getLocalizedText(movie.title, language);
<h1>{title}</h1>

// Proper types
function processMovie(movie: Movie) { }

// Tailwind classes
<div className="text-red-500">

// Server Component by default
export default function StaticContent() { }
```

## Environment Setup

### Required

- Node.js 20.9.0+ (Next.js 16 requirement)
- npm or pnpm
- Git

### Recommended

- VS Code with TypeScript and Tailwind CSS extensions
- ESLint and Prettier configured

## Implementation Status

**Completed:**
- [x] Backend API integration (Fastify + PostgreSQL)
- [x] User accounts system (email/password auth, sessions, OAuth-ready)
- [x] Dual-mode APIs (authenticated OR anonymous users)
- [x] HTTP Basic Auth for deployment-level protection
- [x] Admin panel (TMDB import, movie editing, people management, analytics, audit logs)
- [x] Database schema (Drizzle ORM with 22 migrations)
- [x] Deployment configuration (GCP Cloud Run)
- [x] Video streaming (HLS with GCS)
- [x] Rental system (database-backed with cross-device sync)
- [x] Watch progress (cross-device sync)
- [x] Analytics framework
- [x] Mobile video player (touch controls, fullscreen)
- [x] Frontend auth UI (login/register forms, user menu)
- [x] User profile pages (dashboard, settings, rentals, continue watching)
- [x] Production companies with TMDB sync
- [x] Trailers (YouTube + self-hosted)
- [x] Person merge/alias system
- [x] Audit logging for content changes
- [x] Password reset flow (email-based with Brevo)

**In Progress:**
- [ ] OAuth integration (Google/Apple sign-in) - architecture ready
- [ ] Video transcoding pipeline automation

**Planned:**
- [ ] OAuth integration (Google/Apple sign-in)
- [ ] Watchlist functionality
- [ ] Mobile app (React Native/Expo)
- [ ] Video transcoding pipeline automation

## Questions?

Refer to:
- `docs/architecture/STACK.md` - Full architecture
- `docs/architecture/LANGUAGE_SYSTEM.md` - Localization details
- `docs/STATUS.md` - Current development status and roadmap
- `/web/README.md` - Web app specifics

## Contributing

When working on this project:

1. **Understand the context**: Read relevant docs before coding
2. **Maintain consistency**: Follow existing patterns
3. **Think bilingual**: Always consider both languages
4. **Type everything**: Leverage TypeScript fully
5. **Test thoroughly**: Verify changes work as expected
6. **Document changes**: Update docs if adding new patterns

---

**Remember**: This is a bilingual platform. Every user-facing string needs English and Lao support. When in doubt, check `LANGUAGE_SYSTEM.md`.
