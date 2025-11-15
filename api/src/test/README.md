# API Testing Guide

This directory contains tests for the Lao Cinema API.

## Test Stack

- **Vitest** - Fast, modern test runner
- **Supertest** - HTTP assertion library (via Fastify inject)
- **Test Database** - Uses same PostgreSQL database (cleaned between tests)

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

## Test Structure

```
src/test/
├── README.md          # This file
├── setup.ts           # Global test setup
├── helpers.ts         # Test fixtures and utilities
├── app.ts             # Fastify app builder for tests
└── ...
```

## Writing Tests

### Basic Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { build } from '../test/app.js';
import { createMinimalMovie } from '../test/helpers.js';

describe('My Feature', () => {
  let app;

  beforeEach(async () => {
    app = await build();
  });

  it('should do something', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/movies',
    });

    expect(response.statusCode).toBe(200);
  });
});
```

### Using Test Helpers

```typescript
import { createSampleMovie, createMinimalMovie } from '../test/helpers.js';

// Full movie with all TMDB data
const fullMovie = createSampleMovie();

// Minimal movie (only required fields)
const minMovie = createMinimalMovie();

// Override specific fields
const customMovie = createMinimalMovie({
  title: { en: 'Custom Title', lo: 'ຊື່ກຳນົດເອງ' },
  runtime: 120,
});
```

## Test Database

Tests use the same database as development but:
- Tables are truncated before each test
- Each test runs in isolation
- No need to manually clean up

### Environment Variables

Set `TEST_DATABASE_URL` to use a separate test database:

```bash
# .env
DATABASE_URL=postgresql://laocinema:password@localhost:5432/lao_cinema
TEST_DATABASE_URL=postgresql://laocinema:password@localhost:5432/lao_cinema_test
```

## Coverage

Generate coverage reports:

```bash
npm run test:coverage
```

View HTML report:
```bash
open coverage/index.html
```

## Best Practices

1. **Test Isolation** - Each test should be independent
2. **Descriptive Names** - Use clear test descriptions
3. **Arrange-Act-Assert** - Structure tests clearly
4. **Test Edge Cases** - Not just happy paths
5. **Fast Tests** - Keep tests quick (< 100ms each)

## Common Patterns

### Testing CRUD Operations

```typescript
describe('CRUD Operations', () => {
  it('should create', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/movies',
      payload: createMinimalMovie(),
    });
    expect(response.statusCode).toBe(201);
  });

  it('should read', async () => {
    // Create first
    const created = await createMovie();
    
    // Then read
    const response = await app.inject({
      method: 'GET',
      url: `/api/movies/${created.id}`,
    });
    expect(response.statusCode).toBe(200);
  });
});
```

### Testing Error Cases

```typescript
it('should return 404 for non-existent resource', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/movies/invalid-id',
  });
  
  expect(response.statusCode).toBe(404);
  const body = JSON.parse(response.body);
  expect(body.error).toBeDefined();
});
```

### Testing Bilingual Content

```typescript
it('should handle bilingual content', async () => {
  const movie = createMinimalMovie({
    title: { en: 'English', lo: 'ພາສາລາວ' },
  });

  const response = await app.inject({
    method: 'POST',
    url: '/api/movies',
    payload: movie,
  });

  const body = JSON.parse(response.body);
  expect(body.title.en).toBe('English');
  expect(body.title.lo).toBe('ພາສາລາວ');
});
```

## Troubleshooting

### "Cannot connect to database"
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Run `npm run db:push` to create tables

### "Tests are slow"
- Check for missing `await` statements
- Ensure database is local (not remote)
- Use `test.only()` to run single tests

### "Tests fail randomly"
- Check for race conditions
- Ensure proper cleanup in afterEach
- Verify test isolation

## Next Steps

- [ ] Add integration tests for TMDB sync
- [ ] Add performance tests
- [ ] Add E2E tests
- [ ] Set up CI/CD pipeline
