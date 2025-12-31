# TMDB Integration

This module provides integration with The Movie Database (TMDB) API for importing and syncing movie data.

## Setup

1. **Get a TMDB API Key**
   - Sign up at https://www.themoviedb.org
   - Go to Settings → API
   - Request an API key (free for non-commercial use)

2. **Configure Environment**
   ```bash
   # Copy the example file
   cp env.example .env.local
   
   # Add your API key to .env.local
   NEXT_PUBLIC_TMDB_API_KEY=your_actual_api_key_here
   ```

3. **Restart Development Server**
   ```bash
   npm run dev
   ```

## Usage

### Import a Movie

1. Go to Admin → Import from TMDB
2. Find a movie on themoviedb.org and copy its ID from the URL
   - Example: `https://www.themoviedb.org/movie/550` → ID is `550`
3. Enter the ID and click "Fetch"
4. Review the preview
5. Click "Import Movie"
6. Add Lao translations in the edit form

### Programmatic Usage

```typescript
import { tmdbClient, mapTMDBToMovie } from '@/lib/tmdb';

// Fetch movie details
const tmdbData = await tmdbClient.getMovieDetails(550);

// Map to our schema
const movie = mapTMDBToMovie(tmdbData);

// Search for movies
const results = await tmdbClient.searchMovies('Citizen Kane');
```

## Architecture

### Files

- **`client.ts`** - TMDB API client with fetch methods
- **`mapper.ts`** - Maps TMDB data to our Movie schema
- **`index.ts`** - Central exports

### Data Flow

```
TMDB API → TMDBMovieDetails → mapTMDBToMovie() → Movie (partial)
                                                      ↓
                                              Admin adds Lao translations
                                                      ↓
                                              Complete Movie saved to DB
```

### Sync Strategy

**Auto-synced from TMDB:**
- English title, overview, tagline
- Metadata: budget, revenue, runtime, ratings
- Media: poster, backdrop paths
- Relationships: genres, companies, countries

**Never overwritten (manual only):**
- Lao translations (title, overview, tagline)
- Video sources (streaming URLs)
- Cast & crew (added manually or via separate TMDB calls)

### Field Mapping

| TMDB Field | Our Field | Notes |
|------------|-----------|-------|
| `title` | `title.en` | English from TMDB |
| - | `title.lo` | Manual Lao translation |
| `overview` | `overview.en` | English from TMDB |
| - | `overview.lo` | Manual Lao translation |
| `poster_path` | `poster_path` | TMDB CDN URL |
| `budget` | `budget` | In USD |
| `genres` | `genres` | Array with English names |

## API Rate Limits

TMDB enforces rate limits:
- ~40 requests per 10 seconds
- ~1000 requests per day (free tier)

**Best practices:**
- Cache responses when possible
- Use bulk operations sparingly
- Show loading states to users

## Future Enhancements

- [ ] Search movies by title (not just ID)
- [ ] Bulk import multiple movies
- [ ] Auto-sync ratings/popularity on schedule
- [ ] Import cast & crew data
- [ ] Download and host images locally
- [ ] Translation workflow tools

## Troubleshooting

### "TMDB API key is required"
- Make sure `.env.local` exists with `NEXT_PUBLIC_TMDB_API_KEY`
- Restart the dev server after adding the key

### "TMDB API Error: Invalid API key"
- Check that your API key is correct
- Ensure it's activated on TMDB (may take a few minutes)

### "Failed to fetch movie"
- Verify the TMDB ID is correct
- Check your internet connection
- Ensure TMDB API is not down (check status.themoviedb.org)

## Resources

- [TMDB API Documentation](https://developer.themoviedb.org/docs)
- [TMDB API Reference](https://developer.themoviedb.org/reference/intro/getting-started)
- [Get API Key](https://www.themoviedb.org/settings/api)
