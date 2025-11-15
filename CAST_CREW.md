# Cast & Crew Implementation

## Overview

Added full cast and crew import from TMDB, including directors, writers, producers, actors, and key production staff.

## What's Included

### Cast (Actors)
- **Top 20 actors** from TMDB
- Character names
- Profile photos
- Order/billing

### Crew (Production Staff)
Filtered to important roles:
- **Director**
- **Writer / Screenplay**
- **Producer / Executive Producer**
- **Director of Photography**
- **Original Music Composer**

## Implementation

### 1. TMDB Client (`/web/lib/tmdb/client.ts`)
Added `getMovieCredits()` method:
```typescript
async getMovieCredits(tmdbId: number): Promise<TMDBCredits>
```

Fetches cast and crew from TMDB `/movie/{id}/credits` endpoint.

### 2. Data Mapper (`/web/lib/tmdb/mapper.ts`)
Maps TMDB credits to our schema:
- Converts cast to `CastMember[]` (top 20)
- Filters crew to important jobs
- Creates bilingual structure (English from TMDB, Lao manual)

### 3. Import Flow
```
TMDB API → fetchMovieFromTMDB() → mapTMDBToMovie() → Database
           (parallel fetch)         (with credits)
```

**Parallel Fetching:**
```typescript
const [movieData, creditsData] = await Promise.all([
  tmdbClient.getMovieDetails(tmdbId),
  tmdbClient.getMovieCredits(tmdbId),
]);
```

## Data Structure

### Cast Member
```typescript
{
  id: number;
  name: { en: string; lo?: string };
  character: { en: string; lo?: string };
  profile_path?: string;
  order: number;
}
```

### Crew Member
```typescript
{
  id: number;
  name: { en: string; lo?: string };
  job: { en: string; lo?: string };
  department: string;
  profile_path?: string;
}
```

## Import Preview

When importing a movie, the preview now shows:

**Cast:**
```
Brad Pitt, Edward Norton, Helena Bonham Carter, Meat Loaf, Jared Leto and 15 more
```

**Crew:**
```
David Fincher - Director
Jim Uhls - Screenplay
Ross Grayson Bell - Producer
...
```

## Bilingual Support

- **English names/roles**: Imported from TMDB
- **Lao translations**: Added manually in edit form
- Names are stored as `LocalizedText` objects

## Example: Fight Club (TMDB ID: 550)

**Cast (20 actors):**
1. Brad Pitt as Tyler Durden
2. Edward Norton as The Narrator
3. Helena Bonham Carter as Marla Singer
4. Meat Loaf as Robert 'Bob' Paulsen
5. Jared Leto as Angel Face
... (15 more)

**Crew (filtered):**
- David Fincher - Director
- Jim Uhls - Screenplay
- Ross Grayson Bell - Producer
- Art Linson - Producer
- Ceán Chaffin - Producer
- Jeff Cronenweth - Director of Photography
- The Dust Brothers - Original Music Composer

## Database Storage

Stored as JSONB in PostgreSQL:
```sql
cast JSONB NOT NULL DEFAULT '[]'
crew JSONB NOT NULL DEFAULT '[]'
```

Allows flexible querying and indexing.

## Future Enhancements

- [ ] Add person detail pages
- [ ] Search by actor/director
- [ ] Filter movies by cast/crew
- [ ] Import person biographies
- [ ] Add person photos gallery
- [ ] Link to person's other movies
- [ ] Add awards and nominations

## Testing

Import any movie to see cast/crew:
```bash
# Example movies with great casts:
550  - Fight Club
13   - Forrest Gump
238  - The Godfather
680  - Pulp Fiction
```

## API Endpoints

No new endpoints needed - cast/crew included in movie data:
```
GET /api/movies/:id
```

Response includes:
```json
{
  "cast": [...],
  "crew": [...]
}
```

## Notes

- Cast limited to top 20 to avoid bloat
- Crew filtered to key roles (not all 100+ crew members)
- Profile photos use TMDB CDN
- Lao translations for names/roles added manually
- Character names and job titles are bilingual
