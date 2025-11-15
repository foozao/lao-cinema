# AI Agent Guidelines for Lao Cinema

This document provides context and guidelines for AI coding assistants working on the Lao Cinema streaming platform.

## Project Overview

Lao Cinema is a streaming platform for Lao films with:
- **Web App**: Next.js 15 with TypeScript, Tailwind CSS, and HLS video player
- **Future Backend**: Fastify API with PostgreSQL and Drizzle ORM
- **Future Mobile**: React Native (Expo) companion app
- **Video Delivery**: HLS streaming (Cloudflare Stream or Bunny Stream)

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
- Validate external data with Zod (when backend is implemented)

## Code Style Guidelines

### Frontend (Next.js)

1. **App Router**: Use Next.js 15 App Router conventions
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

### Backend (Future)

When implementing the backend:

1. **Framework**: Use Fastify with TypeScript
2. **Database**: PostgreSQL with Drizzle ORM
3. **API Style**: RESTful endpoints (see `STACK.md` for routes)
4. **Auth**: JWT-based with access + refresh tokens
5. **Validation**: Use Zod for request/response schemas

## Common Tasks

### Adding a New Movie

1. Update `/web/lib/data/movies.ts`
2. Provide both English and Lao text for all localized fields
3. Include all required fields (see `Movie` type)
4. Add video sources with proper format/quality metadata

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
| `STACK.md` | Complete technology stack and architecture |
| `LANGUAGE_SYSTEM.md` | Multi-language system documentation |
| `NEXT_STEPS.md` | Development roadmap and immediate tasks |
| `/web/lib/types.ts` | All TypeScript type definitions |
| `/web/lib/data/movies.ts` | Sample movie data |
| `/web/components/video-player.tsx` | HLS video player component |

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

- Node.js 20.9.0+ (Next.js 15 requirement)
- npm or pnpm
- Git

### Recommended

- VS Code with TypeScript and Tailwind CSS extensions
- ESLint and Prettier configured

## Future Considerations

When these features are implemented, update this guide:

- [ ] Backend API integration
- [ ] Authentication system
- [ ] Admin panel
- [ ] Mobile app
- [ ] Database schema
- [ ] Video transcoding pipeline
- [ ] Deployment configuration

## Questions?

Refer to:
- `STACK.md` - Full architecture
- `LANGUAGE_SYSTEM.md` - Localization details
- `NEXT_STEPS.md` - Current development status
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
