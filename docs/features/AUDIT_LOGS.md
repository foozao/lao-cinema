# Audit Logs System

**Status**: ✅ Implemented (December 2025)

Comprehensive audit logging system that tracks all content changes made by editors and admins.

## Overview

The audit log system provides:
- **Complete change history** for all content (movies, people, genres, etc.)
- **User accountability** - tracks who made what changes and when
- **Role-based access** - Editor role for content management
- **Detailed change tracking** - Before/after values for all modifications
- **Admin visibility** - Full audit log viewer in admin panel

## User Roles

### Role Hierarchy

| Role | Permissions | Can Edit Content | Can View Audit Logs | Can Manage Users |
|------|-------------|------------------|---------------------|------------------|
| **user** | Basic access | ❌ No | ❌ No | ❌ No |
| **editor** | Content management | ✅ Yes | ❌ No | ❌ No |
| **admin** | Full access | ✅ Yes | ✅ Yes | ✅ Yes |

### Editor Role

**Purpose**: Allow trusted users to manage content without full admin privileges.

**Permissions**:
- ✅ Create, update, delete movies
- ✅ Add/remove cast and crew
- ✅ Upload images and videos
- ✅ Manage genres and production companies
- ✅ Feature/unfeature movies on homepage
- ❌ Cannot view audit logs
- ❌ Cannot manage user accounts
- ❌ Cannot change system settings

**Use Cases**:
- Content moderators
- Film archivists
- Trusted community contributors
- Staff members managing catalog

## Database Schema

### Enums

```sql
-- User roles (updated)
CREATE TYPE user_role AS ENUM ('user', 'editor', 'admin');

-- Audit actions
CREATE TYPE audit_action AS ENUM (
  'create', 'update', 'delete',
  'add_cast', 'remove_cast', 'update_cast',
  'add_crew', 'remove_crew', 'update_crew',
  'add_image', 'remove_image', 'set_primary_image',
  'add_video', 'remove_video', 'update_video',
  'add_genre', 'remove_genre',
  'add_production_company', 'remove_production_company',
  'add_platform', 'remove_platform', 'update_platform',
  'feature_movie', 'unfeature_movie',
  'merge_people', 'update_person'
);

-- Entity types
CREATE TYPE audit_entity_type AS ENUM (
  'movie', 'person', 'genre', 'production_company', 'user', 'settings'
);
```

### Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  action audit_action NOT NULL,
  entity_type audit_entity_type NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,  -- Human-readable name (movie title, person name, etc.)
  changes TEXT,      -- JSON string of before/after values
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

## Backend Implementation

### Audit Service

**File**: `api/src/lib/audit-service.ts`

**Key Functions**:

```typescript
// Log an audit entry
await logAudit({
  userId: user.id,
  action: 'update',
  entityType: 'movie',
  entityId: movie.id,
  entityName: movie.title.en,
  changes: {
    runtime: { before: 120, after: 125 },
    releaseDate: { before: '2023-01-01', after: '2023-02-15' }
  },
  ipAddress: request.ip,
  userAgent: request.headers['user-agent']
});

// Log from a Fastify request (convenience)
await logAuditFromRequest(
  request,
  'add_cast',
  'movie',
  movieId,
  movieTitle
);

// Query audit logs
const logs = await getAuditLogs({ limit: 100, offset: 0 });
const movieHistory = await getEntityAuditHistory('movie', movieId);
const userActions = await getUserAuditHistory(userId);
```

### Auth Middleware

**File**: `api/src/lib/auth-middleware.ts`

**New Middleware Functions**:

```typescript
// Require editor role (or admin)
fastify.get('/api/movies/:id', {
  preHandler: [requireAuth, requireEditor]
}, async (request, reply) => {
  // Only editors and admins can access
});

// Require admin only
fastify.get('/api/audit-logs', {
  preHandler: [requireAuth, requireAdmin]
}, async (request, reply) => {
  // Only admins can access
});
```

## API Endpoints

### Get All Audit Logs

```http
GET /api/audit-logs?limit=100&offset=0
Authorization: Bearer <admin-token>
```

**Response**:
```json
{
  "logs": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userEmail": "editor@example.com",
      "userDisplayName": "John Editor",
      "userRole": "editor",
      "action": "update",
      "entityType": "movie",
      "entityId": "movie-uuid",
      "entityName": "The Signal",
      "changes": {
        "runtime": { "before": 120, "after": 125 }
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2025-12-11T16:30:00Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 1
  }
}
```

### Get Entity History

```http
GET /api/audit-logs/movie/<movie-id>?limit=50
Authorization: Bearer <admin-token>
```

**Response**: Array of audit log entries for that specific movie.

### Get User Activity

```http
GET /api/audit-logs/user/<user-id>?limit=100
Authorization: Bearer <admin-token>
```

**Response**: Array of all actions performed by that user.

## Usage Examples

### Example 1: Log Movie Update

```typescript
// In movie update route
import { logAuditFromRequest, createChangesObject } from '../lib/audit-service.js';

// Before update
const oldMovie = await getMovie(movieId);

// Perform update
await updateMovie(movieId, newData);

// After update
const updatedMovie = await getMovie(movieId);

// Log the change
await logAuditFromRequest(
  request,
  'update',
  'movie',
  movieId,
  updatedMovie.title.en,
  createChangesObject(oldMovie, updatedMovie)
);
```

### Example 2: Log Cast Addition

```typescript
// In add cast route
await logAuditFromRequest(
  request,
  'add_cast',
  'movie',
  movieId,
  movieTitle,
  {
    personId: { before: null, after: personId },
    character: { before: null, after: characterName },
    castOrder: { before: null, after: order }
  }
);
```

### Example 3: Log Deletion

```typescript
// Before deleting
const movie = await getMovie(movieId);

// Delete
await deleteMovie(movieId);

// Log deletion
await logAuditFromRequest(
  request,
  'delete',
  'movie',
  movieId,
  movie.title.en
);
```

## Frontend Integration (Future)

### Admin Audit Log Viewer

**Page**: `/admin/audit-logs`

**Features**:
- Table view of all audit logs
- Filters:
  - By user (dropdown)
  - By action type (create/update/delete/etc.)
  - By entity type (movie/person/etc.)
  - By date range
- Pagination
- Export to CSV
- Detailed change diff viewer

**UI Components**:
```tsx
<AuditLogTable
  logs={logs}
  onFilter={handleFilter}
  onPageChange={handlePageChange}
/>

<AuditLogDetail
  log={selectedLog}
  showChanges={true}
/>
```

### Entity History Widget

Show audit history on entity pages (e.g., movie edit page):

```tsx
<EntityHistory
  entityType="movie"
  entityId={movieId}
  limit={10}
/>
```

## Security Considerations

### Access Control

- ✅ **Audit logs are admin-only** - Regular users and editors cannot view logs
- ✅ **Editors cannot delete logs** - Only database admins can delete
- ✅ **Immutable records** - No UPDATE or DELETE operations on audit_logs table via API
- ✅ **Soft delete on users** - `ON DELETE SET NULL` preserves logs even if user is deleted

### Privacy

- ⚠️ **IP addresses stored** - For security, but consider GDPR implications
- ⚠️ **User agent stored** - Helps identify suspicious activity
- ✅ **No sensitive data** - Passwords and tokens are never logged
- ✅ **Changes are sanitized** - Only relevant field changes are stored

### Data Retention

**Recommendation**: Implement automatic cleanup policy:
- Keep logs for 1 year by default
- Archive older logs to cold storage
- Allow admins to configure retention period

```sql
-- Example cleanup query (run monthly)
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';
```

## Migration Guide

### Updating Existing Routes

To add audit logging to existing routes:

1. **Import audit service**:
```typescript
import { logAuditFromRequest } from '../lib/audit-service.js';
```

2. **Add logging after successful operations**:
```typescript
// After create/update/delete
await logAuditFromRequest(
  request,
  'update',  // or 'create', 'delete', etc.
  'movie',
  movieId,
  movieTitle
);
```

3. **Update middleware** (if needed):
```typescript
// Change from requireAdmin to requireEditor for content routes
preHandler: [requireAuth, requireEditor]
```

### Granting Editor Role

**Via Database**:
```sql
UPDATE users
SET role = 'editor'
WHERE email = 'editor@example.com';
```

**Via API** (admin endpoint - to be implemented):
```http
PATCH /api/admin/users/<user-id>
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "role": "editor"
}
```

## Performance Considerations

### Indexing

Indexes are created on:
- `user_id` - Fast lookup by user
- `(entity_type, entity_id)` - Fast entity history queries
- `created_at DESC` - Fast recent activity queries

### Query Optimization

- Use pagination (limit/offset) for large result sets
- Consider caching frequently accessed logs (Redis)
- Archive old logs to separate table if volume is high

### Async Logging

Audit logging is designed to be non-blocking:
```typescript
// Errors in logging don't break the main operation
try {
  await logAudit(entry);
} catch (error) {
  console.error('Audit logging failed:', error);
  // Continue - don't throw
}
```

## Testing

### Unit Tests

```typescript
describe('Audit Service', () => {
  it('should log audit entry', async () => {
    await logAudit({
      userId: testUser.id,
      action: 'create',
      entityType: 'movie',
      entityId: 'test-id',
      entityName: 'Test Movie'
    });
    
    const logs = await getAuditLogs({ limit: 1 });
    expect(logs[0].action).toBe('create');
  });
});
```

### Integration Tests

```typescript
it('should log movie update', async () => {
  const response = await app.inject({
    method: 'PUT',
    url: '/api/movies/123',
    headers: { authorization: `Bearer ${editorToken}` },
    payload: { runtime: 125 }
  });
  
  expect(response.statusCode).toBe(200);
  
  const logs = await getEntityAuditHistory('movie', '123');
  expect(logs[0].action).toBe('update');
  expect(logs[0].changes.runtime.after).toBe(125);
});
```

## Future Enhancements

### Phase 1 (Current)
- [x] Database schema
- [x] Audit service
- [x] Editor role
- [x] API endpoints
- [x] Middleware

### Phase 2 (Completed - December 2025)
- [x] Admin UI for viewing logs (`/admin/audit-logs`)
- [x] Entity history widgets (`EntityHistory` component on movie edit page)
- [x] Export functionality (CSV export)
- [ ] User activity dashboard (deferred to Phase 3)

### Phase 3 (Future)
- [ ] Real-time audit log streaming (WebSocket)
- [ ] Advanced filtering and search
- [ ] Audit log analytics (most active users, common actions, etc.)
- [ ] Automated alerts for suspicious activity
- [ ] Rollback functionality (undo changes)
- [ ] Compliance reports (GDPR, etc.)

## Related Documentation

- [User Accounts](./USER_ACCOUNTS.md) - Authentication system
- [API Reference](../architecture/API_REFERENCE.md) - All API endpoints
- [Database Schema](../architecture/SCHEMA_OVERVIEW.md) - Complete schema

---

**Last Updated**: December 11, 2025
