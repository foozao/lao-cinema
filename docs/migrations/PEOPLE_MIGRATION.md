# People Table Migration Guide

## Overview

This document explains the migration from embedded cast/crew data to a separate people-centric architecture.

## What Changed

### Before (Old Schema)
- Cast and crew data was embedded in each movie
- Person information duplicated across movies
- No way to query "all movies by Brad Pitt"
- Limited person metadata (just name, character, profile photo)

### After (New Schema)
- **People table**: Stores actors, directors, crew members once
- **Movie-Person relationships**: Junction tables link movies to people
- **Rich person data**: Biographies, birthdays, birthplaces, etc.
- **Bilingual support**: Lao names and biographies
- **Efficient queries**: Find all movies by a person, or all people in a movie

## New Database Structure

```
people
├── id (TMDB person ID)
├── profile_path
├── birthday
├── deathday
├── place_of_birth
├── known_for_department
├── popularity
├── gender
├── imdb_id
├── homepage
└── timestamps

people_translations
├── person_id
├── language (en/lo)
├── name
└── biography

movie_cast (junction)
├── movie_id
├── person_id
└── order (billing)

movie_cast_translations
├── movie_id
├── person_id
├── language
└── character (role name)

movie_crew (junction)
├── movie_id
├── person_id
└── department

movie_crew_translations
├── movie_id
├── person_id
├── department
├── language
└── job (Director, Producer, etc.)
```

## Migration Steps

### 1. Generate New Migration

```bash
cd db
npm run db:generate
```

This will create a new migration file in `drizzle/` based on schema changes.

### 2. Review Migration SQL

Check the generated SQL file to ensure it:
- Creates new `people` and `people_translations` tables
- Creates new `movie_cast` and `movie_crew` junction tables
- Drops old `cast`, `crew`, and their translation tables

### 3. Backup Database (Important!)

```bash
# If using Docker
docker exec lao-cinema-db pg_dump -U postgres lao_cinema > backup_before_people_migration.sql

# Or using pg_dump directly
pg_dump -U postgres lao_cinema > backup_before_people_migration.sql
```

### 4. Run Migration

```bash
cd db
npm run db:migrate
```

### 5. Verify Migration

```bash
# Connect to database
psql -U postgres lao_cinema

# Check new tables exist
\dt

# Should see:
# - people
# - people_translations
# - movie_cast
# - movie_cast_translations
# - movie_crew
# - movie_crew_translations

# Check old tables are gone
# Should NOT see:
# - cast
# - cast_translations
# - crew
# - crew_translations
```

## Data Migration Strategy

Since this is a breaking schema change, you have two options:

### Option A: Fresh Start (Recommended for Development)

1. Drop and recreate database
2. Re-import movies from TMDB with new schema
3. People will be automatically created during import

```bash
cd db
npm run db:push  # Recreate schema
# Then re-import your movies
```

### Option B: Migrate Existing Data

If you have important data to preserve, create a custom migration script:

```typescript
// db/src/migrate-people.ts
import { db } from './db';
import { people, peopleTranslations, movieCast, movieCastTranslations } from './schema';
import { tmdbClient } from '../../web/lib/tmdb/client';
import { mapTMDBToPerson } from '../../web/lib/tmdb/mapper';

async function migratePeople() {
  // 1. Get all unique person IDs from old cast/crew data
  // 2. Fetch person details from TMDB
  // 3. Insert into new people tables
  // 4. Create movie-person relationships
  
  console.log('Migration complete!');
}

migratePeople();
```

## Frontend Impact

### Updated Types

The `CastMember` and `CrewMember` types now include a `person` object:

```typescript
// Before
interface CastMember {
  id: number;
  name: LocalizedText;
  character: LocalizedText;
  profile_path?: string;
  order: number;
}

// After
interface CastMember {
  person: Person;  // Full person object
  character: LocalizedText;
  order: number;
}
```

### Code Updates Needed

Any code that accesses cast/crew data needs updating:

```typescript
// Before
const actorName = movie.cast[0].name.en;
const actorPhoto = movie.cast[0].profile_path;

// After
const actorName = movie.cast[0].person.name.en;
const actorPhoto = movie.cast[0].person.profile_path;
```

### Search for Affected Code

```bash
cd web
grep -r "cast\[" --include="*.tsx" --include="*.ts"
grep -r "crew\[" --include="*.tsx" --include="*.ts"
```

## TMDB Import Flow

### New Import Process

When importing a movie from TMDB:

1. **Fetch movie details** (as before)
2. **Fetch movie credits** (as before)
3. **For each cast/crew member:**
   - Check if person exists in database
   - If not, fetch person details from TMDB
   - Insert person + translations
4. **Create movie-person relationships**
   - Insert into `movie_cast` / `movie_crew`
   - Insert character/job translations

### Example Implementation

```typescript
// In your movie import function
async function importMovieFromTMDB(tmdbId: number) {
  // Fetch movie and credits
  const [movieData, creditsData] = await Promise.all([
    tmdbClient.getMovieDetails(tmdbId),
    tmdbClient.getMovieCredits(tmdbId),
  ]);
  
  // Process cast
  for (const castMember of creditsData.cast.slice(0, 20)) {
    // Check if person exists
    let person = await db.query.people.findFirst({
      where: eq(people.id, castMember.id)
    });
    
    // If not, fetch and create
    if (!person) {
      const personDetails = await tmdbClient.getPersonDetails(castMember.id);
      const mappedPerson = mapTMDBToPerson(personDetails);
      
      await db.insert(people).values(mappedPerson);
      await db.insert(peopleTranslations).values([
        { personId: mappedPerson.id, language: 'en', name: mappedPerson.name.en, biography: mappedPerson.biography?.en },
      ]);
    }
    
    // Create movie-cast relationship
    await db.insert(movieCast).values({
      movieId: movie.id,
      personId: castMember.id,
      order: castMember.order,
    });
    
    await db.insert(movieCastTranslations).values([
      { movieId: movie.id, personId: castMember.id, language: 'en', character: castMember.character },
    ]);
  }
  
  // Similar process for crew...
}
```

## Benefits

### 1. No Data Duplication
- Brad Pitt's bio stored once, not in every movie
- Update his Lao name in one place

### 2. Rich Person Profiles
- Full biographies
- Birthday, birthplace
- IMDB links
- Homepage URLs

### 3. Powerful Queries

```sql
-- Find all movies with Brad Pitt
SELECT m.* 
FROM movies m
JOIN movie_cast mc ON mc.movie_id = m.id
JOIN people p ON p.id = mc.person_id
JOIN people_translations pt ON pt.person_id = p.id
WHERE pt.name = 'Brad Pitt' AND pt.language = 'en';

-- Find all directors
SELECT DISTINCT p.*, pt.name
FROM people p
JOIN people_translations pt ON pt.person_id = p.id
JOIN movie_crew mc ON mc.person_id = p.id
JOIN movie_crew_translations mct ON mct.person_id = p.id
WHERE mct.job = 'Director' AND pt.language = 'en';
```

### 4. Future Features Enabled
- Person detail pages
- Search by actor/director
- Filter movies by cast/crew
- Person filmography
- Awards and nominations
- Social media links

## Rollback Plan

If migration fails:

```bash
# Restore from backup
psql -U postgres lao_cinema < backup_before_people_migration.sql

# Or revert schema changes
cd db
git checkout HEAD~1 src/schema.ts
npm run db:push
```

## Testing Checklist

After migration:

- [ ] Database schema matches expected structure
- [ ] All movies have cast/crew data
- [ ] Person details are complete
- [ ] Bilingual names work (en/lo)
- [ ] Movie detail pages display cast correctly
- [ ] No duplicate people in database
- [ ] TMDB import creates people correctly
- [ ] Character/job names are bilingual

## Next Steps

1. **Run migration** (see steps above)
2. **Update frontend code** to use `person` object
3. **Test TMDB import** with new schema
4. **Add person detail pages** (future)
5. **Implement search by cast/crew** (future)

## Questions?

- Check `CAST_CREW.md` for original implementation
- Check `DATABASE_SETUP.md` for database info
- Check `/db/src/schema.ts` for full schema
- Check `/web/lib/types.ts` for TypeScript types
