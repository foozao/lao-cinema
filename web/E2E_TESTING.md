# E2E Testing with Playwright

This document provides instructions for running and writing e2e tests for the Lao Cinema application.

## Test Status

**Current: 11 tests implemented, 13 tests skipped (pending feature implementation)**

✅ **Passing (11 tests):**
- Authentication (7 tests): register, login, logout, validation, protected routes
- Homepage (4 tests): load, language switch, display movies, navigation

⏭️ **Skipped (13 tests):**
- Homepage search (1 test) - Feature not implemented
- Rentals (7 tests) - Pending payment modal and video source setup
- Video Playback (5 tests) - Pending HLS streaming configuration

**Note:** Some tests may occasionally fail during parallel execution due to database timing. Run with `--workers=1` for more reliable results, or rely on automatic retries.

## Overview

E2E tests run against a **test database** (`lao_cinema_test`) on **separate ports** to avoid conflicts with development servers:

**Development servers:**
- Next.js: `http://localhost:3000`
- API: `http://localhost:3001`

**E2E test servers:**
- Next.js: `http://localhost:3010`
- API: `http://localhost:3011`

This allows you to run dev servers and e2e tests simultaneously without port conflicts.

The tests cover:

- Homepage navigation and language switching
- User authentication (register, login, logout)
- Movie rental flows (anonymous and authenticated)
- Video playback and watch progress tracking
- Cross-device data synchronization

## Prerequisites

### 1. Test Database Setup

Start PostgreSQL (if not already running):

```bash
# From project root
docker compose up -d
```

Create the test database if it doesn't exist:

```bash
PGPASSWORD=laocinema_dev psql -U laocinema -h localhost -d postgres -c "CREATE DATABASE lao_cinema_test;"
```

### 2. Run Migrations on Test Database

```bash
cd ../db
npm run db:reset:test
```

### 3. Verify PostgreSQL is Running

```bash
PGPASSWORD=laocinema_dev psql -U laocinema -h localhost -d lao_cinema_test -c "SELECT 1;"
```

## Running Tests

### Run all tests (headless)

```bash
npm run test:e2e
```

### Run with UI mode (recommended for development)

```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)

```bash
npm run test:e2e:headed
```

### Debug a specific test

```bash
npm run test:e2e:debug e2e/auth.spec.ts
```

### Run a specific test file

```bash
npx playwright test e2e/rental.spec.ts
```

### Run tests matching a pattern

```bash
npx playwright test --grep "should login"
```

## Test Structure

```
web/
├── e2e/
│   ├── fixtures/
│   │   └── base.ts           # Base test fixture with auto DB cleanup
│   ├── helpers/
│   │   ├── auth.ts           # Authentication helpers (login, register, etc.)
│   │   └── db.ts             # Database seeding and cleanup utilities
│   ├── homepage.spec.ts      # Homepage and navigation tests
│   ├── auth.spec.ts          # User authentication tests
│   ├── rental.spec.ts        # Movie rental flow tests
│   └── video-playback.spec.ts # Video player tests
└── playwright.config.ts      # Playwright configuration
```

## Writing Tests

### Basic Test Structure

Always import from `./fixtures/base` instead of `@playwright/test` to get automatic database cleanup:

```typescript
import { test, expect } from './fixtures/base';
import { seedTestMovie } from './helpers/db';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    // Database is automatically cleaned before each test
    
    // Seed test data
    const movie = await seedTestMovie({
      titleEn: 'Test Movie',
      titleLo: 'ຮູບເງົາທົດສອບ',
    });
    
    // Navigate and interact
    await page.goto(`/en/movies/${movie.id}`);
    await expect(page.locator('h1')).toContainText('Test Movie');
  });
});
```

### Database Seeding Helpers

The `helpers/db.ts` file provides utilities to seed test data:

```typescript
// Seed a movie
const movie = await seedTestMovie({
  id: 123,
  titleEn: 'The Matrix',
  titleLo: 'ແມດທຣິກ',
  rentalPrice: 3.99,
  rentalDuration: 48,
});

// Seed a user
const user = await seedTestUser({
  email: 'test@example.com',
  password: 'password123',
  displayName: 'Test User',
  role: 'admin',
});

// Add video source to a movie
await addVideoSource(movie.id, {
  quality: '1080p',
  url: 'http://localhost:3002/videos/test/master.m3u8',
});

// Seed a genre
const genre = await seedTestGenre({
  nameEn: 'Action',
  nameLo: 'ບູລິມະສິດ',
});
```

### Authentication Helpers

The `helpers/auth.ts` file provides authentication utilities:

```typescript
// Register a new user
await registerUser(page, {
  email: 'new@example.com',
  password: 'password123',
  displayName: 'New User',
});

// Login
await loginUser(page, {
  email: 'user@example.com',
  password: 'password123',
});

// Logout
await logoutUser(page);

// Check if logged in
const loggedIn = await isLoggedIn(page);
```

### Testing Both Languages

```typescript
test('should display content in English', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('text=Featured Movies')).toBeVisible();
});

test('should display content in Lao', async ({ page }) => {
  await page.goto('/lo');
  await expect(page.locator('text=ຮູບເງົາແນະນໍາ')).toBeVisible();
});
```

### Waiting for Navigation

```typescript
// Wait for URL pattern
await page.waitForURL(/\/en\/movies\/\d+/);

// Wait for specific URL
await page.waitForURL('/en/profile');

// Wait for element
await page.waitForSelector('text=Movie Title');
```

### Testing Video Playback

```typescript
test('should play video', async ({ page }) => {
  const movie = await seedTestMovie({ id: 1 });
  await addVideoSource(movie.id);
  
  // Rent and watch
  await page.goto(`/en/movies/${movie.id}`);
  await page.click('button:has-text("Rent")');
  await page.click('button:has-text("Confirm")');
  await page.click('button:has-text("Watch Now")');
  
  // Verify player is visible
  const video = page.locator('video');
  await expect(video).toBeVisible();
  
  // Interact with controls
  await page.click('[aria-label="Play"]');
  await page.waitForTimeout(2000);
  await page.click('[aria-label="Pause"]');
});
```

## Test Database Safety

The test suite has **multiple safety checks** to prevent accidental modification of production/dev data:

1. **URL validation**: `TEST_DATABASE_URL` must contain `_test`
2. **Auto cleanup**: Database is cleaned before each test
3. **Isolated server**: API server runs with `TEST_DATABASE_URL` environment variable
4. **CI mode**: In CI, servers don't reuse existing instances

## Debugging Tests

### Visual Debugging with UI Mode

```bash
npm run test:e2e:ui
```

This opens a browser where you can:
- See each test step
- Inspect the page at any point
- View network requests
- See console logs

### Step-by-Step Debugging

```bash
npm run test:e2e:debug
```

This opens Playwright Inspector where you can:
- Step through each action
- Pause and resume execution
- Edit selectors in real-time

### View Test Report

After running tests:

```bash
npx playwright show-report
```

### Screenshots and Traces

Failed tests automatically capture:
- Screenshots (saved to `test-results/`)
- Traces (viewable with `npx playwright show-trace`)

## CI/CD Integration

The Playwright config is ready for CI (GitHub Actions, etc.):

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: laocinema
          POSTGRES_PASSWORD: laocinema
          POSTGRES_DB: lao_cinema_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - name: Install dependencies
        run: |
          cd web && npm ci
          cd ../api && npm ci
      - name: Run migrations
        run: cd db && npm run db:reset:test
      - name: Install Playwright
        run: cd web && npx playwright install --with-deps chromium
      - name: Run E2E tests
        run: cd web && npm run test:e2e
        env:
          CI: true
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: web/playwright-report/
```

## Best Practices

1. **Always use test database**: Never run e2e tests against dev/prod databases
2. **Clean state**: Each test starts with a clean database (handled automatically)
3. **Seed only what you need**: Don't seed unnecessary data
4. **Use data-testid**: Add `data-testid` attributes to important elements for stable selectors
5. **Test user flows, not implementation**: Focus on what users do, not how the code works
6. **Keep tests independent**: Each test should work in isolation
7. **Use meaningful test names**: Describe what the test verifies
8. **Test both languages**: Verify English and Lao content when applicable

## Troubleshooting

### Tests fail with "Cannot connect to database"

Make sure PostgreSQL is running and the test database exists:

```bash
psql -U laocinema -d lao_cinema_test -c "SELECT 1;"
```

### Tests timeout waiting for servers

Increase timeout in `playwright.config.ts`:

```typescript
webServer: {
  timeout: 180 * 1000, // 3 minutes
}
```

### Database not cleaning properly

The base fixture should handle this, but you can manually clean:

```typescript
import { cleanDatabase } from './helpers/db';

test.beforeEach(async () => {
  await cleanDatabase();
});
```

### Tests interfere with each other

Make sure you're importing from `./fixtures/base`, not `@playwright/test`:

```typescript
// ✅ Correct
import { test, expect } from './fixtures/base';

// ❌ Wrong
import { test, expect } from '@playwright/test';
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
