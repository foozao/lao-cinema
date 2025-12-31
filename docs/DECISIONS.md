# Architecture Decision Log

Record of deliberate architectural choices and their rationale. **Read this before "improving" the codebase.**

---

## Framework Choices

### Why Fastify over Express?

**Decision**: Use Fastify for the backend API instead of Express.

**Rationale**:
- **Performance**: Fastify is significantly faster (2-3x in benchmarks) due to schema-based serialization and optimized routing
- **TypeScript-first**: Better TypeScript support with built-in type inference for routes
- **Schema validation**: Native JSON Schema support for request/response validation (works with Zod)
- **Plugin system**: Cleaner encapsulation than Express middleware
- **Modern**: Async/await native, no callback hell
- **Active development**: More actively maintained than Express

**Trade-offs accepted**:
- Smaller ecosystem than Express
- Less Stack Overflow answers (but good docs)

**Do NOT**: Switch to Express for "compatibility" - the performance benefits matter for video streaming metadata.

---

### Why Next.js App Router (not Pages)?

**Decision**: Use Next.js 16 with App Router for the frontend.

**Rationale**:
- **Server Components**: Reduce client JS bundle, better initial load
- **Streaming**: Better for video platform with progressive rendering
- **i18n routing**: URL-based locale routing (`/en/*`, `/lo/*`) is cleaner
- **Future-proof**: Pages Router is legacy mode

**Trade-offs accepted**:
- Learning curve for Server vs Client components
- Some third-party library incompatibilities

---

### Why Drizzle ORM over Prisma?

**Decision**: Use Drizzle ORM for database access.

**Rationale**:
- **SQL-like syntax**: Closer to raw SQL, less magic
- **TypeScript inference**: Types inferred from schema, no codegen step
- **Lightweight**: Smaller bundle, faster startup
- **Migrations**: Simple SQL migration files (readable, editable)
- **Performance**: Less overhead than Prisma's query engine

**Trade-offs accepted**:
- Less documentation than Prisma
- No visual studio (Prisma Studio is nicer than Drizzle Studio)
- Manual relation handling in some cases

---

## Data Architecture

### Why Separate `people` Table vs Embedded?

**Decision**: Store cast/crew as references to a shared `people` table, not embedded in movies.

**Rationale**:
- **Deduplication**: Same actor appears in multiple movies (Orson Welles shouldn't be stored 50 times)
- **Person pages**: Enables `/people/:id` pages showing filmography
- **TMDB compatibility**: TMDB uses person IDs; we can sync updates
- **Translations**: Person name translations stored once, applied everywhere
- **Future features**: Favorites, following, notifications per person

**Trade-offs accepted**:
- More complex queries (joins required)
- TMDB import creates people records automatically
- Need to handle orphaned people (cleanup script exists)

**Do NOT**: Embed cast/crew as JSON arrays in movies table - breaks normalization and prevents person pages.

---

### Why Translation Tables vs JSON Columns?

**Decision**: Use separate `*_translations` tables instead of JSON columns.

**Rationale**:
- **Query flexibility**: Can query by language efficiently
- **Indexing**: Can index specific language fields
- **Validation**: Schema enforces required languages
- **Extensibility**: Easy to add new languages (just add rows)
- **TMDB pattern**: Mirrors how TMDB structures translations

**Pattern**:
```
movies (id, original_title, poster_path, ...)
movie_translations (movie_id, language, title, overview, tagline)
```

**Trade-offs accepted**:
- More tables, more joins
- Composite primary keys (`entity_id, language`)

**Do NOT**: Store `{ en: "...", lo: "..." }` as JSON in main table - loses query/index benefits.

---

### Why Negative IDs for Manual People?

**Decision**: Manually-created people use negative integer IDs.

**Rationale**:
- **TMDB collision prevention**: TMDB person IDs are positive integers; negative IDs can never collide
- **Easy identification**: `id < 0` instantly tells you it's manually created
- **Future-proof**: If person is later found in TMDB, can link/merge without conflicts
- **Simple implementation**: `MIN(existing_ids) - 1` generates unique negative IDs

**Do NOT**: Use UUIDs for people - breaks TMDB ID compatibility and makes the schema inconsistent.

---

## User Features

### Why localStorage for Rentals Initially? (Historical)

**Decision**: First implementation of rentals used localStorage, not backend.

**Rationale**:
- **MVP speed**: Ship rental feature without auth system
- **Anonymous users**: Works without accounts
- **Demo mode**: No real payment integration needed
- **Progressive enhancement**: Backend added later without changing UX

**Current state**: **Fully migrated to database.** Rentals now use the backend API with anonymous IDs (`X-Anonymous-Id` header). The old `lib/rental.ts` (localStorage) was removed in December 2025.

**Active implementation**: `lib/rental-service.ts` → `lib/api/rentals-client.ts` → Backend API

---

### Why Dual-Mode (userId OR anonymousId)?

**Decision**: Rentals and watch progress support both authenticated and anonymous users.

**Rationale**:
- **Friction-free**: Users can rent/watch without creating account
- **Migration path**: Anonymous data migrates to account on registration
- **Privacy-friendly**: No forced account creation
- **Business model**: Rental conversion doesn't require signup

**Implementation**:
```typescript
// Tables have both columns, exactly one should be set
rentals: {
  userId: uuid | null,      // Set if authenticated
  anonymousId: string | null, // Set if anonymous
}
```

**Do NOT**: Require authentication for rentals/watch progress - anonymous-first is intentional.

---

## Video Architecture

### Why HLS over Progressive MP4?

**Decision**: Use HLS (HTTP Live Streaming) for video delivery.

**Rationale**:
- **Adaptive bitrate**: Quality adjusts to network conditions
- **CDN-friendly**: Segments cache efficiently at edge
- **Seeking**: Instant seek without downloading entire file
- **Mobile support**: Native iOS support, HLS.js for others
- **Industry standard**: Netflix, YouTube, etc. all use ABR streaming

**Quality variants**: 1080p, 720p, 480p, 360p with automatic switching.

**Do NOT**: Switch to progressive MP4 - breaks adaptive streaming and wastes bandwidth.

---

### Why Google Cloud Storage for Videos?

**Decision**: Store video files in GCS, not alongside the app.

**Rationale**:
- **Separation of concerns**: App servers shouldn't serve large files
- **Cost**: GCS egress cheaper than compute egress at scale
- **CDN integration**: Easy to put Cloud CDN in front
- **Scalability**: No disk space concerns on app servers
- **Signed URLs**: Secure time-limited access

**Local dev**: Videos served from `public/videos/` or local video-server (port 3002).

---

## Authentication

### Why Session Tokens over JWT?

**Decision**: Use database-stored session tokens, not stateless JWTs.

**Rationale**:
- **Revocation**: Can invalidate sessions instantly (logout, security)
- **Simplicity**: No JWT secret rotation, no refresh token complexity
- **Visibility**: Can show "active sessions" to users
- **Storage**: 30-day expiry, cleaned up automatically

**Trade-offs accepted**:
- Database lookup on every authenticated request
- Slightly more complex than stateless JWT

**Do NOT**: Switch to stateless JWTs - loses instant revocation capability.

---

### Why HTTP Basic Auth for Admin (Initially)?

**Decision**: Use HTTP Basic Auth for GCP deployment protection.

**Rationale**:
- **Simple**: No UI needed, browser handles it
- **GCP-compatible**: Works with Cloud Run's IAP alternative
- **Temporary**: Placeholder until full user accounts
- **Role-based**: `admin` vs `viewer` roles in password file

**Current state**: User accounts system now exists; Basic Auth remains for deployment-level protection.

---

## Internationalization

### Why URL-Based Locale Routing?

**Decision**: Use `/en/*` and `/lo/*` URL prefixes for language.

**Rationale**:
- **SEO**: Search engines index each language separately
- **Shareability**: Links include language context
- **Bookmarkable**: User's language preference persists
- **next-intl standard**: Works with next-intl's routing system

**Do NOT**: Use cookie/localStorage for language - breaks SEO and link sharing.

---

### Why Two Translation Systems?

**Decision**: Separate `next-intl` (UI) from `LocalizedText` (content).

**Rationale**:
- **Different sources**: UI text is in code, content is in database
- **Different update cycles**: UI translations change with deploys, content changes with edits
- **Different editors**: Developers edit UI, admins edit content
- **Type safety**: Different TypeScript types for each

**Systems**:
1. `next-intl` → `messages/en.json`, `messages/lo.json` → UI labels
2. `LocalizedText` → Database translation tables → Movie titles, etc.

**Do NOT**: Mix these systems - they serve different purposes.

---

## Future Considerations

### Mobile App Strategy

**Planned**: React Native (Expo) for iOS/Android.

**Rationale**:
- **Code sharing**: Same types, API client, business logic
- **Expo**: Faster development, OTA updates
- **Offline**: Can cache videos for offline viewing

---

### Why Not Serverless Functions?

**Decision**: Monolithic Fastify server, not serverless functions.

**Rationale**:
- **Connection pooling**: PostgreSQL connections are expensive to create
- **Cold starts**: Video platform needs instant responses
- **Simplicity**: One deployment, one codebase
- **Cost**: Predictable pricing vs per-invocation

---

## Summary

Before changing any of these decisions:

1. **Read this document** - Understand why the choice was made
2. **Check trade-offs** - The downsides were already considered
3. **Discuss first** - These aren't accidents; they're deliberate choices
4. **Document changes** - Update this file if decisions change
