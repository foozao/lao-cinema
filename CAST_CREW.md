# Cast & Crew Implementation

## Overview

**Updated Architecture (Nov 2024)**: Migrated to people-centric design with separate `people` table.

Cast and crew are now stored as:
1. **People** - Actors, directors, crew members (stored once)
2. **Movie-Person Relationships** - Links between movies and people
3. **Role-Specific Data** - Character names, job titles (per movie)

See `PEOPLE_MIGRATION.md` for migration details.

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

### Person (Actor, Director, Crew)
```typescript
{
  id: number; // TMDB person ID
  name: { en: string; lo?: string };
  biography?: { en: string; lo?: string };
  profile_path?: string;
  birthday?: string;
  deathday?: string;
  place_of_birth?: string;
  known_for_department?: string;
  popularity?: number;
  gender?: number;
  imdb_id?: string;
  homepage?: string;
}
```

### Cast Member (Person + Role)
```typescript
{
  person: Person; // Full person object
  character: { en: string; lo?: string };
  order: number;
}
```

### Crew Member (Person + Job)
```typescript
{
  person: Person; // Full person object
  job: { en: string; lo?: string };
  department: string;
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

### People Table
```sql
CREATE TABLE people (
  id INTEGER PRIMARY KEY,  -- TMDB person ID
  profile_path TEXT,
  birthday TEXT,
  deathday TEXT,
  place_of_birth TEXT,
  known_for_department TEXT,
  popularity REAL,
  gender INTEGER,
  imdb_id TEXT,
  homepage TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE people_translations (
  person_id INTEGER REFERENCES people(id),
  language language_enum,
  name TEXT NOT NULL,
  biography TEXT,
  PRIMARY KEY (person_id, language)
);
```

### Movie-Person Relationships
```sql
CREATE TABLE movie_cast (
  movie_id UUID REFERENCES movies(id),
  person_id INTEGER REFERENCES people(id),
  order INTEGER NOT NULL,
  PRIMARY KEY (movie_id, person_id)
);

CREATE TABLE movie_cast_translations (
  movie_id UUID,
  person_id INTEGER,
  language language_enum,
  character TEXT NOT NULL,
  PRIMARY KEY (movie_id, person_id, language)
);

CREATE TABLE movie_crew (
  movie_id UUID REFERENCES movies(id),
  person_id INTEGER REFERENCES people(id),
  department TEXT NOT NULL,
  PRIMARY KEY (movie_id, person_id, department)
);

CREATE TABLE movie_crew_translations (
  movie_id UUID,
  person_id INTEGER,
  department TEXT,
  language language_enum,
  job TEXT NOT NULL,
  PRIMARY KEY (movie_id, person_id, department, language)
);
```

**Benefits:**
- No data duplication (person stored once)
- Efficient queries (find all movies by person)
- Rich person profiles (biography, birthday, etc.)
- Bilingual support (names and bios in en/lo)

## Future Enhancements

- [x] Separate people table (completed)
- [x] Person biographies support (completed)
- [x] TMDB person details import (completed)
- [ ] Add person detail pages (frontend)
- [ ] Search by actor/director (frontend)
- [ ] Filter movies by cast/crew (frontend)
- [ ] Person filmography page (frontend)
- [ ] Add person photos gallery
- [ ] Add awards and nominations
- [ ] Social media links

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
