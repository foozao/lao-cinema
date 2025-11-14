# Lao Cinema Database

PostgreSQL database setup with Drizzle ORM for the Lao Cinema platform.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ installed

## Quick Start

### 1. Start PostgreSQL Database

```bash
# From the root directory
docker-compose up -d
```

This will start a PostgreSQL 16 container with:
- **Database**: `laocinema`
- **User**: `laocinema`
- **Password**: `laocinema_dev`
- **Port**: `5432`

### 2. Install Dependencies

```bash
cd db
npm install
```

### 3. Generate and Run Migrations

```bash
# Generate migration files from schema
npm run db:generate

# Run migrations to create tables
npm run db:migrate
```

### 4. Seed Database with Sample Data

```bash
npm run db:seed
```

This will create:
- 5 genres (Drama, Romance, Comedy, Action, Documentary)
- 1 sample movie with bilingual content
- Cast and crew members
- Video source

## Database Schema

### Tables

- **movies** - Movie information with bilingual titles and descriptions
- **genres** - Genre definitions with bilingual names
- **movie_genres** - Many-to-many relationship between movies and genres
- **cast** - Cast members for each movie
- **crew** - Crew members for each movie
- **video_sources** - Video files/streams for each movie

### Bilingual Support

Translations are stored in separate tables for better scalability and query performance:

**Main Tables** (language-agnostic data):
- `movies` - Movie metadata (release date, runtime, ratings, etc.)
- `genres` - Genre IDs
- `cast` - Cast member metadata (profile path, order)
- `crew` - Crew member metadata (department, profile path)

**Translation Tables** (language-specific text):
- `movie_translations` - Movie titles and overviews
- `genre_translations` - Genre names
- `cast_translations` - Cast member names and character names
- `crew_translations` - Crew member names and job titles

Each translation table has:
- Foreign key to the main table
- `language` enum ('en' or 'lo')
- Translatable text fields
- Composite primary key (id + language)

**Benefits**:
- Easy to add new languages without schema changes
- Efficient queries with proper indexing
- Can query "all movies with Lao translations"
- Industry-standard approach used by major platforms

## Available Scripts

```bash
# Generate migration files from schema changes
npm run db:generate

# Run pending migrations
npm run db:migrate

# Push schema changes directly (dev only)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio

# Seed database with sample data
npm run db:seed
```

## Drizzle Studio

View and edit your database with a web UI:

```bash
npm run db:studio
```

Then open https://local.drizzle.studio in your browser.

## Connection String

Default connection string:
```
postgres://laocinema:laocinema_dev@localhost:5432/laocinema
```

You can override with the `DATABASE_URL` environment variable:

```bash
export DATABASE_URL="postgres://user:password@host:port/database"
```

## Schema Changes

When you modify `src/schema.ts`:

1. Generate new migration:
   ```bash
   npm run db:generate
   ```

2. Review the generated SQL in `drizzle/` folder

3. Run the migration:
   ```bash
   npm run db:migrate
   ```

## Querying the Database

The database uses separate translation tables. See `src/queries.ts` for helper functions.

### Example: Get Movie with Translations

```typescript
import { getMovieWithTranslations } from './queries.js';

// Get movie in Lao (falls back to English if not available)
const movie = await getMovieWithTranslations(movieId, 'lo');

// Get movie in English
const movieEn = await getMovieWithTranslations(movieId, 'en');
```

### Example: Get Complete Movie Data

```typescript
import { getMovieComplete } from './queries.js';

// Get movie with genres, cast, crew, and videos in Lao
const fullMovie = await getMovieComplete(movieId, 'lo');
console.log(fullMovie.title); // Lao title
console.log(fullMovie.genres); // Genres with Lao names
console.log(fullMovie.cast); // Cast with Lao names
```

### Example: Create New Movie

```typescript
import { createMovie } from './queries.js';

const movie = await createMovie({
  originalTitle: 'New Lao Film',
  releaseDate: '2024-01-01',
  runtime: 120,
  translations: {
    en: {
      title: 'New Lao Film',
      overview: 'A story about...',
    },
    lo: {
      title: 'ຮູບເງົາລາວໃໝ່',
      overview: 'ເລື່ອງກ່ຽວກັບ...',
    },
  },
});
```

### Example: Raw Query with JOIN

```typescript
import { db } from './db.js';
import { movies, movieTranslations } from './schema.js';
import { eq } from 'drizzle-orm';

const result = await db
  .select({
    id: movies.id,
    title: movieTranslations.title,
    overview: movieTranslations.overview,
  })
  .from(movies)
  .leftJoin(movieTranslations, eq(movies.id, movieTranslations.movieId))
  .where(eq(movieTranslations.language, 'lo'));
```

## Troubleshooting

### Database Connection Failed

Check if PostgreSQL is running:
```bash
docker-compose ps
```

Restart if needed:
```bash
docker-compose restart postgres
```

### Reset Database

To start fresh:

```bash
# Stop and remove containers
docker-compose down -v

# Start again
docker-compose up -d

# Re-run migrations and seed
cd db
npm run db:migrate
npm run db:seed
```

### View Logs

```bash
docker-compose logs -f postgres
```

## Production Considerations

For production deployment:

1. Change default credentials in `docker-compose.yml`
2. Use strong passwords
3. Set up SSL/TLS connections
4. Configure backups
5. Use environment variables for sensitive data
6. Consider using managed PostgreSQL (AWS RDS, GCP Cloud SQL, etc.)

## Next Steps

- [ ] Connect web app to database
- [ ] Create API endpoints for CRUD operations
- [ ] Add user authentication tables
- [ ] Add watch history and watchlist tables
- [ ] Set up database backups
- [ ] Add full-text search with pg_trgm
- [ ] Consider pgvector for recommendations
