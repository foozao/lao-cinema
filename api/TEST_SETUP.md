# Test Setup Instructions

## Prerequisites

The auth and migration tests require the user account tables to exist in the test database.

## Setup Steps

1. **Ensure test database exists:**
   ```bash
   createdb lao_cinema_test
   ```

2. **Run migrations on test database:**
   ```bash
   cd db
   TEST_DATABASE_URL="postgresql://localhost:5432/lao_cinema_test" npm run migrate
   ```

3. **Run tests:**
   ```bash
   cd api
   npm test
   ```

## Test Files Created

### `src/routes/auth.test.ts` (21 tests)
Comprehensive tests for authentication system:
- ✅ User registration (with/without display name, validation)
- ✅ Login (correct/incorrect credentials)
- ✅ Get current user (with/without token)
- ✅ Update profile (display name, profile image)
- ✅ Change password (validation, verification)
- ✅ Logout (single session)
- ✅ Logout all (multiple sessions)
- ✅ Delete account (with password confirmation)

### `src/routes/migration.test.ts` (10 tests)
Tests for anonymous-to-authenticated data migration:
- ✅ Migrate anonymous rentals to user account
- ✅ Migrate anonymous watch progress to user account
- ✅ Migrate both rentals and watch progress together
- ✅ Handle migration with no anonymous data
- ✅ Prevent migrating other users' data
- ✅ Require authentication for migration
- ✅ Handle duplicate rentals (keep user rental)
- ✅ Handle duplicate watch progress (keep most recent)
- ✅ Get user statistics (rentals, watch progress, completions)
- ✅ Return zero stats for new users

## Test Coverage

The tests cover:
- **Authentication flow**: Register → Login → Logout
- **Profile management**: Update display name, profile image, password
- **Session management**: Single logout, logout all devices
- **Account deletion**: With password confirmation
- **Anonymous migration**: Rentals and watch progress
- **Edge cases**: Duplicates, validation, authorization
- **User statistics**: Activity tracking

## Running Individual Test Suites

```bash
# Run only auth tests
npm test -- auth.test.ts

# Run only migration tests
npm test -- migration.test.ts

# Run all tests
npm test
```

## Notes

- Tests use the `build()` helper from `src/test/app.ts`
- Each test gets a fresh app instance for isolation
- Database is truncated between tests
- Tests require `TEST_DATABASE_URL` environment variable
