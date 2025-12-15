# E2E Tests Quick Reference

## Setup (One-time)

```bash
# 1. Create test database
psql -U laocinema -d postgres -c "CREATE DATABASE lao_cinema_test;"

# 2. Run migrations on test database
cd ../db
TEST_DATABASE_URL=postgresql://laocinema:laocinema@localhost:5432/lao_cinema_test npm run db:push
```

## Run Tests

```bash
# All tests (headless)
npm run test:e2e

# UI mode (best for development)
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Specific test file
npx playwright test e2e/auth.spec.ts

# Watch mode
npx playwright test --ui
```

## Test Files

- `homepage.spec.ts` - Homepage, navigation, language switching
- `auth.spec.ts` - User registration, login, logout
- `rental.spec.ts` - Movie rental flows, payment modal
- `video-playback.spec.ts` - Video player, watch progress

## Helpers

- `helpers/db.ts` - Database seeding (movies, users, genres, videos)
- `helpers/auth.ts` - Auth helpers (register, login, logout)
- `fixtures/base.ts` - Auto database cleanup

## Writing Tests

```typescript
import { test, expect } from './fixtures/base';
import { seedTestMovie } from './helpers/db';

test('should do something', async ({ page }) => {
  const movie = await seedTestMovie({ titleEn: 'Test' });
  await page.goto(`/en/movies/${movie.id}`);
  await expect(page.locator('h1')).toContainText('Test');
});
```

See `../E2E_TESTING.md` for full documentation.
