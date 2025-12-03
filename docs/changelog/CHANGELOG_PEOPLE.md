# Changelog: People Architecture Implementation

**Date**: November 16, 2024  
**Type**: Breaking Change - Database Schema Migration Required

## Summary

Migrated from embedded cast/crew data to a people-centric architecture with separate `people` table and movie-person relationships.

## What Changed

### Database Schema (`/db/src/schema.ts`)

**Added:**
- `people` table - Stores actors, directors, crew members
- `people_translations` table - Bilingual names and biographies
- `movie_cast` table - Movie-actor relationships
- `movie_cast_translations` table - Character names (bilingual)
- `movie_crew` table - Movie-crew relationships
- `movie_crew_translations` table - Job titles (bilingual)

**Removed:**
- `cast` table (replaced by `people` + `movie_cast`)
- `cast_translations` table
- `crew` table (replaced by `people` + `movie_crew`)
- `crew_translations` table

### TypeScript Types (`/web/lib/types.ts`)

**Added:**
- `Person` interface - Full person entity with biography, birthday, etc.

**Modified:**
- `CastMember` - Now contains `person: Person` instead of inline person data
- `CrewMember` - Now contains `person: Person` instead of inline person data

### TMDB Client (`/web/lib/tmdb/client.ts`)

**Added:**
- `TMDBPersonDetails` interface
- `getPersonDetails(personId)` method

### TMDB Mapper (`/web/lib/tmdb/mapper.ts`)

**Added:**
- `mapTMDBToPerson()` function - Maps TMDB person data to our schema

**Modified:**
- `mapTMDBToMovie()` - Now creates Person objects for cast/crew

### Documentation

**Created:**
- `PEOPLE_ARCHITECTURE.md` - Complete architecture overview
- `PEOPLE_MIGRATION.md` - Migration guide and procedures
- `CHANGELOG_PEOPLE.md` - This file

**Updated:**
- `CAST_CREW.md` - Reflects new architecture

## Breaking Changes

### Database

⚠️ **Migration Required**: Run `npm run db:generate` and `npm run db:migrate` in `/db`

### Frontend Code

Any code accessing cast/crew data must be updated:

```typescript
// ❌ Before (will break)
const actorName = movie.cast[0].name.en;
const actorPhoto = movie.cast[0].profile_path;

// ✅ After (correct)
const actorName = movie.cast[0].person.name.en;
const actorPhoto = movie.cast[0].person.profile_path;
```

**Search for affected code:**
```bash
cd web
grep -r "cast\[.*\]\.name" --include="*.tsx" --include="*.ts"
grep -r "crew\[.*\]\.name" --include="*.tsx" --include="*.ts"
```

## Benefits

### 1. No Data Duplication
- Person data stored once, not repeated across movies
- Update person info in one place

### 2. Rich Person Profiles
- Biographies (bilingual)
- Birthday, birthplace
- IMDB links, homepage
- Career information

### 3. Powerful Queries
- Find all movies by a person
- Find all directors
- Person filmography
- Filter movies by cast/crew

### 4. Future Features Enabled
- Person detail pages
- Search by actor/director
- Awards and nominations
- Social media links

## Migration Steps

### 1. Backup Database

```bash
pg_dump -U postgres lao_cinema > backup_before_people_migration.sql
```

### 2. Generate Migration

```bash
cd db
npm run db:generate
```

### 3. Review Migration SQL

Check the generated file in `drizzle/` to ensure it:
- Creates new people tables
- Creates junction tables
- Drops old cast/crew tables

### 4. Run Migration

```bash
cd db
npm run db:migrate
```

### 5. Update Frontend Code

Search for and update any code accessing `cast` or `crew` arrays.

### 6. Test

- [ ] Database schema is correct
- [ ] TMDB import works
- [ ] Movie pages display cast/crew
- [ ] Bilingual names work

## Rollback

If needed, restore from backup:

```bash
psql -U postgres lao_cinema < backup_before_people_migration.sql
```

## Next Steps

### Immediate
1. Run database migration
2. Update any frontend code accessing cast/crew
3. Test TMDB import with new schema

### Future
1. Implement person detail pages (`/people/[id]`)
2. Add search by actor/director
3. Create person filmography views
4. Add awards and nominations

## Files Modified

### Database
- `/db/src/schema.ts` - Complete schema rewrite for people

### Frontend Types
- `/web/lib/types.ts` - Added Person, updated CastMember/CrewMember

### TMDB Integration
- `/web/lib/tmdb/client.ts` - Added getPersonDetails
- `/web/lib/tmdb/mapper.ts` - Added mapTMDBToPerson

### Documentation
- `/PEOPLE_ARCHITECTURE.md` - New
- `/PEOPLE_MIGRATION.md` - New
- `/CHANGELOG_PEOPLE.md` - New
- `/CAST_CREW.md` - Updated

## Testing Checklist

After migration:

- [ ] `npm run db:migrate` completes successfully
- [ ] New tables exist: `people`, `people_translations`, `movie_cast`, `movie_crew`
- [ ] Old tables removed: `cast`, `cast_translations`, `crew`, `crew_translations`
- [ ] TMDB import creates person records
- [ ] Movie detail pages show cast/crew
- [ ] Bilingual names display correctly (en/lo)
- [ ] No TypeScript errors in frontend
- [ ] No duplicate people in database

## Support

For questions or issues:
- See `PEOPLE_ARCHITECTURE.md` for architecture details
- See `PEOPLE_MIGRATION.md` for migration help
- See `CAST_CREW.md` for implementation details
- Check `/db/src/schema.ts` for schema definition
- Check `/web/lib/types.ts` for type definitions

---

**Status**: ✅ Implementation Complete - Migration Required
