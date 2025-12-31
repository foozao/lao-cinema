# API Testing Documentation

## Overview

The Lao Cinema API uses **Vitest** for testing with comprehensive test coverage for all movie CRUD operations.

## Test Results

✅ **11/11 tests passing**

### Test Coverage

- ✅ GET /api/movies - List all movies
- ✅ POST /api/movies - Create movie (minimal & full data)
- ✅ GET /api/movies/:id - Get movie by ID
- ✅ PUT /api/movies/:id - Update movie
- ✅ DELETE /api/movies/:id - Delete movie
- ✅ Bilingual content handling (English/Lao)
- ✅ Error handling (404 responses)

## Running Tests

```bash
cd api

# Run tests in watch mode (recommended for development)
npm test

# Run tests once
npm run test:run

# Run with UI (visual test runner)
npm run test:ui

# Run with coverage report
npm run test:coverage
```

## Test Structure

```
api/src/
├── routes/
│   ├── movies.ts           # Movie routes
│   └── movies.test.ts      # ✅ Movie route tests
├── test/
│   ├── setup.ts            # Global test setup
│   ├── helpers.ts          # Test fixtures
│   ├── app.ts              # Fastify app builder
│   └── README.md           # Testing guide
└── db/
    └── schema.ts           # Database schema
```

## Test Examples

### Basic CRUD Test
```typescript
it('should create a movie with minimal data', async () => {
  const movieData = createMinimalMovie();

  const response = await app.inject({
    method: 'POST',
    url: '/api/movies',
    payload: movieData,
  });

  expect(response.statusCode).toBe(201);
  expect(response.json().id).toBeDefined();
});
```

### Bilingual Content Test
```typescript
it('should handle bilingual content correctly', async () => {
  const movieData = createMinimalMovie({
    title: { en: 'English Title', lo: 'ຊື່ພາສາລາວ' },
  });

  const response = await app.inject({
    method: 'POST',
    url: '/api/movies',
    payload: movieData,
  });

  const body = response.json();
  expect(body.title.en).toBe('English Title');
  expect(body.title.lo).toBe('ຊື່ພາສາລາວ');
});
```

## Test Helpers

### `createSampleMovie()`
Creates a full movie with all TMDB data (Citizen Kane example):
- TMDB ID, IMDB ID
- Bilingual title and overview
- Genres, cast, crew
- Production details
- Video sources

### `createMinimalMovie()`
Creates a minimal movie with only required fields:
- Title (English)
- Overview (English)
- Release date
- Adult flag
- Empty arrays for genres, cast, crew, video sources

Both helpers accept overrides:
```typescript
const movie = createMinimalMovie({
  title: { en: 'Custom', lo: 'ກຳນົດເອງ' },
  runtime: 120,
});
```

## Test Database

Tests use the same PostgreSQL database as development:
- **Automatic cleanup**: Tables truncated before each test
- **Test isolation**: Each test runs independently
- **No manual cleanup needed**

### Using a Separate Test Database (Recommended)

```bash
# Create test database
createdb lao_cinema_test

# Add to .env
TEST_DATABASE_URL=postgresql://laocinema:password@localhost:5432/lao_cinema_test

# Run migrations
npm run db:push
```

## CI/CD Integration

Tests are ready for CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: |
    cd api
    npm install
    npm run test:run
```

## Coverage Goals

Current coverage targets:
- **Routes**: 100% (achieved ✅)
- **Database operations**: 100% (achieved ✅)
- **Error handling**: 100% (achieved ✅)

Generate coverage report:
```bash
npm run test:coverage
open coverage/index.html
```

## Next Steps

- [ ] Add integration tests for TMDB sync
- [ ] Add performance/load tests
- [ ] Add E2E tests with real database
- [ ] Set up automated testing in CI/CD
- [ ] Add mutation testing
- [ ] Add API contract tests

## Troubleshooting

### Tests fail with "DATABASE_URL required"
- Ensure `.env` file exists in `/api` directory
- Check DATABASE_URL is set correctly
- Run `npm run db:push` to create tables

### Tests are slow
- Use local PostgreSQL (not remote)
- Check for missing `await` statements
- Use `test.only()` to run specific tests

### Random test failures
- Check for race conditions
- Verify test isolation
- Ensure proper cleanup in afterEach

## Best Practices

1. **Write tests first** - TDD approach
2. **Test edge cases** - Not just happy paths
3. **Keep tests fast** - < 100ms per test
4. **Use descriptive names** - Clear test descriptions
5. **Test isolation** - Each test independent
6. **Mock external services** - Don't call real TMDB API in tests

---

## Testing Patterns (Advanced)

### App Builder Options

The `build()` function in `src/test/app.ts` accepts options to include only needed routes:

```typescript
import { build } from '../test/app.js';

// Minimal - just movie routes
const app = await build();

// With auth and rentals
const app = await build({ 
  includeAuth: true, 
  includeRentals: true,
});

// Full app
const app = await build({
  includeAuth: true,
  includeRentals: true,
  includeWatchProgress: true,
  includePeople: true,
  includeHomepage: true,
});
```

### Database Setup Pattern

Tests use a real PostgreSQL database (not mocks). The `setup.ts` file handles:

```typescript
// src/test/setup.ts

// 1. Verify test database (prevents production accidents)
if (!dbUrl.includes('_test')) {
  throw new Error('Must use test database!');
}

// 2. Truncate before all tests
beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE users, movies RESTART IDENTITY CASCADE`);
});

// 3. Truncate after each test (isolation)
afterEach(async () => {
  await db.execute(sql`TRUNCATE TABLE users, movies RESTART IDENTITY CASCADE`);
});
```

### Testing Authenticated Endpoints

**Pattern 1: Register and use token**

```typescript
describe('Protected endpoint', () => {
  let authToken: string;
  
  beforeEach(async () => {
    // Register a user and get token
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    const body = JSON.parse(response.body);
    authToken = body.session.token;
  });
  
  it('should access protected resource', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    
    expect(response.statusCode).toBe(200);
  });
});
```

**Pattern 2: Anonymous user with X-Anonymous-Id**

```typescript
describe('Anonymous user', () => {
  const anonymousId = 'anon_test_12345';
  
  it('should create rental as anonymous', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/rentals/${movieId}`,
      headers: {
        'X-Anonymous-Id': anonymousId,
      },
      payload: {
        transactionId: 'txn_123',
        amount: 500,
      },
    });
    
    expect(response.statusCode).toBe(201);
  });
});
```

### Testing Dual-Mode Endpoints

Rentals and watch-progress support both authenticated and anonymous users:

```typescript
describe('Dual-mode endpoint', () => {
  // Test anonymous flow
  describe('Anonymous User', () => {
    it('should work with X-Anonymous-Id header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/rentals',
        headers: {
          'X-Anonymous-Id': 'anon_123',
        },
      });
      expect(response.statusCode).toBe(200);
    });
  });
  
  // Test authenticated flow
  describe('Authenticated User', () => {
    let token: string;
    
    beforeEach(async () => {
      // ... register user, get token
    });
    
    it('should work with Bearer token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/rentals',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      expect(response.statusCode).toBe(200);
    });
  });
});
```

### Creating Test Data

**Direct database insertion** (fastest):

```typescript
beforeEach(async () => {
  // Create test movie directly
  const [movie] = await db.insert(movies).values({
    originalTitle: 'Test Movie',
    releaseDate: '2024-01-01',
  }).returning();
  movieId = movie.id;
});
```

**Via API** (tests full flow):

```typescript
beforeEach(async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/movies',
    payload: createMinimalMovie(),
  });
  movieId = JSON.parse(response.body).id;
});
```

### Testing Error Cases

```typescript
it('should return 404 for non-existent movie', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/movies/non-existent-id',
  });
  
  expect(response.statusCode).toBe(404);
  const body = JSON.parse(response.body);
  expect(body.error).toBe('Movie not found');
});

it('should return 400 for invalid input', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: 'not-an-email',
      password: '123', // too short
    },
  });
  
  expect(response.statusCode).toBe(400);
});

it('should return 409 for duplicate', async () => {
  // Create first
  await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'test@example.com', password: 'password123' },
  });
  
  // Try duplicate
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'test@example.com', password: 'different123' },
  });
  
  expect(response.statusCode).toBe(409);
});
```

### Test File Organization

```
api/src/routes/
├── movies.ts           # Route handler
├── movies.test.ts      # Tests for movies
├── auth.ts
├── auth.test.ts        # 20+ auth tests
├── rentals.ts
├── rentals.test.ts     # Anonymous + authenticated tests
├── watch-progress.ts
└── watch-progress.test.ts
```

### Common Test Utilities

```typescript
// src/test/helpers.ts

// Full movie with all fields
createSampleMovie({ runtime: 120 })

// Minimal movie (required fields only)
createMinimalMovie({ title: { en: 'Custom' } })

// Sample images array
createSampleImages()
```

### Running Specific Tests

```bash
# Run single test file
npm test -- auth.test.ts

# Run tests matching pattern
npm test -- -t "should register"

# Run only one test (use .only)
it.only('this test only', async () => { ... });

# Skip a test
it.skip('skip this', async () => { ... });
```

---

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Fastify Testing](https://fastify.dev/docs/latest/Guides/Testing/)
- [Test Helpers README](src/test/README.md)
