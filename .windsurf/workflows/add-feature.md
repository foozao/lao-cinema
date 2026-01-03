---
description: Checklist for adding a new feature to the platform
---

# Add Feature Workflow

## Planning Phase

1. **Define scope**: What does this feature do?
2. **Identify affected layers**: Database? API? Frontend? All?
3. **Consider i18n**: Does it need English and Lao translations?
4. **Review existing patterns**: Check similar features in codebase

## Implementation Checklist

### 1. Database (if needed)

- [ ] Add schema in `db/src/schema.ts`
- [ ] Add translation table if content is localized
- [ ] Run schema update workflow: `npm run db:update` (generates migration, reviews SQL, applies locally)
- [ ] Update `docs/architecture/SCHEMA_OVERVIEW.md`

### 2. API Routes

- [ ] Create route file in `api/src/routes/`
- [ ] Follow existing patterns (see similar routes)
- [ ] Add route to `api/src/test/app.ts` build options
- [ ] Use proper auth middleware (`requireAuth`, `requireAdmin`, `requireEditorOrAdmin`)
- [ ] Add audit logging for CUD operations
- [ ] Update `docs/architecture/API_REFERENCE.md`

**Route file structure:**
```typescript
import { FastifyInstance } from 'fastify';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';
import { db, schema } from '../db/index.js';

export default async function featureRoutes(fastify: FastifyInstance) {
  // GET /feature - List all
  fastify.get('/feature', async (request, reply) => { ... });
  
  // POST /feature - Create (protected)
  fastify.post('/feature', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    // ... create logic
    await logAuditFromRequest(request, { action: 'create', entityType: 'feature', ... });
  });
}
```

### 3. API Tests

- [ ] Create test file: `api/src/routes/feature.test.ts`
- [ ] Test happy paths
- [ ] Test error cases (validation, not found, unauthorized)
- [ ] Test with different user roles
- [ ] Run tests: `cd api && npm test -- feature.test.ts`

### 4. Frontend Types

- [ ] Add types to `web/lib/types.ts`
- [ ] Follow LocalizedText pattern for translatable fields

```typescript
export interface Feature {
  id: string;
  name: LocalizedText;  // { en: string; lo: string }
  // ...
}
```

### 5. Frontend API Client

- [ ] Add to `web/lib/api/client.ts`

```typescript
export const featureAPI = {
  getAll: () => fetchAPI<Feature[]>('/feature'),
  getById: (id: string) => fetchAPI<Feature>(`/feature/${id}`),
  create: (data: CreateFeatureData) => fetchAPI<Feature>('/feature', { method: 'POST', body: data }),
  // ...
};
```

### 6. Frontend Components

- [ ] Create component in `web/components/`
- [ ] Use `useLocale()` and `getLocalizedText()` for i18n
- [ ] Follow existing component patterns
- [ ] Make responsive (mobile-first)

### 7. Frontend Pages

- [ ] Create page in `web/app/[locale]/`
- [ ] Add proper metadata for SEO
- [ ] Handle loading and error states

### 8. Translations

- [ ] Add English strings to `web/messages/en.json`
- [ ] Add Lao strings to `web/messages/lo.json`

### 9. Frontend Tests

- [ ] Create test in `web/components/__tests__/`
- [ ] Mock API calls and i18n
- [ ] Test key user interactions

### 10. Documentation

- [ ] Update relevant docs in `docs/`
- [ ] Add to COMPONENTS.md if new component
- [ ] Update STATUS.md if major feature

## Final Verification

```bash
# Run all tests
// turbo
npm test

# Start servers and manually test
cd api && npm run dev  # Terminal 1
cd web && npm run dev  # Terminal 2
```

## Route Splitting Rule

If a route file exceeds ~300 lines, split using orchestrator pattern:
- `feature.ts` - Orchestrator (registers sub-routes)
- `feature-crud.ts` - Basic CRUD operations
- `feature-special.ts` - Specialized logic

See `rentals.ts` or `people.ts` for examples.
