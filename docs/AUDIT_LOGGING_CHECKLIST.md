# Audit Logging Checklist

**Purpose**: This document ensures all admin/editor operations are properly audited. Use this checklist whenever you add or modify admin functionality.

---

## 🚨 MANDATORY: When to Add Audit Logging

**You MUST add audit logging for ANY operation that:**
- Creates, updates, or deletes content
- Modifies settings or configuration
- Changes permissions or visibility
- Adds/removes relationships between entities
- Reorders or reorganizes content

**Rule of thumb**: If it requires `requireEditorOrAdmin` or `requireAdmin` middleware, it needs audit logging.

---

## Quick Reference: Import and Usage

### 1. Import the audit service
```typescript
import { logAuditFromRequest } from '../lib/audit-service.js';
```

### 2. Add logging after successful operation
```typescript
// After create/update/delete operation succeeds
await logAuditFromRequest(
  request,
  'create',  // Action type (see below)
  'movie',   // Entity type (see below)
  entityId,  // Entity ID (string)
  'Movie Title', // Human-readable name
  {  // Optional: changes object
    field: { before: oldValue, after: newValue }
  }
);
```

---

## Action Types

Use these standard action types:

### Content Operations
- `'create'` - Creating new entities
- `'update'` - Modifying existing entities
- `'delete'` - Removing entities

### Relationship Operations
- `'add_cast'` - Adding cast members
- `'remove_cast'` - Removing cast members
- `'add_crew'` - Adding crew members
- `'remove_crew'` - Removing crew members
- `'add_genre'` - Adding genres
- `'remove_genre'` - Removing genres
- `'add_production_company'` - Adding production companies
- `'remove_production_company'` - Removing production companies

### Media Operations
- `'add_image'` - Adding images
- `'remove_image'` - Removing images
- `'set_primary_image'` - Setting primary poster/backdrop
- `'add_video'` - Adding video sources
- `'remove_video'` - Removing video sources
- `'add_subtitle'` - Adding subtitle tracks
- `'remove_subtitle'` - Removing subtitle tracks

### Special Operations
- `'feature_movie'` - Adding movie to homepage
- `'unfeature_movie'` - Removing from homepage
- `'merge_people'` - Merging person records

---

## Entity Types

Valid entity types for the second parameter:

- `'movie'` - Movie records
- `'person'` - People (actors, directors, crew)
- `'genre'` - Genre records
- `'production_company'` - Production company records
- `'settings'` - System settings (awards, short packs, homepage, etc.)
- `'user'` - User account operations

---

## Complete Examples

### Example 1: Create Movie
```typescript
fastify.post('/movies', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
  try {
    const [newMovie] = await db.insert(schema.movies).values(movieData).returning();
    
    // Insert translations, cast, crew, etc.
    // ...
    
    // ✅ LOG AUDIT EVENT
    await logAuditFromRequest(
      request,
      'create',
      'movie',
      newMovie.id,
      movieData.title.en || movieData.original_title,
      {
        movie_id: { before: null, after: newMovie.id },
        title_en: { before: null, after: movieData.title.en },
        release_date: { before: null, after: movieData.release_date },
      }
    );
    
    return sendCreated(reply, newMovie);
  } catch (error) {
    return sendInternalError(reply, 'Failed to create movie');
  }
});
```

### Example 2: Update Movie
```typescript
fastify.put('/movies/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
  try {
    const { id } = request.params;
    
    // Get existing state before update
    const [existing] = await db.select().from(schema.movies).where(eq(schema.movies.id, id));
    
    // Perform update
    await db.update(schema.movies).set(updates).where(eq(schema.movies.id, id));
    
    // Get updated state
    const [updated] = await db.select().from(schema.movies).where(eq(schema.movies.id, id));
    
    // ✅ LOG AUDIT EVENT
    await logAuditFromRequest(
      request,
      'update',
      'movie',
      id,
      updated.title.en,
      createChangesObject(existing, updated) // Helper to detect changes
    );
    
    return updated;
  } catch (error) {
    return sendInternalError(reply, 'Failed to update movie');
  }
});
```

### Example 3: Delete Movie
```typescript
fastify.delete('/movies/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
  try {
    const { id } = request.params;
    
    // ✅ GET NAME/DATA BEFORE DELETION (cascade deletes translations!)
    const translations = await db.select()
      .from(schema.movieTranslations)
      .where(eq(schema.movieTranslations.movieId, id));
    const movieTitle = translations.find(t => t.language === 'en')?.title || 'Unknown';
    
    await db.delete(schema.movies).where(eq(schema.movies.id, id));
    
    // ✅ LOG AUDIT EVENT
    await logAuditFromRequest(
      request,
      'delete',
      'movie',
      id,
      movieTitle,
      {
        movie_id: { before: id, after: null },
        title: { before: movieTitle, after: null },
      }
    );
    
    return { success: true };
  } catch (error) {
    return sendInternalError(reply, 'Failed to delete movie');
  }
});
```

### Example 4: Add Relationship
```typescript
fastify.post('/movies/:id/cast', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
  try {
    const { id: movieId } = request.params;
    const { person_id, character } = request.body;
    
    await db.insert(schema.movieCast).values({ movieId, personId: person_id });
    
    // ✅ LOG AUDIT EVENT
    const personName = await getPersonName(person_id);
    await logAuditFromRequest(
      request,
      'add_cast',
      'movie',
      movieId,
      `Added ${personName} as ${character.en}`,
      {
        person_id: { before: null, after: person_id },
        character_en: { before: null, after: character.en },
      }
    );
    
    return { success: true };
  } catch (error) {
    return sendInternalError(reply, 'Failed to add cast member');
  }
});
```

### Example 5: Settings/Configuration
```typescript
fastify.patch('/homepage/settings', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
  try {
    const { randomizeFeatured } = request.body;
    
    const [settings] = await db.update(schema.homepageSettings)
      .set({ randomizeFeatured })
      .where(eq(schema.homepageSettings.id, 1))
      .returning();
    
    // ✅ LOG AUDIT EVENT
    await logAuditFromRequest(
      request,
      'update',
      'settings',
      '1',
      'Homepage settings',
      {
        randomize_featured: { before: !randomizeFeatured, after: randomizeFeatured },
      }
    );
    
    return { settings };
  } catch (error) {
    return sendInternalError(reply, 'Failed to update settings');
  }
});
```

---

## Coverage Checklist

Use this checklist to verify audit logging coverage:

### ✅ Movies
- [x] Create movie
- [x] Update movie
- [x] Delete movie
- [x] Add/remove cast
- [x] Add/remove crew
- [x] Add/remove/set primary images
- [x] Add/remove genres
- [x] Add/remove production companies
- [x] Add/update/remove subtitles
- [x] Add/update/remove trailers

### ✅ People
- [x] Create person
- [x] Update person
- [x] Delete person
- [x] Merge people
- [x] Add/remove/set primary images

### ✅ Production Companies
- [x] Create company
- [x] Update company
- [x] Delete company

### ✅ Genres
- [x] Create custom genre
- [x] Toggle visibility

### ✅ Homepage
- [x] Feature/unfeature movies
- [x] Reorder featured movies (implicit in reorder endpoint)
- [x] Update homepage settings

### ✅ Accolades System
- [x] Create/update/delete accolade events
- [x] Create/update/delete accolade editions
- [x] Create/update/delete categories
- [x] Create/update/delete nominations
- [x] Set winner

### ✅ Short Packs
- [x] Create/update/delete short packs
- [x] Add/remove shorts from packs
- [x] Reorder shorts in packs

### ❌ NOT Logged (by design)
- [ ] Read operations (GET requests)
- [ ] Public endpoints
- [ ] Authentication operations (logged separately in auth system)
- [ ] Analytics events (logged separately)

---

## Best Practices

### ✅ DO

1. **Always log after success**: Log only when the operation succeeds
```typescript
await db.insert(schema.movies).values(data);
// ✅ Operation succeeded, now log it
await logAuditFromRequest(request, 'create', 'movie', id, title);
```

2. **Get names before deletion**: Translations are cascade-deleted
```typescript
// ✅ Get title BEFORE delete
const title = await getTitle(id);
await db.delete(schema.movies).where(eq(schema.movies.id, id));
await logAuditFromRequest(request, 'delete', 'movie', id, title);
```

3. **Include meaningful entity names**: Use human-readable titles
```typescript
// ✅ Good
await logAuditFromRequest(request, 'create', 'movie', id, 'The Signal');

// ❌ Bad
await logAuditFromRequest(request, 'create', 'movie', id, id);
```

4. **Log changes for updates**: Use the changes parameter
```typescript
// ✅ Good - shows what changed
await logAuditFromRequest(request, 'update', 'movie', id, title, {
  runtime: { before: 120, after: 125 }
});
```

5. **Use try-catch for safety**: Don't let audit failures break operations
```typescript
try {
  await logAuditFromRequest(...);
} catch (error) {
  console.error('Audit logging failed:', error);
  // Continue - don't throw
}
```

### ❌ DON'T

1. **Don't log before operation completes**
```typescript
// ❌ Bad - might fail after logging
await logAuditFromRequest(...);
await db.insert(schema.movies).values(data);
```

2. **Don't forget to log deletions**
```typescript
// ❌ Missing audit log
await db.delete(schema.movies).where(eq(schema.movies.id, id));
return { success: true };
```

3. **Don't use IDs as entity names**
```typescript
// ❌ Not helpful for humans
await logAuditFromRequest(request, 'update', 'movie', id, id);
```

4. **Don't log read operations**
```typescript
// ❌ Don't log GET requests
fastify.get('/movies/:id', async (request, reply) => {
  const movie = await db.select()...;
  await logAuditFromRequest(...); // ❌ Wrong!
  return movie;
});
```

---

## Testing Audit Logs

After adding audit logging, verify it works:

1. **Make the change in admin panel**
2. **Check the audit log endpoint**:
   ```bash
   curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:3001/api/audit-logs?limit=1
   ```
3. **Verify the log contains**:
   - Correct action type
   - Correct entity type and ID
   - Meaningful entity name
   - Changes (for updates)
   - User ID and timestamp

---

## Common Mistakes

### Mistake 1: Forgetting to import
```typescript
// ❌ Missing import
fastify.post('/movies', async (request, reply) => {
  await logAuditFromRequest(...); // Error: not defined
});
```

**Fix**: Add import at top of file
```typescript
import { logAuditFromRequest } from '../lib/audit-service.js';
```

### Mistake 2: Logging too early
```typescript
// ❌ Logs even if operation fails
await logAuditFromRequest(...);
await db.insert(schema.movies).values(data); // Might fail
```

**Fix**: Log after successful operation
```typescript
await db.insert(schema.movies).values(data);
await logAuditFromRequest(...); // ✅ Only logs if insert succeeds
```

### Mistake 3: Not getting names before cascade delete
```typescript
// ❌ Translations deleted, can't get name
await db.delete(schema.movies).where(eq(schema.movies.id, id));
const title = await getTitle(id); // ❌ Already deleted!
await logAuditFromRequest(request, 'delete', 'movie', id, title);
```

**Fix**: Get name before deletion
```typescript
const title = await getTitle(id); // ✅ Get first
await db.delete(schema.movies).where(eq(schema.movies.id, id));
await logAuditFromRequest(request, 'delete', 'movie', id, title);
```

---

## When in Doubt

If you're unsure whether to add audit logging, ask:

1. **Is this an admin/editor operation?** → Yes → Add logging
2. **Does this modify data?** → Yes → Add logging
3. **Would we want to know who did this?** → Yes → Add logging
4. **Is this just reading data?** → Yes → No logging needed

**Default to logging.** It's better to over-log than under-log.

---

## Related Documentation

- [Audit Logs System](./features/AUDIT_LOGS.md) - Complete system documentation
- [API Reference](./architecture/API_REFERENCE.md) - All API endpoints
- [Auth Middleware](../api/src/lib/auth-middleware.ts) - Permission checks

---

**Last Updated**: December 27, 2025
