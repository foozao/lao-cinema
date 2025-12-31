# People Architecture

## Overview

The Lao Cinema platform uses a **people-centric architecture** for managing actors, directors, and crew members. This design separates person data from movie-specific roles, enabling rich person profiles and efficient queries.

## Core Concepts

### 1. People as First-Class Entities

People (actors, directors, crew) are stored independently of movies:
- Each person has a unique TMDB ID
- Person data (name, bio, photo) stored once
- Bilingual support (English/Lao) for names and biographies

### 2. Movie-Person Relationships

Movies and people are linked through junction tables:
- **Cast**: Actors in movies (with character names)
- **Crew**: Directors, writers, producers (with job titles)
- Role-specific data (character, job) stored per movie

### 3. Bilingual Everything

All text fields support English and Lao:
- Person names
- Biographies
- Character names
- Job titles

## Database Schema

### Core Tables

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
├── person_id → people.id
├── language (en/lo)
├── name
└── biography
```

### Relationship Tables

```
movie_cast
├── movie_id → movies.id
├── person_id → people.id
└── order (billing)

movie_cast_translations
├── movie_id
├── person_id
├── language (en/lo)
└── character (role name)

movie_crew
├── movie_id → movies.id
├── person_id → people.id
└── department

movie_crew_translations
├── movie_id
├── person_id
├── department
├── language (en/lo)
└── job (Director, Producer, etc.)
```

## TypeScript Types

### Person Entity

```typescript
interface Person {
  id: number; // TMDB person ID
  name: LocalizedText;
  biography?: LocalizedText;
  profile_path?: string;
  birthday?: string;
  deathday?: string;
  place_of_birth?: string;
  known_for_department?: string;
  popularity?: number;
  gender?: number; // 0=unknown, 1=female, 2=male, 3=non-binary
  imdb_id?: string;
  homepage?: string;
}
```

### Movie Relationships

```typescript
interface CastMember {
  person: Person;
  character: LocalizedText;
  order: number;
}

interface CrewMember {
  person: Person;
  job: LocalizedText;
  department: string;
}

interface Movie {
  // ... other fields
  cast: CastMember[];
  crew: CrewMember[];
}
```

## TMDB Integration

### Import Flow

When importing a movie from TMDB:

1. **Fetch movie details** (`/movie/{id}`)
2. **Fetch movie credits** (`/movie/{id}/credits`)
3. **For each cast/crew member:**
   - Check if person exists in database
   - If not, fetch person details (`/person/{id}`)
   - Create person record with translations
4. **Create movie-person relationships**
   - Insert cast/crew links
   - Store character/job names

### TMDB Client Methods

```typescript
// Fetch person details
tmdbClient.getPersonDetails(personId: number): Promise<TMDBPersonDetails>

// Fetch movie credits
tmdbClient.getMovieCredits(tmdbId: number): Promise<TMDBCredits>
```

### Mapper Functions

```typescript
// Map TMDB person to our schema
mapTMDBToPerson(
  tmdbData: TMDBPersonDetails,
  existingPerson?: Partial<Person>
): Person

// Map TMDB movie (includes cast/crew)
mapTMDBToMovie(
  tmdbData: TMDBMovieDetails,
  credits?: TMDBCredits,
  existingMovie?: Partial<Movie>
): Movie
```

## Query Patterns

### Get Movie with Cast

```typescript
const movie = await db.query.movies.findFirst({
  where: eq(movies.id, movieId),
  with: {
    cast: {
      with: {
        person: {
          with: {
            translations: true
          }
        },
        characterTranslations: true
      }
    }
  }
});
```

### Get Person's Filmography

```typescript
const filmography = await db.query.people.findFirst({
  where: eq(people.id, personId),
  with: {
    movieCast: {
      with: {
        movie: {
          with: {
            translations: true
          }
        }
      }
    },
    movieCrew: {
      with: {
        movie: {
          with: {
            translations: true
          }
        }
      }
    }
  }
});
```

### Search Movies by Actor

```sql
SELECT m.*, mt.title
FROM movies m
JOIN movie_translations mt ON mt.movie_id = m.id
JOIN movie_cast mc ON mc.movie_id = m.id
JOIN people p ON p.id = mc.person_id
JOIN people_translations pt ON pt.person_id = p.id
WHERE pt.name ILIKE '%Orson Welles%'
  AND mt.language = 'en'
  AND pt.language = 'en';
```

## Frontend Usage

### Accessing Person Data

```typescript
// In a component
const movie: Movie = getMovie();

// Access cast member
const leadActor = movie.cast[0];
const actorName = getLocalizedText(leadActor.person.name, locale);
const characterName = getLocalizedText(leadActor.character, locale);
const actorPhoto = leadActor.person.profile_path;
const actorBio = getLocalizedText(leadActor.person.biography, locale);

// Access crew member
const director = movie.crew.find(c => 
  getLocalizedText(c.job, 'en') === 'Director'
);
const directorName = getLocalizedText(director.person.name, locale);
```

### Person Card Component

```typescript
interface PersonCardProps {
  person: Person;
  role?: LocalizedText; // Character or job
  locale: 'en' | 'lo';
}

function PersonCard({ person, role, locale }: PersonCardProps) {
  const name = getLocalizedText(person.name, locale);
  const roleText = role ? getLocalizedText(role, locale) : null;
  
  return (
    <div>
      <img src={person.profile_path} alt={name} />
      <h3>{name}</h3>
      {roleText && <p>{roleText}</p>}
      <Link href={`/people/${person.id}`}>View Profile</Link>
    </div>
  );
}
```

## Benefits

### 1. No Data Duplication
- Orson Welles' biography stored once, not in every movie
- Update person info in one place, reflects everywhere

### 2. Rich Person Profiles
- Full biographies (bilingual)
- Birthday, birthplace
- Career information
- IMDB and homepage links

### 3. Efficient Queries
- Find all movies by a person
- Find all directors
- Filter movies by cast/crew
- Person filmography

### 4. Scalability
- Works for catalogs of any size
- Normalized data structure
- Indexed foreign keys

### 5. Future-Proof
- Easy to add person detail pages
- Support for awards, nominations
- Social media integration
- Person photos gallery

## Future Features

### Person Detail Pages

```
/people/[id]
├── Biography (en/lo)
├── Filmography
│   ├── As Actor
│   └── As Director/Crew
├── Personal Info
│   ├── Birthday
│   ├── Place of Birth
│   └── Known For
├── Photos
└── External Links
```

### Search & Filter

- Search movies by actor name
- Filter by director
- Browse by department (Acting, Directing, etc.)
- Popular people pages

### Advanced Queries

- "Movies with both Orson Welles and Joseph Cotten"
- "All movies directed by David Fincher"
- "Top 10 most popular actors in catalog"

## Migration

The migration to this architecture was completed in November 2024. See the archived documentation for historical details.

## Related Documentation

- `CAST_CREW.md` - Implementation details
- `LANGUAGE_SYSTEM.md` - Bilingual system
- `../setup/BACKEND_SETUP.md` - Backend and database configuration
- `/db/src/schema.ts` - Full schema definition
- `/web/lib/types.ts` - TypeScript types
- `/web/lib/tmdb/` - TMDB integration

## Key Takeaways

1. **People are entities**, not just attributes of movies
2. **Relationships are separate** from person data
3. **Everything is bilingual** (English/Lao)
4. **TMDB IDs are primary keys** for people
5. **Role data is movie-specific** (character, job)
6. **Queries are powerful** (find movies by person, etc.)
7. **Frontend uses nested objects** (`cast[0].person.name`)

---

**Remember**: When working with cast/crew, always access person data through the `person` object, not directly on the cast/crew member.
