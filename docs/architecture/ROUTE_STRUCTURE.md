# API Route Structure

Reference for the modular route file organization in `/api/src/routes/`.

**Last Updated**: December 30, 2025

---

## Overview

Large route files are split into focused sub-modules for maintainability. Each major route group has an **orchestrator file** (thin wrapper) that imports and registers sub-routes.

## Route Organization

### Authentication (`auth.ts`)

**Orchestrator**: `auth.ts` (28 lines)

| Sub-route File | Purpose | Endpoints |
|----------------|---------|-----------|
| `auth-registration.ts` | User registration | `POST /auth/register` |
| `auth-session.ts` | Login, logout, session management | `POST /auth/login`, `POST /auth/logout`, `POST /auth/logout-all` |
| `auth-profile.ts` | Profile CRUD operations | `GET /auth/me`, `PATCH /auth/me`, `PATCH /auth/me/password`, `PATCH /auth/me/email`, `DELETE /auth/me` |
| `auth-password-reset.ts` | Password reset flow | `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/verify-reset-token` |
| `auth-email-verification.ts` | Email verification | `POST /auth/send-verification-email`, `POST /auth/verify-email`, `GET /auth/verify-email-token` |

---

### Accolades (`accolades.ts`)

**Orchestrator**: `accolades.ts` (27 lines)

| Sub-route File | Purpose | Endpoints |
|----------------|---------|-----------|
| `accolade-events.ts` | Accolade event CRUD | `GET/POST /accolades/events`, `GET/PUT/DELETE /accolades/events/:id` |
| `accolade-editions.ts` | Edition management | `GET/POST /accolades/editions`, `GET/PUT/DELETE /accolades/editions/:id` |
| `accolade-categories.ts` | Category management | `POST /accolades/categories`, `PUT/DELETE /accolades/categories/:id` |
| `accolade-sections.ts` | Section management | Festival program tracks (non-competitive) |
| `accolade-nominations.ts` | Nomination management | `POST /accolades/nominations`, `PUT/DELETE /accolades/nominations/:id`, `POST /accolades/nominations/set-winner` |
| `award-bodies.ts` | Award body CRUD | `GET/POST /accolades/award-bodies`, `GET/PUT/DELETE /accolades/award-bodies/:id` |

---

### Short Packs (`short-packs.ts`)

**Orchestrator**: `short-packs.ts` (18 lines)

| Sub-route File | Purpose | Endpoints |
|----------------|---------|-----------|
| `short-pack-crud.ts` | Pack CRUD operations | `GET/POST /short-packs`, `GET/PUT/DELETE /short-packs/:id` |
| `short-pack-items.ts` | Manage pack items | `POST /short-packs/:id/items`, `DELETE /short-packs/:id/items/:movieId`, `PUT /short-packs/:id/items/reorder` |
| `short-pack-context.ts` | Playback context | `GET /short-packs/for-movie/:movieId`, `GET /short-packs/:id/playback-context` |

---

### Movies (`movies.ts`)

**Orchestrator**: `movies.ts` (35 lines)

| Sub-route File | Purpose | Endpoints |
|----------------|---------|-----------|
| `movie-crud.ts` | Movie CRUD | `GET/POST /movies`, `GET/DELETE /movies/:id` |
| `movie-update.ts` | Movie updates (complex) | `PUT /movies/:id` |
| `movie-cast.ts` | Cast management | `POST /movies/:id/cast`, `DELETE /movies/:id/cast/:personId` |
| `movie-crew.ts` | Crew management | `POST /movies/:id/crew`, `DELETE /movies/:id/crew/:personId` |
| `movie-images.ts` | Image management | `POST /movies/:id/images`, `DELETE /movies/:id/images/:imageId`, `PUT /movies/:id/images/:imageId/primary` |

---

## Standalone Route Files

These files are self-contained (not split into sub-modules):

| File | Purpose | Key Endpoints |
|------|---------|---------------|
| `people.ts` | People (cast/crew) management | `/people/*` |
| `genres.ts` | Genre CRUD | `/genres/*` |
| `movie-genres.ts` | Movie-genre associations | `/movies/:id/genres/*` |
| `movie-subtitles.ts` | Subtitle tracks | `/movies/:id/subtitles/*` |
| `movie-production-companies.ts` | Production company links | `/movies/:id/production-companies/*` |
| `production-companies.ts` | Production company CRUD | `/production-companies/*` |
| `trailers.ts` | Movie trailers | `/trailers/:movieId/*` |
| `rentals.ts` | Rental system | `/rentals/*` |
| `watch-progress.ts` | Watch progress tracking | `/watch-progress/*` |
| `watchlist.ts` | User watchlist | `/watchlist/*` |
| `notifications.ts` | Movie notifications | `/notifications/*` |
| `homepage.ts` | Homepage featured management | `/homepage/*` |
| `audit-logs.ts` | Audit log queries | `/audit-logs/*` |
| `user-data.ts` | User data migration | `/users/migrate`, `/users/me/stats` |
| `video-tokens.ts` | Signed playback URLs | `/video-tokens/:movieId` |
| `upload.ts` | File uploads | `/upload/*` |
| `person-images.ts` | Person image management | `/people/:id/images/*` |

---

## Test Files

Test files follow the pattern `<route-name>.test.ts`:

| Test File | Tests For |
|-----------|-----------|
| `auth.test.ts` | All auth routes (registration, login, profile, etc.) |
| `accolades.test.ts` | Accolades system |
| `short-packs.test.ts` | Short packs |
| `movies.test.ts` | Movie CRUD, cast, crew, images |
| `people.test.ts` | People management |
| `genres.test.ts` | Genre CRUD |
| `movie-genres.test.ts` | Movie-genre associations |
| `movie-subtitles.test.ts` | Subtitle management |
| `rentals.test.ts` | Rental system |
| `watch-progress.test.ts` | Watch progress |
| `trailers.test.ts` | Trailers |
| `production-companies.test.ts` | Production companies |
| `movie-production-companies.test.ts` | Movie-company links |
| `homepage.test.ts` | Homepage management |
| `audit-logs.test.ts` | Audit logs |
| `user-data.test.ts` | User data migration |
| `video-tokens.test.ts` | Video token generation |
| `notifications.test.ts` | Notifications |
| `migration.test.ts` | Data migration |

---

## File Size Guidelines

- **< 300 lines**: Keep as single file
- **300-500 lines**: Consider splitting if logically separable
- **> 500 lines**: Should be split into sub-modules

### Current Large Files (candidates for future splitting)

| File | Lines | Notes |
|------|-------|-------|
| `people.ts` | ~600 | Could split into people-crud.ts, people-merge.ts |
| `rentals.ts` | ~570 | Could split by feature (CRUD, pack rentals) |
| `production-companies.ts` | ~450 | Manageable but could split |

---

## Adding New Routes

### For New Feature Area

1. Create route file: `api/src/routes/<feature>.ts`
2. Register in `api/src/index.ts` or appropriate orchestrator
3. Create test file: `api/src/routes/<feature>.test.ts`
4. Update API_REFERENCE.md

### For Splitting Existing Routes

1. Create sub-route files: `<feature>-<subfeature>.ts`
2. Convert main file to orchestrator (import + register pattern)
3. Keep test file unified (tests all sub-routes)

### Orchestrator Pattern

```typescript
// feature.ts (orchestrator)
import { FastifyInstance } from 'fastify';
import subRouteA from './feature-a.js';
import subRouteB from './feature-b.js';

export default async function featureRoutes(fastify: FastifyInstance) {
  await fastify.register(subRouteA);
  await fastify.register(subRouteB);
}
```

---

## Related Documentation

- `API_REFERENCE.md` - Full API endpoint documentation
- `api/src/test/README.md` - Testing guide
- `api/src/test/fixtures.ts` - Test fixtures for entity creation
