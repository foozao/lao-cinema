# Vanity URLs for Movies

## Overview

Movies can have custom vanity URLs (slugs) instead of using UUID-based URLs. This makes URLs more user-friendly and SEO-optimized.

## Examples

- **With slug**: `/movies/the-signal`
- **Without slug**: `/movies/550e8400-e29b-41d4-a716-446655440000`

## Slug Validation Rules

Slugs must follow these rules:

1. **Lowercase only**: All letters must be lowercase (a-z)
2. **Alphanumeric**: Only letters (a-z) and numbers (0-9) allowed
3. **Hyphens**: Hyphens (-) allowed to separate words
4. **No special characters**: No spaces, underscores, or other special characters
5. **Cannot start/end with hyphen**: Must start and end with a letter or number
6. **No consecutive hyphens**: Cannot have multiple hyphens in a row (e.g., `--`)
7. **Length limit**: Maximum 100 characters
8. **Unique**: Each slug must be unique across all movies

### Valid Examples

✅ `the-signal`
✅ `lao-wedding-2024`
✅ `sabaidee-luang-prabang`
✅ `film-123`

### Invalid Examples

❌ `The-Signal` (uppercase letters)
❌ `the_signal` (underscores not allowed)
❌ `the signal` (spaces not allowed)
❌ `-the-signal` (starts with hyphen)
❌ `the-signal-` (ends with hyphen)
❌ `the--signal` (consecutive hyphens)
❌ `the-signal!` (special characters)

## Implementation

### Database

- **Table**: `movies`
- **Column**: `slug` (text, unique, nullable)
- **Migration**: `0013_new_nebula.sql`

### Backend Validation

- **File**: `/api/src/lib/movie-schemas.ts`
- **Validator**: `slugValidator` using Zod
- **Regex**: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`

### Frontend Validation

- **Utilities**: `/web/lib/slug-utils.ts`
- **Functions**:
  - `isValidSlug(slug)` - Validates slug format
  - `generateSlug(text)` - Auto-generates slug from text
  - `sanitizeSlug(slug)` - Sanitizes user input
  - `getSlugValidationError(slug)` - Returns error message if invalid

### Admin Panel

- **Location**: Movie edit form → Movie Details section
- **Features**:
  - Real-time validation with error messages
  - Auto-sanitization (converts to lowercase, removes invalid chars)
  - "Generate from title" button to auto-create slug
  - Visual error indicators (red border, error icon)
  - Prevents saving if slug is invalid

## API Endpoints

### GET /api/movies/:id

Accepts both UUID and slug:

```bash
# By UUID
GET /api/movies/550e8400-e29b-41d4-a716-446655440000

# By slug
GET /api/movies/the-signal
```

The API automatically detects whether the parameter is a UUID or slug using regex pattern matching.

## Frontend Routing

All movie links automatically use slug when available:

- Movie cards
- Search results
- People pages (filmography)
- Continue watching

**Helper functions** (`/web/lib/movie-url.ts`):
- `getMoviePath(movie)` - Returns slug or ID
- `getMovieUrl(movie)` - Full movie URL
- `getMovieWatchUrl(movie)` - Watch page URL
- `getMovieCastCrewUrl(movie)` - Cast & crew page URL

## Usage in Admin Panel

1. Navigate to any movie edit page
2. Find "Vanity URL Slug" field in Movie Details section
3. Either:
   - Type a custom slug (auto-sanitizes as you type)
   - Click "Generate from title" to auto-create from English title
4. Fix any validation errors shown in red
5. Save the movie

## Best Practices

1. **Keep it short**: Shorter slugs are easier to remember and share
2. **Use English**: Use English words for better SEO and international accessibility
3. **Be descriptive**: Include key words from the movie title
4. **Avoid numbers**: Unless part of the title (e.g., "film-2024")
5. **Use hyphens**: Separate words with hyphens for readability

## Backward Compatibility

- Movies without slugs continue to work with UUID-based URLs
- Both slug and UUID URLs work simultaneously
- Existing links are not broken
- Slugs are optional - can be left empty

## SEO Benefits

1. **Readable URLs**: Easier for users to understand and remember
2. **Keyword-rich**: Contains relevant keywords for search engines
3. **Shareable**: More likely to be shared on social media
4. **Professional**: Looks more polished than UUID-based URLs

## Technical Notes

- Slugs are stored in the `movies.slug` column
- Uniqueness is enforced at the database level
- Frontend auto-sanitizes input to prevent invalid slugs
- Backend validates before saving to database
- API uses regex to distinguish UUID from slug: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
